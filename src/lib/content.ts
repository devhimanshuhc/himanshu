/** Site copy. Profile, experience, projects and skills mirror the AI engineer resume. */
export const CONTENT = {
  profile: {
    name: "Himanshu Chauhan",
    role: "ai engineer · full stack",
    headline: "llms, rag & agents — shipped to production",
    email: "himanshu.chauhan07@icloud.com",
    location: "dehradun, india",
  },
  hire: {
    pitch: [
      {
        title: "ai that ships",
        description:
          "llm features with rag, tool calling, structured outputs, evals and guardrails—built to run in production, not just in a demo.",
      },
      {
        title: "end to end",
        description:
          "fastapi and nestjs backends, react native and next.js frontends, queues, websockets and aws—i own a feature from schema to screen.",
      },
      {
        title: "performance first",
        description:
          "fast apps that stay fast—optimized for real users, real devices, and the messy production edge cases that show up after launch.",
      },
    ],
    basePrices: {
      static: 15000,
      dynamic: 40000,
      ecommerce: 65000,
    },
    pagePrice: 3000,
    featurePrices: {
      auth: 10000,
      payments: 15000,
      cms: 12000,
      seo: 5000,
      responsive: 8000,
    },
  },
  skillsSection: {
    title: "technical arsenal",
    categories: [
      {
        name: "AI",
        description: "Retrieval, agents and the guardrails that keep them honest",
        items: [
          "LLMs",
          "RAG",
          "Vector search",
          "LangChain",
          "Tool calling",
          "Structured outputs",
          "Guardrails",
          "OpenAI",
          "Gemini",
          "Vercel AI SDK",
          "Groq",
          "Claude Code",
          "LLM evals (LLM-as-judge)",
        ],
      },
      {
        name: "Backend",
        description: "Services, queues and infrastructure that hold up under load",
        items: [
          "FastAPI",
          "NestJS",
          "Node.js",
          "MongoDB",
          "PostgreSQL",
          "Prisma",
          "Redis",
          "BullMQ",
          "Docker",
          "AWS (S3, ECS, ECR, ElastiCache, ALB)",
          "GitHub Actions",
          "WebSockets",
          "Playwright",
          "pytest",
        ],
      },
      {
        name: "Mobile & Frontend",
        description: "Interfaces on the web and in your pocket",
        items: ["React Native (Expo)", "React", "Next.js", "TailwindCSS", "TanStack Query"],
      },
      {
        name: "Languages",
        description: "Day to day",
        items: ["TypeScript", "JavaScript", "Python", "SQL", "Lua", "Solidity"],
      },
    ],
  },
  experience: [
    {
      company: "Heizen",
      link: "https://heizen.work",
      location: "san francisco · remote",
      period: "aug 2025 – oct 2026",
      note: "backed by titan capital ($500k); featured on shark tank india & forbes",
      roles: [
        {
          title: "software development engineer",
          period: "jun 2026 – oct 2026",
          points: [
            "evra (ai healthcare, 3k+ users): cut clinical data entry 40% by shipping llm summarization and rag over patient records—mongodb vector search and langchain on fastapi, fernet-encrypted clinical fields, role-based clinician auth, and a react native (expo) app.",
            "heizen studio (open-source ai dev tools, 5k+ users): owned system architecture, api contracts, and delivery end to end.",
            "medurun (ambulance dispatch, pre-launch): architected real-time dispatch (nestjs, redis geospatial search, socket.io, atomic lua, bullmq) and shipped the react native rider and driver apps plus next.js dashboards.",
          ],
        },
        {
          title: "associate software development engineer",
          period: "feb 2026 – may 2026",
          points: [
            "deepmechanix: cut asme pressure-vessel design cycles from weeks to hours by automating pv elite against asme code, including the apis, job orchestration, and validation pipeline.",
          ],
        },
        {
          title: "software development engineer intern",
          period: "aug 2025 – jan 2026",
          points: [
            "equitynav: built ai insight agents for vesting, exercises, and liquidity on the vercel ai sdk (openai and gemini), with tool calling, sql execution, structured outputs, and guardrails.",
            "equitynav: unified carta portfolios and an equity-tax engine into projection, scenario, and risk dashboards; automated sync and alerts with nestjs scheduler, docker, and github actions.",
          ],
        },
      ],
    },
    {
      company: "United Protocol",
      link: null,
      location: "auckland, nz · remote",
      period: "may 2023 – jul 2025",
      note: null,
      roles: [
        {
          title: "full stack developer",
          period: "may 2023 – may 2024, dec 2024 – jul 2025",
          points: [
            "built an ai-agentic mobile browser in react native (meta llama, langchain, groq) that runs multistep web tasks, and shipped hume ai + twilio speech-to-speech voice agents.",
            "shipped tamper-proof encrypted history on ipfs + bnb smart chain (solidity), plus web and desktop apps in react, next.js, electron, and tauri.",
          ],
        },
      ],
    },
    {
      company: "WhatBytes",
      link: null,
      location: "bangalore, karnataka · remote",
      period: "jun 2024 – oct 2024",
      note: null,
      roles: [
        {
          title: "frontend developer",
          period: "jun 2024 – oct 2024",
          points: [
            "improved rendering on a svelte + next.js app serving 70,000–100,000+ weekly users, and built analytics dashboards (google analytics, facebook insights).",
          ],
        },
      ],
    },
  ],
  stats: [
    { value: 3, suffix: "k+", label: "users on evra, ai healthcare" },
    { value: 40, suffix: "%", label: "less clinical data entry with rag" },
    { value: 100, suffix: "k+", label: "weekly users on apps i've tuned" },
  ],
  socials: [
    { label: "github", href: "https://github.com/himanshu-dev-codes" },
    { label: "linkedin", href: "https://linkedin.com/in/devhimanshuhc" },
    { label: "email", href: "mailto:himanshu.chauhan07@icloud.com" },
    { label: "resumé", href: "https://drive.google.com/file/d/1j7_bh8uG6rYlVssZpsvVDMz9-WrMLx18/view?usp=drive_link" },
  ],
  projects: [
    {
      key: "retro",
      label: "Retro",
      description:
        "An actor-based multi-agent research system. Agents run as isolated BullMQ workers and write cited reports; crashed steps resume exactly once and failed jobs replay.",
      image: "/projects/retro.jpg",
      category: "Multi-agent AI",
      tech: ["TypeScript", "BullMQ", "Redis", "LLM agents"],
      link: "https://retro.ansh.life",
      github: "https://github.com/devhimanshuhc/retro",
      featured: true,
    },
    {
      key: "evra",
      label: "Evra",
      description:
        "AI healthcare for 3k+ users. LLM summarization and RAG over patient records cut clinical data entry 40% — MongoDB vector search and LangChain on FastAPI, encrypted clinical fields, clinician auth and a React Native app.",
      image: "/projects/evra.jpg",
      category: "AI healthcare · Heizen",
      tech: ["FastAPI", "LangChain", "MongoDB vector search", "React Native"],
      link: "https://evrahealth.com/",
      github: "#",
      featured: true,
    },
    {
      key: "medurun",
      label: "Medurun",
      description:
        "Real-time ambulance dispatch: Redis geospatial search, Socket.IO, atomic Lua and BullMQ behind NestJS, with React Native rider and driver apps and Next.js dashboards.",
      image: "/projects/medurun.jpg",
      category: "Dispatch · Heizen",
      tech: ["NestJS", "Redis geo", "Socket.IO", "React Native"],
      link: "https://medurun.com/",
      github: "#",
      featured: false,
    },
    {
      key: "equitynav",
      label: "EquityNav",
      description:
        "AI insight agents for vesting, exercises and liquidity on the Vercel AI SDK, with tool calling, SQL execution, structured outputs and guardrails — plus Carta-synced projection, scenario and risk dashboards.",
      image: "/projects/equitynav.jpg",
      category: "Equity AI · Heizen",
      tech: ["Vercel AI SDK", "OpenAI", "Gemini", "NestJS"],
      link: "#",
      github: "#",
      featured: false,
    },
    {
      key: "quotient",
      label: "Quotient",
      description: "A writing workspace with fast capture and notebooks — Keep-style notes in a clean editor on a fast Next.js stack.",
      image: "/projects/quotient.jpg",
      category: "Productivity",
      tech: ["Next.js", "Prisma", "Neon"],
      link: "https://quotient-dun.vercel.app/",
      github: "https://github.com/devhimanshuhc/quotient",
      featured: false,
    },
    {
      key: "datasays",
      label: "DataSays",
      description: "Plain-English questions return SQL and a chart — an LLM analysis layer for querying and visualizing datasets.",
      image: "/projects/datasays.jpg",
      category: "AI analytics",
      tech: ["LLMs", "SQL", "TypeScript"],
      link: "https://datasays.app/",
      github: "#",
      featured: false,
    },
  ],
}
