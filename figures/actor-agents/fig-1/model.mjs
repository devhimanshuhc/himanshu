// The truth the figure moves by (retro-facts.md, sections 2 and 3).
// Five actors, each a BullMQ worker on its own queue (app/services/queues.py:6-13).
// A message is AgentMessage{workflow_run_id, revision}, revision ≥ 0, default 0 (app/models/messages.py:4-10).
// The router enqueues agent.supervisor at revision 0 (router.py:62-73); planner → research → write → critic;
// a critic fail enqueues agent.write with revision + 1, up to MAX_REVISIONS = 3 drafts (critic.py:96-143, config.py:38).
// Each step saves outputs + done + next hop in one write, then sends (base.py:144-150).

export const STATIONS = [
  { name: "router", queue: "agent.router", role: "Router" },
  { name: "supervisor", queue: "agent.supervisor", role: "Planner" },
  { name: "research", queue: "agent.research", role: "Researcher" },
  { name: "write", queue: "agent.write", role: "Writer" },
  { name: "critic", queue: "agent.critic", role: "Critic" },
];

// One run of the tour: the critic sends the first draft back once, then passes the second.
// from -1 is the API, which opens the run document and posts the first message to agent.router.
export const HOPS = [
  { from: -1, to: 0, arrivedFrom: null, rev: 0 },
  { from: 0, to: 1, arrivedFrom: -1, rev: 0 },
  { from: 1, to: 2, arrivedFrom: 0, rev: 0 },
  { from: 2, to: 3, arrivedFrom: 1, rev: 0 },
  { from: 3, to: 4, arrivedFrom: 2, rev: 0 },
  { from: 4, to: 3, arrivedFrom: 3, rev: 1, sendBack: true },
  { from: 3, to: 4, arrivedFrom: 4, rev: 1 },
];

export const TIMING = { speed: 125, settle: 0.55, work: 1.25, save: 1.15, hold: 2.6, fade: 0.7, gap: 0.9, intro: 0.8, start: 1.4 };
