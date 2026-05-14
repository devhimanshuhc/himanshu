import DeviconReact from "../assets/icons/DeviconReact.svg";
import DeviconSvelte from "../assets/icons/DeviconSvelte.svg";
import DeviconNextjs from "../assets/icons/DeviconPlainNextjs.svg";
import DeviconReactnative from "../assets/icons/DeviconReactnative.svg";
import SimpleIconsExpo from "../assets/icons/SimpleIconsExpo.svg";
import DeviconNestjs from "../assets/icons/DeviconNestjs.svg";
import DeviconPython from "../assets/icons/DeviconPython.svg";
import Postgres from "../assets/icons/Postgres.svg";
import Typescript from "../assets/icons/Typescript.svg";

export const CONTENT = {
  hero: {
    sub: "hi i'm ansh, a",
    main1: "full stack web + app",
    main2: "developer",
    paragraph1:
      "i'm a full-stack web and app developer with a passion for 3d and design animation building immersive digital experiences that blend technology and creativity.",
    paragraph2:
      "need someone to help you ship across web, mobile, and the stack behind it all? i've got your back.",
    tools: [
      {
        label: "Typescript",
        Icon: Typescript,
      },
      {
        label: "React",
        Icon: DeviconReact,
      },
      {
        label: "Svelte",
        Icon: DeviconSvelte,
      },
      {
        label: "Next.js",
        Icon: DeviconNextjs,
      },
      {
        label: "NestJS",
        Icon: DeviconNestjs,
      },
      {
        label: "Python",
        Icon: DeviconPython,
      },
      {
        label: "PostgreSQL",
        Icon: Postgres,
      },
      {
        label: "React Native",
        Icon: DeviconReactnative,
      },
      {
        label: "Expo",
        Icon: SimpleIconsExpo,
      },
    ],
  },
  hire: {
    pitch: [
      {
        title: "performance first",
        description:
          "i build fast apps that stay fast—optimized for real users, real devices, and the messy production edge cases that show up after launch.",
      },
      {
        title: "modern stack",
        description:
          "react, next.js, react native, nestjs, strong backends, and integrations—from analytics and ai workflows to blockchain and mobile when the problem calls for it.",
      },
      {
        title: "pixel perfect",
        description:
          "meticulous attention to detail in design implementation. your vision, translated faithfully into interfaces people enjoy using.",
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
  /** Mirrors `skills` + `taglines.skillsSectionTitle` in portfolio-profile.json */
  skillsSection: {
    title: "technical arsenal",
    categories: [
      {
        name: "Frontend",
        description:
          "Building modern web applications with cutting-edge frameworks",
        items: ["Next.js", "React", "Svelte", "Three.js"],
      },
      {
        name: "Backend & Desktop",
        description: "Developing robust server-side and desktop applications",
        items: ["Node.js", "MongoDB", "PostgreSQL", "Electron/Tauri"],
      },
      {
        name: "Mobile",
        description: "Developing android apps and browser",
        items: ["React Native", "Expo", "Android Studio"],
      },
      {
        name: "UI Frameworks",
        description:
          "Crafting beautiful user interfaces with modern CSS frameworks",
        items: ["Tailwind CSS", "Shadcn UI", "Chakra UI", "Bootstrap"],
      },
      {
        name: "Technologies",
        description: "Implementing advanced technical solutions",
        items: ["Blockchain", "Smart Contracts", "Unreal Engine"],
      },
    ],
  },
  projects: [
    {
      key: "quotient",
      label: "Quotient",
      description:
        "A lightweight writing workspace for quick notes and drafts—Keep-style capture with a clean editor, organized notebooks, and a fast Next.js stack backed by Prisma and Neon.",
      image:
        "https://images.unsplash.com/reserve/LJIZlzHgQ7WPSh5KVTCB_Typewriter.jpg?q=80&w=1896&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      category: "Productivity",
      tech: ["NextJS", "TypeScript", "Prisma ORM", "NeonDB"],
      link: "https://quotient-dun.vercel.app/",
      github: "https://github.com/devhimanshuhc/quotient",
      featured: false,
    },
    {
      key: "datasays",
      label: "DataSays",
      description:
        "An AI-powered data assistant—ask questions in plain language, explore your metrics, and get answers without drowning in spreadsheets or SQL. Live product at datasays.app.",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
      category: "AI",
      tech: ["AI", "Data", "TypeScript"],
      link: "https://datasays.app/",
      github: "#",
      featured: false,
    },
    {
      key: "revio",
      label: "Revio",
      description:
        "A comprehensive real estate platform built with Next.js, leveraging RapidAPI for property data. Features include advanced property search, detailed listings, and interactive maps.",
      image:
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973&auto=format&fit=crop",
      category: "Real Estate",
      tech: ["Next.js", "RapidAPI", "Axios", "TailwindCSS"],
      link: "https://revio.vercel.app/",
      github: "https://github.com/devhimanshuhc/ReVio",
      featured: true,
    },
    {
      key: "cryptorealms",
      label: "CryptoRealms",
      description:
        "Cryptocurrency tracking application providing real-time data on top cryptocurrencies. Built with React and RTK Query for efficient state management.",
      image:
        "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=2069&auto=format&fit=crop",
      category: "Cryptocurrency",
      tech: ["React", "RTK Query", "RapidAPI", "Tailwind CSS"],
      link: "https://cryptorealms.vercel.app",
      github: "https://github.com/devhimanshuhc/cryptorealms",
      featured: false,
    },
    {
      key: "portfolio",
      label: "Portfolio Website",
      description:
        "Interactive portfolio featuring 3D animations, custom terminal-like interactions, and smooth transitions. Built with Next.js and TypeScript.",
      image:
        "https://images.unsplash.com/photo-1545665277-5937489579f2?q=80&w=2070&auto=format&fit=crop",
      category: "Personal",
      tech: ["Next.js", "TypeScript", "Three.js", "Tailwind CSS"],
      link: "#",
      github: "#",
      featured: true,
    },
  ],
};
