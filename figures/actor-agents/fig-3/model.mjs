// The retry policy the figure draws, from the Retro repo (queues.py, base.py, dlq.py, config.py).
export const MODEL = {
  attempts: 3, // default job option `attempts: 3`
  backoffBaseMs: 2000, // exponential backoff, delay 2000: waits 2 s, then 4 s
  rateLimitPauseMs: 30000, // RATE_LIMIT_PAUSE_MS: a 429 pauses the agent's whole queue
  dlq: "agent.dlq", // dead letters: error, stack and the model's last output, keys redacted
  replays: 1, // a dead letter can be replayed once
};

// wait before attempt n + 1, after attempt n fails (n = 1, 2)
export const backoffMs = (n) => MODEL.backoffBaseMs * 2 ** (n - 1);
