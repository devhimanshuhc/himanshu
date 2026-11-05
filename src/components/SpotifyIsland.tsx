import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import type { LucideIcon } from "lucide-react"; // Import LucideIcon type
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";

// --- Interfaces ---
interface Track {
  id: string; // Spotify track ID
  name: string;
  artist: string;
  albumArtUrl: string | null;
  externalUrl: string; // URL to the track on Spotify
  playedAt: string; // ISO 8601 timestamp
}

interface IconProps extends React.ComponentPropsWithoutRef<"div"> {
  icon: LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

// --- Helper Components & Icons ---

// A generic icon wrapper using lucide-react props
const Icon = ({ icon: IconComponent, ...props }: IconProps) => (
  <div className="text-secondary-foreground w-4 h-4 flex-shrink-0" {...props}>
    <IconComponent size={16} strokeWidth={1.5} />
  </div>
);

const SPOTIFY_TRACK_DISPLAY_LIMIT = 15;

// --- Main Component ---

const SpotifyActivity = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // --- Using Mock Data for UI Preview ---
    // const loadMockData = () => {
    //   const mockTracks: Track[] = [
    //     {
    //       id: "1",
    //       name: "Mirage",
    //       artist: "Else",
    //       albumArtUrl: "https://placehold.co/40x40/0a0a0a/eeeeee?text=E",
    //       externalUrl: "https://open.spotify.com/track/mock1",
    //       playedAt: new Date().toISOString(),
    //     },
    //     {
    //       id: "2",
    //       name: "Genesis",
    //       artist: "Justice",
    //       albumArtUrl: "https://placehold.co/40x40/0a0a0a/eeeeee?text=J",
    //       externalUrl: "https://open.spotify.com/track/mock2",
    //       playedAt: new Date().toISOString(),
    //     },
    //     {
    //       id: "3",
    //       name: "Instant Crush",
    //       artist: "Daft Punk, Julian Casablancas",
    //       albumArtUrl: "https://placehold.co/40x40/0a0a0a/eeeeee?text=D",
    //       externalUrl: "https://open.spotify.com/track/mock3",
    //       playedAt: new Date().toISOString(),
    //     },
    //     {
    //       id: "4",
    //       name: "Nightcall",
    //       artist: "Kavinsky",
    //       albumArtUrl: "https://placehold.co/40x40/0a0a0a/eeeeee?text=K",
    //       externalUrl: "https://open.spotify.com/track/mock4",
    //       playedAt: new Date().toISOString(),
    //     },
    //     {
    //       id: "5",
    //       name: "A Real Hero",
    //       artist: "College, Electric Youth",
    //       albumArtUrl: "https://placehold.co/40x40/0a0a0a/eeeeee?text=C",
    //       externalUrl: "https://open.spotify.com/track/mock5",
    //       playedAt: new Date().toISOString(),
    //     },
    //   ];

    //   // Simulate network delay
    //   setTimeout(() => {
    //     setTracks(mockTracks);
    //     setLoading(false);
    //   }, 1000);
    // };

    // loadMockData();

    // --- REAL API FETCHING LOGIC (Uncomment this block to use the API) ---
    const fetchRecentlyPlayed = async () => {
      // NOTE: You need to get an access token from the Spotify OAuth flow
      // and pass it here. For demonstration, a placeholder is used.
      // In a real app, you'd fetch this from your auth state/context/cookie.
      const spotifyAccessToken = "YOUR_SPOTIFY_ACCESS_TOKEN"; // Replace with actual token

      if (!spotifyAccessToken) {
        setError("Spotify access token is not available. Please log in.");
        setLoading(false);
        return;
      }

      const API_ENDPOINT = "/api/spotify-stats";

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(API_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${spotifyAccessToken}`,
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch Spotify data.");
        }

        const fetchedTracks: Track[] = result.data.map((item: any) => ({
          id: item.id || item.playedAt, // Use track ID or playedAt as a fallback unique key
          name: item.name,
          artist: item.artist,
          albumArtUrl: item.image,
          externalUrl: `https://open.spotify.com/track/${item.id}`, // Spotify track URL
          playedAt: item.playedAt,
        }));
        setTracks(
          fetchedTracks.slice(0, SPOTIFY_TRACK_DISPLAY_LIMIT),
        );
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    // Uncomment the line below to enable real API fetching
    fetchRecentlyPlayed();
  }, []);

  return (
    <div className="flex flex-col bg-background bg-texture min-h-0 pb-3">
      {loading &&
        Array.from({ length: SPOTIFY_TRACK_DISPLAY_LIMIT }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 mb-3 h-[51.24px] md:h-[62.72px] last:mb-0 px-4"
          >
            <Skeleton className="size-8 rounded-sm" />
            <div className="flex flex-col gap-1.5 w-full">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      {error && (
        <div className="flex items-start gap-2 px-4 py-6 text-xs text-muted-foreground" title={error}>
          <Icon icon={AlertCircle} className="mt-0" />
          <span>spotify isn’t answering right now — check back in a bit.</span>
        </div>
      )}
      {!loading &&
        !error &&
        tracks.length > 0 &&
        tracks.map((track) => (
          <a
            key={track.id}
            href={track.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "p-0 h-full flex items-center justify-start gap-3 group border-b rounded-none",
            )}
          >
            <img
              src={track.albumArtUrl || "https://placehold.co/40x40"}
              alt={track.name}
              width={32}
              height={32}
              className="w-[14%] h-auto flex-shrink-0 bg-surface-8"
            />
            <div className="flex flex-col h-full overflow-hidden">
              <p className="text-surface-foreground text-xs font-semibold truncate group-hover:text-secondary-foreground transition-colors">
                {track.name}
              </p>
              <p className="text-muted-foreground text-xs truncate">
                {track.artist}
              </p>
            </div>
          </a>
        ))}
      {!loading && !error && tracks.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Nothing playing right now.
        </p>
      )}
    </div>
  );
};

export default SpotifyActivity;
