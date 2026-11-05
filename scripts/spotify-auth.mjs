// One-off: mint a fresh Spotify refresh token for /api/spotify-stats and save it to .env.
//
//   1. In the Spotify developer dashboard, add this redirect URI to your app:
//        http://127.0.0.1:8888/callback
//   2. Run:  node scripts/spotify-auth.mjs
//   3. Open the printed URL, approve, and the new token is written to .env.
//   4. Copy the same value into SPOTIFY_REFRESH_TOKEN on Vercel and redeploy.
import { createServer } from "node:http"
import { readFileSync, writeFileSync } from "node:fs"
import { randomBytes } from "node:crypto"

const ENV_PATH = new URL("../.env", import.meta.url)
const REDIRECT_URI = "http://127.0.0.1:8888/callback"
const SCOPE = "user-read-recently-played"

const env = readFileSync(ENV_PATH, "utf8")
const read = (key) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "")
const clientId = read("SPOTIFY_CLIENT_ID")
const clientSecret = read("SPOTIFY_CLIENT_SECRET")
if (!clientId || !clientSecret) {
  console.error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env")
  process.exit(1)
}

const state = randomBytes(12).toString("hex")
const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({ response_type: "code", client_id: clientId, scope: SCOPE, redirect_uri: REDIRECT_URI, state })

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI)
  if (url.pathname !== "/callback") return res.writeHead(404).end()

  const done = (status, message) => {
    res.writeHead(status, { "content-type": "text/plain" }).end(message)
    server.close()
  }
  if (url.searchParams.get("state") !== state) return done(400, "State mismatch — run the script again.")
  const code = url.searchParams.get("code")
  if (!code) return done(400, `Spotify said: ${url.searchParams.get("error") ?? "no code returned"}`)

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }),
  })
  const data = await tokenRes.json()
  if (!tokenRes.ok || !data.refresh_token) {
    console.error("Token exchange failed:", data.error, data.error_description ?? "")
    return done(500, "Token exchange failed — see the terminal.")
  }

  const line = `SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`
  const next = /^SPOTIFY_REFRESH_TOKEN=.*$/m.test(env)
    ? env.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, line)
    : `${env.trimEnd()}\n${line}\n`
  writeFileSync(ENV_PATH, next)
  console.log("Saved a new SPOTIFY_REFRESH_TOKEN to .env. Restart the dev server, and update it on Vercel too.")
  done(200, "Done — you can close this tab.")
})

server.listen(8888, "127.0.0.1", () => {
  console.log("Open this URL and approve access:\n\n" + authUrl + "\n")
})
