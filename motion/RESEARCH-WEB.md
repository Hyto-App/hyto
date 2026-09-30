# Research: animated "epic" websites built with Claude, and how to use them for the Hyto demo

Collected 2026-09-30 (CR). Sources: X (connector `@tryhyto`, read only, 3 searches plus 2 lookups, staying under the rate limit), WebSearch/WebFetch (Reddit, YouTube, blogs, Threads, Figma docs) and GitHub (every repo checked through the GitHub connector, with stars, last push and license as of today).
Everything cited was returned by a tool. Claims *inside* the posts (prices, "one-shot", attributions) were not verified independently.

Hyto stack (checked in `Hyto-App/hyto`, `package.json` on `main`): **Next.js 16.3.6, React 19.1.1, Tailwind CSS 4.1**, deployed on Vercel. **No animation library installed yet** (no GSAP, Motion, Three.js or Lenis).

---

## 1. X — what people are posting

| Author | Date | What it shows | Link |
|---|---|---|---|
| @MengTo | 09-25 | A 47-min tutorial: **Mobbin MCP for strong references** → the model combines them into a multi-section landing page with **Three.js** scenes and a consistent design, plus a brand guide, logo explorations and ad creatives as **separate tasks**. The live site and the tutorial site come *with prompts*. (850 likes / 1.3k bookmarks) | https://x.com/MengTo/status/2103491024287084744 |
| @QibazX | 09-27 | "10 GitHub repos for Claude motion design": emilkowalski/skills, **greensock/gsap-skills**, remotion-dev/skills, **heygen-com/hyperframes**, diffusionstudio/lottie, iart-ai/motion-skills, Math-To-Manim, CloudAI-X/threejs-skills, anthropics/skills, **pbakaus/impeccable**. Rule of thumb: "motion on a website: emilkowalski + gsap-skills; a video for X: hyperframes (HTML) or remotion (React)". | https://x.com/QibazX/status/2104317018552107250 |
| @mahdicreates | 09-28 | A fictional resort site: Opus 5.5 + Claude Design, **HTML/CSS/JS + GSAP + Lenis + Three.js**, with sound on scroll. | https://x.com/mahdicreates/status/2104582996787650635 |
| @aipulseda1ly | 09-27 | A Three.js site in **one continuous scroll-driven camera move** (GPU die → data center), with real numbers and sources on screen. 363 KB, every surface generated in code. The model **self-checked 600 tiles and fixed 22 defects**. | https://x.com/aipulseda1ly/status/2104346899369066696 |
| @Designer_Nuel | 09-29 | A product "exploded view" on scroll: parts fly out, explain themselves and rebuild (Opus 5.5 + three.js). Good pattern for "how Hyto works". | https://x.com/Designer_Nuel/status/2104935743730651532 |
| @llama3dstudio | 09-25 | A scroll-animated Three.js site with **no 3D models**: everything, playing cards included, generated in code. | https://x.com/llama3dstudio/status/2103590715695706546 |
| @trysvglab | 09-30 | Screens designed with an SVG MCP, then **animated SVGs** (≈190 KB for 8 assets) for a landing page, exported as CSS / Framer Motion / React Spring code. They are open about the placeholders. | https://x.com/trysvglab/status/2105369085207003596 |
| @korecryptohub | 08-31 | A Claude Code skill for "award-winning, motion-rich websites": concept-first workflow, **GSAP + Lenis + Three.js**, an anti-slop guide and a "ship-it checklist" of common fixes. Repo: blackbrainpy/designs-by-kore. | https://x.com/korecryptohub/status/2094290492804784376 |
| @AmirMushich | 09-30 | A long, strict prompt for Claude working **inside Figma via Figma MCP** (native Figma Motion showreel): inputs, named layers, loop rules, timing ratios and a **scrub-and-verify checklist**. A template for writing precise motion specs. | https://x.com/AmirMushich/status/2105332058037915967 |
| @shannholmberg | 09-13 | Context management for landing pages: keep a **`design.md`** (type, colors, safe zones, do/don't with reasons) plus a live **Figma/Paper file via MCP** with approved and rejected frames and comments. (426 likes) | https://x.com/shannholmberg/status/2099166725396922524 |
| @KelioScott | 09-19 | A web-design tool stack: GSAP, Motion, Motion Primitives, React Bits, 21st.dev, Figma MCP, **MengTo/Skills** and Refero Styles (DESIGN.md examples). | https://x.com/KelioScott/status/2101404409649344588 |

Noise to ignore: a series of near-identical "$15K 3D hero" posts from the same accounts, selling prompt packs (e.g. @himanshubuildss, @Xr0ud, @amananimates). They're repetitive marketing, so I left them out.

## 2. Other platforms (Reddit, YouTube, blogs, Threads, docs)

- **Designing for Uncertainty — "Opus 5.5 Is INSANE for Web Design (Complete Guide)"** (the written companion to the Meng To video). Chapters cover: gathering Mobbin screenshots → planning the sections → art direction → *choosing which assets belong in 3D and which are images or icons* → improving materials, lighting and motion → "give the agent time to work" → logos, brand guide and ads as separate tasks → a spending limit on image generation → reviewing work in progress. https://designingforuncertainty.com/2026/09/26/opus-5-5-is-insane-for-web-design-complete-guide/
- **YouTube — "How I Build Insane Three.js Websites With Claude Opus 5"**: turn a flat reference into 3D and build up the vocabulary for it (orbit, parallax, particles, shader effects on HTML). "The less time you spend, the more it becomes AI slop." https://www.youtube.com/watch?v=G-F5Qvy-7KM
- **Reddit r/ClaudeAI — Monich skill pack** (GSAP / Motion / plain-HTML templates, pinned scroll, parallax, reduced-motion and performance rules). A commenter warns that 3D generated purely by AI stays "boring spline paths": bake the animations into a GLB and let the AI sequence them. https://www.reddit.com/r/ClaudeAI/comments/1uajpxu/a_skill_that_help_ai_understand_more_about_gsap/
- **Threads (@agmat.is) — "animated landing page with Claude + GSAP in under 2 hours"**: structure first, GSAP after. **Describe animations like a director** ("headline enters from left over 0.8s, each word staggers 0.1s, CTA bounces once"). Stack: GSAP + ScrollTrigger + TextPlugin + Lenis. https://www.threads.com/@agmat.is/post/DZoQ-bHDEtr
- **Figma — "How Designers Can Use Claude Code"** (official): connect the Figma MCP, copy a frame link, and ask to "reuse our existing components and pull values from our design tokens". It can also push code back to Figma as layers. https://www.figma.com/resource-library/claude-code-for-designers/
- **Vibe Coding Academy — Figma MCP + Claude Code guide**: `get_design_context` (React + Tailwind by default), `get_screenshot`, and `create_design_system_rules` to write a rules file Claude reuses every session. Plan Mode before generating. https://www.vibecodingacademy.ai/blog/figma-mcp-claude-code-complete-guide
- **Claude Lab — Figma MCP advanced guide**: put **non-visual motion specs in Figma annotations**, keep a `Design.md` "Animation & Motion" section (durations and easing tokens). https://claudelab.net/en/articles/claude-code/claude-code-figma-mcp-design-automation-guide
- **MindStudio — Animated 3D websites with Claude Code**: a spec-first prompt example (dark navy, sections, GSAP ScrollTrigger for all animations), then Three.js as an optional step. https://www.mindstudio.ai/blog/animated-3d-websites-claude-code-ai-video-generation
- **ClaudeCodeLab — Three.js with Claude Code**: ask Claude to **review disposal, resize and devicePixelRatio caps** before shipping. Give the canvas parent a real height, or it renders blank. https://claudecode-lab.com/en/blog/claude-code-threejs-3d/

**Common pattern across sources:** references (Mobbin/Figma/screens) → design.md / brand rules → 3 directions → a still per section → build in code with **skills loaded** (GSAP, Three.js, motion rules) → the agent self-reviews in the browser (screenshots, reduced-motion, performance) → precise director notes → a separate task for brand, ads and video.

## 3. GitHub — verified repos (stars / last push / license as of 2026-09-30)

### Claude skills and agent tooling
| Repo | ★ | Last push | License | Why it helps Hyto |
|---|---|---|---|---|
| https://github.com/greensock/gsap-skills | 15.8k | 2026-07-29 | MIT | **Official** GSAP skills (core, timeline, **ScrollTrigger**, plugins, **gsap-react/useGSAP** for Next.js, performance). Install in Claude Code: `/plugin marketplace add greensock/gsap-skills`. |
| https://github.com/emilkowalski/skills | 42.4k | 2026-09-23 | MIT | UI-animation rules (curves, durations) plus a `review-animations` skill to audit what was built. |
| https://github.com/pbakaus/impeccable | 73.0k | 2026-09-30 | Apache-2.0 | Design commands (incl. animate) plus a CLI that flags "AI tells" (purple gradients, bounce easing). Useful as an anti-slop gate. |
| https://github.com/anthropics/skills | 179k | 2026-09-29 | none in the repo metadata (check per skill) | Anthropic's own skills: **`frontend-design`**, `brand-guidelines`, `theme-factory`, `webapp-testing` (browser checks), `algorithmic-art`. |
| https://github.com/MengTo/Skills | 6.5k | 2026-09-30 | MIT | Design skills from the Meng To workflow (landing pages, brand guides). |
| https://github.com/CloudAI-X/threejs-skills | 3.4k | 2026-07-09 | none listed | Three.js skills that load by task (lighting, GLTF, animation). Only if we go 3D. |
| https://github.com/figma/mcp-server-guide | 2.0k | 2026-09-30 | none listed | The official guide for the Figma MCP server (Abdiel's "Hyto – App" Figma is the UI source of truth). |
| https://github.com/heygen-com/hyperframes | 54.6k | 2026-09-30 | Apache-2.0 | **HTML → deterministic MP4** (seeks frame by frame; takes GSAP, Lottie, CSS and Three.js). Lets the **same GSAP scenes from the site render as Motion's videos**. |
| https://github.com/echris6/motion-video-kit | 494 | 2026-09-28 | MIT | The Claude Code video kit from the first research: an independent critic loop and motion principles. |
| https://github.com/iart-ai/motion-skills | 610 | 2026-09-30 | MIT | 50 motion skills (kinetic type, charts, explainers). Visual ones render a frame and self-check it. |
| https://github.com/kash-123/cinematic-scroll-landing | 4 | 2026-07-23 | MIT | A small but complete Claude Code skill for **dark cinematic scroll landings** (GSAP ScrollTrigger + Lenis) with recipes, a Puppeteer check harness and a design-spec paper trail. Low stars, so treat it as a reference. |
| https://github.com/blackbrainpy/designs-by-kore | 2 | 2026-08-31 | MIT | Skill with an anti-slop guide and a ship-it checklist (GSAP + Lenis + Three.js). Very new, reference only. |

### Libraries and starters for Next.js on Vercel
| Repo | ★ | Last push | License | Why it helps Hyto |
|---|---|---|---|---|
| https://github.com/greensock/GSAP | 28.7k | 2026-04-13 | GSAP "Standard" no-charge license (not OSI; read the terms) | Timelines, ScrollTrigger, SplitText, DrawSVG, MorphSVG. The same API is used in the web page and in HyperFrames videos. |
| https://github.com/motiondivision/motion | 33.8k | 2026-09-30 | MIT | Motion (formerly Framer Motion): React-native `motion.div`, `whileInView`, layout animations. The simplest option for UI micro-interactions in the Hyto app. |
| https://github.com/darkroomengineering/lenis | 16.1k | 2026-09-30 | MIT | Smooth scroll, the standard pairing with ScrollTrigger for the "premium" feel. |
| https://github.com/darkroomengineering/satus | 998 | 2026-09-30 | MIT | **Next.js 16 + React 19 + Tailwind v4** starter with Lenis, GSAP and Tempus, an opt-in R3F WebGL module, **AGENTS.md / llms.txt for agents** and a Vercel deploy button. Same major versions as Hyto, so the easiest base for a pitch site. |
| https://github.com/pmndrs/react-three-fiber | 32.6k | 2026-09-30 | MIT | Three.js as React components, if we add a 3D hero (e.g. escrow "vault"). |
| https://github.com/pmndrs/drei | 9.9k | 2026-09-30 | MIT | R3F helpers (ScrollControls, Text, Float, Environment). |
| https://github.com/14islands/r3f-scroll-rig | 979 | 2025-12-17 | MIT | Syncs 3D meshes with DOM sections while scrolling. Slower activity. |
| https://github.com/ibelick/motion-primitives | 6.4k | 2026-09-28 | MIT | Copy-paste animated components (text effects, in-view, spotlight) for Tailwind + Motion. |
| https://github.com/DavidHDev/react-bits | 48.3k | 2026-09-30 | custom (GitHub: NOASSERTION; read the terms) | Animated React components (text, backgrounds). Check the license before using it. |
| https://github.com/basementstudio/scrollytelling | 1.7k | 2024-02-22 | custom (NOASSERTION) | React + GSAP scrollytelling. **Inactive since 2024**, ideas only. |
| https://github.com/remotion-dev/remotion | 61.3k | 2026-09-30 | custom Remotion license (free for individuals and small teams; companies above a size need a license, so check it) | React → MP4. The alternative to HyperFrames for Motion. |

## 4. Top 7 for Hyto (in priority order)

1. **greensock/gsap-skills** + **GSAP**: the core of scroll choreography, taught to Claude through official skills.
2. **darkroomengineering/satus**: a matching Next.js 16 / React 19 / Tailwind v4 base with Lenis + GSAP (+ optional R3F) and agent docs.
3. **heygen-com/hyperframes** (Apache-2.0): write the scenes once in HTML/GSAP and render them as MP4s for Motion (the 1920x1080 and 1080x1350 videos). One source for the web and the videos.
4. **emilkowalski/skills** + **pbakaus/impeccable**: motion rules plus an anti-slop review pass.
5. **anthropics/skills** (`frontend-design`, `brand-guidelines`, `webapp-testing`): official skills for design quality and browser checks.
6. **darkroomengineering/lenis** + **motiondivision/motion**: smooth scroll plus React micro-interactions (also reusable in the real app later).
7. **figma/mcp-server-guide** (Figma MCP): pull Abdiel's Mockups v2 / "Hyto – App" frames and tokens straight into the code.
(Optional 3D: **pmndrs/react-three-fiber** + **drei** + **CloudAI-X/threejs-skills**.)

## 5. Plan: combining this with the Motion pack for the Hyto demo

**Goal:** a scroll-driven **pitch page** (for the demo and judges) that tells the same story as the videos in `motion/PROMPTS.md`, in the same brand (lime `#B7EE34` on navy `#14162B`, `#08090C` on the accent, Poppins 400/500/600, "Prove your worth. Get paid."). Its GSAP scenes also render to MP4 through HyperFrames, so the site and videos stay identical.

**Where it lives (team decision, nothing touched yet):**
- Option A, recommended: a separate small project (`hyto-pitch`, from satus or a bare Next.js 16) on its own Vercel project. Zero risk to the MVP app and no changes to the Hyto repo's dependencies.
- Option B: an `app/pitch` route in Hyto-App/hyto on its own branch and PR (adds `gsap`, `@gsap/react` and `lenis`). It needs Abdiel's OK (the UI follows his Figma) and the usual `npm test` / `tsc` checks.
- Either way: no real app URL on the page, demo data only, the "Testnet demo" badge, and no AI model named (the reviewer is **Laya**). These are the same rules as the video pack.

**Sections = the video scenes** (one pinned GSAP timeline per section, scrubbed by scroll):
| # | Section | Reuses video | Animation idea |
|---|---|---|---|
| 0 | Hero: "Volunteering that pays." | 02 shot 1 | Phone push-in, the lime "Milestone paid ✓" notification drops, the tagline underline draws on |
| 1 | The problem (untracked event spend) | — | Receipts scatter, then snap into a clean ledger (SplitText headline) |
| 2 | Volunteer flow | 02 | A pinned phone. On scroll: My tasks → camera → submit → "In review" (a click SFX per step if sound is on) |
| 3 | Meet Laya | 04 | Three verdict cards (Complete / Partial / Insufficient) flip in. The reason types on. "Laya recommends. People decide." |
| 4 | Organizer approves | 03 | Desktop inbox, the counter ticks to 3, push into "Approve & pay", then the "Confirmed" chime |
| 5 | Escrow on Stellar (Trustless Work) | 05 | The budget bar locks, splits into milestone segments, and one segment flows to the volunteer on approval. The others stay locked ("No approval, no release") |
| 6 | Report | 05 shot 6 | Budget vs. Spent bars grow (demo values) |
| 7 | Team plus the Oct 5 deadline | 06, 07 | Five role cards snap in, then the checklist ticks |
| 8 | End card | all | Logo, "Prove your worth. Get paid.", @tryhyto |
Accessibility and performance: honor `prefers-reduced-motion` (static stacked sections), animate transforms and opacity only, lazy-load any 3D, and keep Lighthouse CLS at 0.

**Workflow and prompts for Claude (Opus 5.5 or the current top Claude model, in Claude Code):**

*Setup (once):* install the skills `greensock/gsap-skills`, `emilkowalski/skills` and `anthropics/skills` (frontend-design, webapp-testing), plus `pbakaus/impeccable`. Connect the Figma MCP (Abdiel's file) and add `hyperframes` for the video export.

**P1 — Design brief file**
```
Read motion/PROMPTS.md (style guide, rules, the 6 storyboards) and the Figma frames I link via Figma MCP
(get_design_context + get_screenshot for Mockups v2, dark theme). Write DESIGN.md for a scroll-driven pitch page:
tokens (navy #14162B, lime #B7EE34, on-accent #08090C, white/60%), Poppins 400/500/600 scale, motion tokens
(ease cubic-bezier(0.22,1,0.36,1), 0.25–0.45 s UI, 0.8–1.2 s section reveals), do/don't list, and the hard rules
(English only, no real URL/wallet/amount, demo data + "Testnet demo" badge, never name the AI model; the reviewer is Laya).
Don't write code yet.
```
**P2 — 3 directions plus stills**
```
Using DESIGN.md and the section table (hero, problem, volunteer flow, Laya, organizer, escrow, report, team+deadline, end),
propose 3 art directions (one paragraph each, with a named reference style). Then for the one I pick, render ONE static
still per section at 1440x900 and 390x844. Stop for approval.
```
**P3 — Build**
```
Build the approved direction in Next.js 16 App Router + Tailwind v4 (satus base / or app/pitch), 'use client' only where needed.
Use GSAP + ScrollTrigger via useGSAP (gsap-react skill) and Lenis. One pinned, scrubbed timeline per section, driven by a
scenes.ts data file that mirrors the beat maps in motion/PROMPTS.md. Rebuild the UI mockups as real components (no screenshots),
transforms/opacity only, prefers-reduced-motion fallback, optional sound toggle (click SFX on every on-screen click).
```
**P4 — Self-review loop**
```
Run the dev server and review with the webapp-testing skill: screenshot every section at 3 scroll points on desktop and mobile,
check contrast ≥4.5:1, text only in Poppins, no layout shift, 60fps (no layout thrash), reduced-motion works, no real URLs/amounts,
no AI model names. Run review-animations and impeccable's checks. List defects, fix them, and repeat until clean.
```
**P5 — Director notes (the last 20%)**. Send literal notes: "slow the escrow split to 0.7x", "hard cut into the Laya section", "hold the Paid notification +0.5 s", "push into Approve & pay".
**P6 — Export as video for Motion**
```
Wrap sections 0,2,3,4,5,8 as HyperFrames compositions (same GSAP timelines, time-driven instead of scroll-driven) and render
1920x1080 and 1080x1350 MP4s at 30fps matching the storyboards 02–07 in motion/PROMPTS.md. Add the audio pass per the pack
(royalty-free soft music, click SFX on each click). Deliver to Drive Hyto/Motion/<slug>/ only after Abdiel approves.
```

**Suggested order before Oct 5:** Day 1: P1–P2 plus Abdiel's approval. Days 2–3: P3–P4 (hero, flow and escrow first). Day 4: P5, then P6 for 2–3 videos. Leave a buffer before the Oct 5, 4:00 PM deadline. Get Abdiel's approval before anything is published.

**Risks:** the Remotion and React Bits licenses (use HyperFrames and MIT libraries if unsure). Heavy 3D on demo laptops (keep it optional). Scope creep against #005 (the MVP is the priority, so the page shows only features that exist). Low-star skill repos are references, not dependencies.
