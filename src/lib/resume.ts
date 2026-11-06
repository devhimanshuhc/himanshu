/**
 * The resume, as data. /resume renders it and `pnpm resume:pdf` prints that
 * page to public/resume.pdf, so the page and the download never drift apart.
 * Inline `**bold**` and `[text](url)` are supported in summary and bullets.
 */
export interface ResumeRole {
  title: string
  dates: string
  bullets: string[]
}

export interface ResumeJob {
  company: string
  location: string
  dates: string
  note?: string
  roles: ResumeRole[]
}

export const RESUME = {
  name: "Himanshu Chauhan",
  headline: "AI Engineer | LLMs, RAG & Agents",
  updated: "Nov 2026",
  contact: [
    { label: "himanshu.chauhan07@icloud.com", href: "mailto:himanshu.chauhan07@icloud.com" },
    { label: "ansh.life", href: "https://www.ansh.life" },
    { label: "github.com/himanshu-dev-codes", href: "https://github.com/himanshu-dev-codes" },
    { label: "linkedin.com/in/devhimanshuhc", href: "https://linkedin.com/in/devhimanshuhc" },
  ],
  summary:
    "AI engineer with 1.5+ years shipping production LLM features: retrieval-augmented generation over clinical records, tool-calling agents for equity workflows, and an agentic mobile browser. Python, FastAPI, LangChain and the Vercel AI SDK. Builds with **Claude Code**. Based in Dehradun, India.",
  experience: [
    {
      company: "Heizen",
      location: "San Francisco, CA (Remote)",
      dates: "Aug 2025 – Oct 2026",
      note: "Backed by **Titan Capital ($500K)**; featured on **Shark Tank India** and **Forbes Remote**",
      roles: [
        {
          title: "Software Development Engineer",
          dates: "Jun 2026 – Oct 2026",
          bullets: [
            "**[Evra](https://evrahealth.com/) (AI healthcare, 3k+ users):** Cut clinical data entry **40%** by shipping LLM summarization and **RAG** over patient records. MongoDB vector search and LangChain on **FastAPI**, with Fernet-encrypted clinical fields, role-based clinician auth and a React Native (Expo) app.",
            "**Heizen Studio (open-source AI dev tools, 5K+ users):** Owned system architecture, API contracts and delivery end to end.",
            "**[Medurun](https://medurun.com/) (ambulance dispatch, pre-launch):** Architected real-time dispatch (**NestJS**, Redis geospatial search, **Socket.IO**, atomic **Lua**, BullMQ) and shipped the React Native rider and driver apps plus Next.js dashboards.",
          ],
        },
        {
          title: "Associate Software Development Engineer",
          dates: "Feb 2026 – May 2026",
          bullets: [
            "**DeepMechanix:** Cut ASME pressure-vessel design cycles from **weeks to hours** by automating **PV Elite** against ASME code, including the APIs, job orchestration and validation pipeline.",
          ],
        },
        {
          title: "Software Development Engineer Intern",
          dates: "Aug 2025 – Jan 2026",
          bullets: [
            "**EquityNav:** Built AI insight agents for vesting, exercises and liquidity on the **Vercel AI SDK** (OpenAI and Gemini), with tool calling, SQL execution, structured outputs and guardrails.",
            "**EquityNav:** Unified Carta portfolios and an equity-tax engine into projection, scenario and risk dashboards. Automated sync and alerts with NestJS Scheduler, Docker and GitHub Actions.",
          ],
        },
      ],
    },
    {
      company: "United Protocol",
      location: "Auckland, NZ (Remote)",
      dates: "May 2023 – Jul 2025",
      roles: [
        {
          title: "Full Stack Developer",
          dates: "May 2023 – May 2024, Dec 2024 – Jul 2025",
          bullets: [
            "Built an AI-agentic mobile browser in React Native (**Meta LLaMA, LangChain, Groq**) that runs multi-step web tasks, and shipped **Hume AI** + Twilio speech-to-speech voice agents.",
            "Shipped tamper-proof encrypted history on IPFS + BNB Smart Chain (Solidity), plus web and desktop apps in React, Next.js, Electron and Tauri.",
          ],
        },
      ],
    },
    {
      company: "WhatBytes",
      location: "Bangalore, India (Remote)",
      dates: "Jun 2024 – Oct 2024",
      roles: [
        {
          title: "Frontend Developer",
          dates: "Jun 2024 – Oct 2024",
          bullets: [
            "Improved rendering on a Svelte + Next.js app serving **70,000–100,000+ weekly users**, and built analytics dashboards (Google Analytics, Facebook Insights).",
          ],
        },
      ],
    },
  ] satisfies ResumeJob[],
  projects: [
    "**[Retro](https://www.ansh.life/projects/retro/)** ([retro.ansh.life](https://retro.ansh.life), [source](https://github.com/devhimanshuhc/retro)): Actor-based multi-agent research system. Agents run as isolated BullMQ workers and write cited reports. A crashed step resumes effectively once, without a duplicate report; failed jobs go to a dead-letter queue and replay.",
    "**[Quotient](https://www.ansh.life/projects/quotient/)** ([quotient-dun.vercel.app](https://quotient-dun.vercel.app)): Writing workspace with fast capture and notebooks (Next.js, Prisma, Neon).",
    "**[DataSays](https://www.ansh.life/projects/datasays/)**: Plain-English questions return SQL and a chart. LLM analysis layer for querying and visualizing datasets.",
  ],
  skills: [
    { label: "AI", items: "LLMs, RAG, vector search, LangChain, tool calling, structured outputs, guardrails, OpenAI, Gemini, Vercel AI SDK, Groq, Claude Code, LLM evals (LLM-as-judge)" },
    { label: "Languages", items: "TypeScript, JavaScript, Python, SQL, Lua, Solidity" },
    { label: "Backend", items: "FastAPI, NestJS, Node.js, MongoDB, PostgreSQL, Prisma, Redis, BullMQ, Docker, AWS (S3, ECS, ECR, ElastiCache, ALB), GitHub Actions, WebSockets, Playwright, pytest" },
    { label: "Mobile & Frontend", items: "React Native (Expo), React, Next.js, TailwindCSS, TanStack Query" },
  ],
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Render the tiny inline markup (`**bold**`, `[text](url)`) to HTML. */
export function inline(s: string) {
  return escape(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
}
