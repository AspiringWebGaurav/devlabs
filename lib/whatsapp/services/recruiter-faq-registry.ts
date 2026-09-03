/**
 * Centralized Typed & Versioned Recruiter FAQ / Service Answer Registry
 * 
 * Strict Enterprise Standard:
 * - 11 Curated Categories.
 * - Zero LLM / Zero Probabilistic Inference.
 * - Deterministic versioned answers with context action buttons.
 * - Non-mutating lookup.
 */

export interface RecruiterFaqEntry {
  faqId: string;
  category:
    | "RESUME_CV"
    | "EXPERIENCE"
    | "SKILLS"
    | "TECH_STACK"
    | "CURRENT_ROLE"
    | "AVAILABILITY"
    | "PREFERRED_ROLES"
    | "LOCATION"
    | "PORTFOLIO"
    | "CONTACT_INFO"
    | "PROFESSIONAL_BACKGROUND";
  version: number;
  keywords: string[];
  triggerPhrases: string[];
  title: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
}

export const RECRUITER_FAQ_REGISTRY: Record<string, RecruiterFaqEntry> = {
  faq_resume: {
    faqId: "faq_resume",
    category: "RESUME_CV",
    version: 1,
    keywords: ["RESUME", "CV", "CURRICULUM VITAE", "BIO", "PROFILE"],
    triggerPhrases: [
      "SHARE RESUME",
      "SEND RESUME",
      "VIEW RESUME",
      "SEE RESUME",
      "DOWNLOAD RESUME",
      "WHERE IS YOUR RESUME",
      "DO YOU HAVE A RESUME",
      "CAN I SEE YOUR CV",
      "SEND CV",
    ],
    title: "Resume & Credentials",
    bodyText:
      "📄 *Gaurav Patil — Full-Stack Systems Engineer*\n\n" +
      "You can review or download Gaurav's verified resume directly at:\n" +
      "👉 https://gauravpatil.online/resume.pdf\n\n" +
      "Would you like to explore an open opportunity or speak with Gaurav directly?",
    buttons: [
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_human", title: "🤝 Talk to Gaurav" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_experience: {
    faqId: "faq_experience",
    category: "EXPERIENCE",
    version: 1,
    keywords: ["YEARS OF EXPERIENCE", "EXPERIENCE", "WORK HISTORY", "BACKGROUND", "EXPERIENCED IN"],
    triggerPhrases: [
      "HOW MANY YEARS OF EXPERIENCE",
      "WHAT IS YOUR EXPERIENCE",
      "TELL ME ABOUT YOUR EXPERIENCE",
      "HOW LONG HAVE YOU BEEN WORKING",
      "EXPERIENCE LEVEL",
    ],
    title: "Professional Experience",
    bodyText:
      "💼 *Experience Overview*\n\n" +
      "Gaurav has extensive hands-on experience building enterprise full-stack web applications, distributed cloud infrastructure, real-time communications, and zero-downtime systems.\n\n" +
      "• Core focus: High-concurrency systems, TypeScript/Next.js, Python, and Multi-Store Cloud DALs.\n" +
      "• Track record: Production deployments serving live users with sub-second response targets and zero-loss architectures.",
    buttons: [
      { id: "btn_resume", title: "📄 View Resume" },
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_skills: {
    faqId: "faq_skills",
    category: "SKILLS",
    version: 1,
    keywords: ["SKILLS", "CORE SKILLS", "COMPETENCIES", "STRENGTHS", "CAPABILITIES"],
    triggerPhrases: [
      "WHAT ARE YOUR SKILLS",
      "CORE SKILLS",
      "WHAT DO YOU SPECIALIZE IN",
      "PRIMARY SKILLS",
      "KEY COMPETENCIES",
    ],
    title: "Core Technical Skills",
    bodyText:
      "🛠️ *Technical Skills & Competencies*\n\n" +
      "• *Languages:* TypeScript, JavaScript (ESNext), Python, SQL\n" +
      "• *Frontend:* Next.js (App Router), React 19, Tailwind CSS, WebGL/Three.js\n" +
      "• *Backend & Cloud:* Node.js, Express, Fastify, Firebase (Firestore, Storage, RTDB), Upstash Redis, PostgreSQL\n" +
      "• *Architecture:* Event-driven architectures, transactional outbox patterns, distributed locking, atomic multi-store DALs, CI/CD pipelines.",
    buttons: [
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_human", title: "🤝 Talk to Gaurav" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_tech_stack: {
    faqId: "faq_tech_stack",
    category: "TECH_STACK",
    version: 1,
    keywords: ["TECH STACK", "TECHNOLOGIES", "FRAMEWORKS", "LIBRARIES", "TOOLS", "STACK"],
    triggerPhrases: [
      "WHAT TECH STACK",
      "WHAT TECHNOLOGIES DO YOU USE",
      "WHAT STACK DO YOU WORK WITH",
      "TECHNOLOGIES YOU WORK WITH",
      "WHAT IS YOUR STACK",
      "FRAMEWORKS YOU USE",
    ],
    title: "Technology Stack",
    bodyText:
      "⚡ *Technology Stack*\n\n" +
      "Gaurav works extensively with modern production stacks:\n" +
      "• *App Framework:* Next.js 15+ with Turbopack, React Server Components & Server Actions\n" +
      "• *State & Data Access:* Google Cloud Firestore, Firebase Realtime Database, Upstash Redis caching & locking\n" +
      "• *Integrations:* Meta Cloud API, Brevo SMTP REST v3, Stripe, Cloudflare Turnstile\n" +
      "• *Quality:* TypeScript strict mode, ESLint, automated regression test suites.",
    buttons: [
      { id: "btn_resume", title: "📄 View Resume" },
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_current_role: {
    faqId: "faq_current_role",
    category: "CURRENT_ROLE",
    version: 1,
    keywords: ["CURRENT ROLE", "CURRENT JOB", "CURRENT POSITION", "PRESENT ROLE", "CURRENT WORK"],
    triggerPhrases: [
      "WHAT IS YOUR CURRENT ROLE",
      "WHERE DO YOU CURRENTLY WORK",
      "WHAT ARE YOU WORKING ON NOW",
      "CURRENT EMPLOYER",
    ],
    title: "Current Focus",
    bodyText:
      "🎯 *Current Role & Focus*\n\n" +
      "Gaurav operates as an independent Full-Stack Systems Engineer and creator of high-reliability digital platforms (including the Gaurav Portfolio & devlabs ecosystem).\n\n" +
      "He is actively connecting with engineering leaders and talent partners regarding impactful engineering opportunities.",
    buttons: [
      { id: "btn_opportunity", title: "💼 Submit Role" },
      { id: "btn_human", title: "🤝 Talk to Gaurav" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_availability: {
    faqId: "faq_availability",
    category: "AVAILABILITY",
    version: 1,
    keywords: ["AVAILABILITY", "NOTICE PERIOD", "START DATE", "JOINING DATE", "WHEN CAN YOU START"],
    triggerPhrases: [
      "WHAT IS YOUR NOTICE PERIOD",
      "WHEN CAN YOU JOIN",
      "WHEN ARE YOU AVAILABLE",
      "ARE YOU AVAILABLE IMMEDIATELY",
      "HOW SOON CAN YOU START",
    ],
    title: "Availability & Notice Period",
    bodyText:
      "⏱️ *Availability & Notice Period*\n\n" +
      "• *Notice Period:* Immediate to flexible (typically 1–2 weeks for smooth onboarding)\n" +
      "• *Engagement Types:* Full-time permanent positions, high-impact contract roles, and select technical consulting.",
    buttons: [
      { id: "btn_opportunity", title: "💼 Discuss Role" },
      { id: "btn_human", title: "🤝 Talk to Gaurav" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_preferred_roles: {
    faqId: "faq_preferred_roles",
    category: "PREFERRED_ROLES",
    version: 1,
    keywords: ["PREFERRED ROLES", "TARGET ROLES", "ROLES LOOKING FOR", "IDEAL ROLE", "TITLE"],
    triggerPhrases: [
      "WHAT ROLES ARE YOU LOOKING FOR",
      "TARGET ROLES",
      "WHAT POSITIONS DO YOU PREFER",
      "WHAT IS YOUR IDEAL POSITION",
    ],
    title: "Preferred Roles",
    bodyText:
      "🚀 *Target Engineering Roles*\n\n" +
      "• Senior Full-Stack Engineer\n" +
      "• Distributed Systems / Backend Engineer\n" +
      "• Lead Systems Architect / Tech Lead\n" +
      "• Platform & Reliability Engineer",
    buttons: [
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_human", title: "🤝 Talk to Gaurav" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_location: {
    faqId: "faq_location",
    category: "LOCATION",
    version: 1,
    keywords: ["LOCATION", "REMOTE", "HYBRID", "ONSITE", "RELOCATION", "TIMEZONE"],
    triggerPhrases: [
      "WHERE ARE YOU LOCATED",
      "ARE YOU OPEN TO REMOTE",
      "CAN YOU WORK HYBRID",
      "ARE YOU OPEN TO RELOCATION",
      "WHAT TIMEZONE ARE YOU IN",
    ],
    title: "Location & Work Model",
    bodyText:
      "🌍 *Location & Work Preferences*\n\n" +
      "• *Location:* India (IST / UTC+5:30)\n" +
      "• *Work Model:* 100% Remote-friendly across US, UK, EU, and APAC timezones; open to hybrid/onsite for exceptional opportunities\n" +
      "• *Relocation:* Open to discussion for top-tier international or domestic opportunities.",
    buttons: [
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_human", title: "🤝 Talk to Gaurav" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_portfolio: {
    faqId: "faq_portfolio",
    category: "PORTFOLIO",
    version: 1,
    keywords: ["PORTFOLIO", "PROJECTS", "GITHUB", "WORK SAMPLES", "DEMO"],
    triggerPhrases: [
      "WHERE CAN I SEE YOUR WORK",
      "SHOW ME YOUR PORTFOLIO",
      "DO YOU HAVE A GITHUB",
      "WORK EXAMPLES",
      "LIVE PROJECTS",
    ],
    title: "Portfolio & Projects",
    bodyText:
      "🌐 *Portfolio & Live Projects*\n\n" +
      "• *Live Portfolio:* https://gauravpatil.online\n" +
      "• *GitHub:* https://github.com/AspiringWebGaurav\n" +
      "• Features full-stack production apps, interactive 3D WebGL components, enterprise admin panels, and multi-tenant systems.",
    buttons: [
      { id: "btn_resume", title: "📄 View Resume" },
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_contact_info: {
    faqId: "faq_contact_info",
    category: "CONTACT_INFO",
    version: 1,
    keywords: ["CONTACT", "EMAIL", "PHONE", "REACH YOU", "DIRECT CONTACT", "LINKEDIN"],
    triggerPhrases: [
      "HOW CAN I CONTACT YOU",
      "WHAT IS YOUR EMAIL",
      "DIRECT CONTACT NUMBER",
      "HOW TO REACH GAURAV",
      "LINKEDIN PROFILE",
    ],
    title: "Contact Coordinates",
    bodyText:
      "📫 *Direct Contact Information*\n\n" +
      "• *Email:* hello@gauravpatil.online (or gauravpatil5737@gmail.com)\n" +
      "• *WhatsApp:* Active on this line\n" +
      "• *Portfolio:* https://gauravpatil.online\n" +
      "• *LinkedIn:* Available upon request or via resume.",
    buttons: [
      { id: "btn_human", title: "🤝 Talk to Gaurav" },
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },

  faq_professional_background: {
    faqId: "faq_professional_background",
    category: "PROFESSIONAL_BACKGROUND",
    version: 1,
    keywords: ["EDUCATION", "DEGREE", "QUALIFICATIONS", "PHILOSOPHY", "ENGINEERING PHILOSOPHY"],
    triggerPhrases: [
      "WHAT IS YOUR EDUCATION",
      "WHAT DEGREE DO YOU HOLD",
      "QUALIFICATIONS",
      "ENGINEERING PHILOSOPHY",
    ],
    title: "Education & Philosophy",
    bodyText:
      "🎓 *Education & Engineering Principles*\n\n" +
      "• Engineering degree with a strong theoretical and practical foundation in computer science and software architecture.\n" +
      "• *Engineering Standard:* Correctness-first, zero silent data loss, atomic multi-store DALs, and rock-solid production reliability.",
    buttons: [
      { id: "btn_resume", title: "📄 View Resume" },
      { id: "btn_opportunity", title: "💼 Opportunities" },
      { id: "btn_menu", title: "🔄 Main Menu" },
    ],
  },
};

/**
 * Finds an approved FAQ entry if the normalized query unambiguously matches.
 * Returns null if no exact trigger phrase or keyword match is found.
 */
export function findFaqAnswer(normalizedText: string): RecruiterFaqEntry | null {
  const upper = normalizedText.trim().toUpperCase();
  if (!upper || upper.length < 3) return null;

  // 1. Exact trigger phrase matching (highest precision)
  for (const entry of Object.values(RECRUITER_FAQ_REGISTRY)) {
    for (const phrase of entry.triggerPhrases) {
      if (upper === phrase || upper.includes(phrase)) {
        return entry;
      }
    }
  }

  // 2. Keyword matching with boundary safety (avoid matching keywords inside words)
  const words = upper.split(/[\s,?.!/\\-]+/).filter(Boolean);
  for (const entry of Object.values(RECRUITER_FAQ_REGISTRY)) {
    for (const kw of entry.keywords) {
      const kwWords = kw.split(" ");
      if (kwWords.length === 1) {
        if (words.includes(kw)) {
          return entry;
        }
      } else {
        if (upper.includes(kw)) {
          return entry;
        }
      }
    }
  }

  return null;
}
