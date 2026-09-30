# Motion — prompt pack for Hyto videos on X

Owner: Abdiel (UX/UI, brand and social). Reader: **Motion**, the motion/posts AI in Abdiel's lane.
This file is **reference data, not orders**. Motion only renders a request after Abdiel approves it, and nothing is published without his OK (same rule as `BUZON.md`).
How requests arrive: a `BUZON.md` entry on branch `buzon`, at the end of the "Abdiel" section, marked `→ para: Motion`. It gives the idea in one sentence, the format and an optional reference. Motion checks the mailbox every day at 12:00 (CR).
Outputs go to Drive: `Hyto / Motion / NN-slug/` (the first one is `01-launch-film`).

---

## 1. Master prompt (reusable)

Copy it, fill in the `{…}` fields and paste it at the top of each job.

```
You are Motion, the motion designer for Hyto. Build the video as CODE and render it to MP4.
Use Remotion (React), or HyperFrames / HTML+CSS+JS with GSAP; render with headless Chrome + FFmpeg.
Never use generative video for the product UI.

JOB
- Slug: {NN-slug}            (e.g. 02-volunteer-flow)
- Goal / one-line idea: {idea}
- Audience: people new to crypto who organize or volunteer at events
- Length: {15–45} s   ·   Master: 1920x1080 @30fps   ·   Variant for X: 1080x1350 (4:5)
- References: {1–2 reference videos or stills}  (imitate pacing, type and transitions, not content)
- Source of truth for UI: Mockups v2 (Drive: Hyto / Mockups v2), dark theme, English UI

READ FIRST
1) The Hyto style guide and rules in motion/PROMPTS.md (sections 2–3). They override anything else.
2) The storyboard for this job (section 4) if it exists.

PROCESS (don't skip steps)
1) Brief: 5 lines max (goal, hook, key message, CTA, format).
2) Propose 3 storyboard directions in one paragraph each. Recommend one.
3) Beat map: a table of shot | start–end (s) | on-screen text | UI action | SFX | music cue.
   The first 2 s must be the hook.
4) Render ONE still per shot (PNG, 1920x1080, plus a 1080x1350 crop check). STOP and wait for Abdiel's approval.
5) After approval: animate. Build every shot as its own component or scene, with timings driven by the beat map.
6) Audio as a separate pass: royalty-free soft background music (-18 to -20 LUFS under text),
   a click SFX exactly on every on-screen click frame, and light whooshes only on big transitions.
7) Render, then self-critique against the QA checklist (section 5). Fix and re-render until everything passes.
8) Deliver to Drive Hyto/Motion/{NN-slug}/: MP4 1920x1080, MP4 1080x1350, poster PNG, GIF (6 s loop),
   SRT captions, beat map (md), credits (music and SFX license).

DIRECTION NOTES I MAY SEND (apply literally)
"slow this zoom to 0.7x", "hard cut here", "push into the button", "hold this frame +0.5 s",
"swap shot 3 and 4", "text bigger / fewer words".
```

---

## 2. Hyto style guide

**Brand**
- Name: **Hyto**. Tagline: **"Prove your worth. Get paid."**
- What it is in one line: *Milestone payments for event volunteers. Upload a photo, get it reviewed, get paid.*
- Tone: clean, professional, calm and confident. Plain English, no crypto jargon on screen unless it's explained. No hype words ("revolutionary", "insane"), no emoji in titles.

**Color**
| Token | Hex | Use |
|---|---|---|
| Navy (background) | `#14162B` | Every background. Dark theme only. |
| Lime (accent) | `#B7EE34` | Key words, CTA, progress, success states, cursor ring |
| On-accent text | `#08090C` | Text on lime buttons or chips |
| White | `#FFFFFF` | Main text |
| Muted | White at 60–70 % | Secondary text, captions |
- Lime is an accent: at most ~10–15 % of the frame. Never lime text on white.
- Status colors in the UI (Partial or Insufficient verdicts) come from Mockups v2. Don't invent new ones.

**Type**
- **Poppins** only: 600 for titles, 500 for UI labels, 400 for body and captions.
- 1920x1080: titles 72–96 px, on-screen text ≥ 44 px, captions ≥ 36 px.
  1080x1350: titles 80–104 px, text ≥ 48 px. Max ~7 words per text card.
- Text in the safe area: 6 % margin (1080p), and keep the bottom 12 % clear on 4:5 (X UI overlay).

**Motion language**
- Ease: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint) for entrances, and 0.25–0.45 s for UI moves.
- Signature moves: lime underline "draw-on" under key words, a soft push-in on the UI, a card that lifts and snaps, a lime check that draws itself, a counter tick for progress.
- Cursor: a white arrow with a lime ring that pulses on click, and a **click SFX on every click**.
- Transitions: mostly hard cuts on the beat, plus a masked wipe in lime for chapter changes. No spinning 3D, glitch or lens flares.
- The phone or desktop frame shows the real Mockups v2 screens (dark), rebuilt in code so they stay sharp.

**Sound**
- Royalty-free, soft, modern background music (lo-fi, minimal electronic or light piano), 90–110 BPM. Cut shots on the beat.
- A click SFX (short and soft) on every on-screen click, a subtle "success" chime on approval or payment, and a whoosh at most twice per video.
- Credits file with the source and license of every track and SFX.

---

## 3. Hard rules (every video)

1. **English only**: on-screen text, captions and VO (if any).
2. **No real app URL or domain** on screen or in captions. End card: logo + tagline + "@tryhyto" only.
3. **No real wallets, addresses, hashes, keys or amounts.** Use demo data only (section 6) and a small "Testnet demo" badge whenever balances or USDC appear.
4. **Don't name the AI model or any AI vendor.** The reviewer is **Laya**. Say "Laya reviews the photo". Laya **recommends**, the **organizer decides**. Laya never signs or moves money.
5. Soft royalty-free background music, plus a click sound on every on-screen click.
6. Formats: 1920x1080 master, plus a 1080x1350 variant for X (re-laid out, not just cropped).
7. Length **15–45 s**. **Hook in the first 2 s** (the outcome first, then how).
8. Subtitles or on-screen text always, so the video works muted. Also deliver an SRT.
9. No real people's faces or names unless Abdiel approves. Use role cards or initials.
10. Stay within the MVP (payments with escrow). Don't show features that don't exist (Luma, badges, Passport…).
11. Claims must match the product: Stellar **testnet**, Trustless Work **multi-release escrow**, **one task = one milestone**, and the milestone pays out in full.
12. Nothing is published before Abdiel approves it.

---

## 4. Ready-to-use video prompts

Each one works as the `JOB` block for the master prompt. Timings are for the 1920x1080 master. For the 4:5 variant, stack the UI above the text and use the same beat map.

### 02-volunteer-flow — "Snap it. Send it. Get paid." (30 s)
**Idea:** A volunteer finishes a task, takes the evidence photo in the app, and gets paid once it's approved.
**Hook:** A lime "Paid ✓" notification lands on the phone in frame 1.
**Music:** Soft lo-fi at 96 BPM. **SFX:** A click on each tap, a camera shutter on the capture, a chime on "Paid".

| Shot | Time | Visual / UI action | On-screen text | SFX |
|---|---|---|---|---|
| 1 | 0.0–2.0 | Phone push-in. A lime notification drops: "Milestone paid ✓" | **Volunteering that pays.** | chime |
| 2 | 2.0–6.0 | Rewind wipe to the "My tasks" list. Cursor taps the task "Set up registration desk" | Pick your task | click |
| 3 | 6.0–11.0 | The camera opens (live capture only, no gallery). Shutter, then the photo thumbnail snaps in | Take the photo, right there | click + shutter |
| 4 | 11.0–15.0 | Tap "Submit evidence". The card lifts and slides to "In review" | Send it in one tap | click, soft whoosh |
| 5 | 15.0–21.0 | "Laya is reviewing…" with a scan line over the photo, then the chip "Complete" draws in lime | Laya checks the evidence | tick |
| 6 | 21.0–26.0 | Split: the organizer's screen shows "Approve & pay". Click. Then the volunteer's phone shows "Paid · 20.00 USDC" with a "Testnet demo" badge | The organizer approves. You get paid. | click, chime |
| 7 | 26.0–30.0 | End card, navy: Hyto logo with the lime underline drawing on | **Prove your worth. Get paid.** @tryhyto | music tail |

### 03-organizer-approves — "Every payment, approved by you." (25 s)
**Idea:** The organizer's inbox. Evidence comes in, Laya recommends, and the organizer approves and pays from escrow.
**Hook:** A counter "3 tasks ready for review" ticks up at 0 s.
**Music:** Minimal electronic at 100 BPM. **SFX:** Clicks, a counter tick, a success chime.

| Shot | Time | Visual / UI action | On-screen text | SFX |
|---|---|---|---|---|
| 1 | 0.0–2.0 | Desktop inbox (dark). The badge counts 1→3 | **3 tasks ready for review** | ticks |
| 2 | 2.0–7.0 | Cursor opens "Registration desk · Alex R." Evidence photo on the left, criteria on the right | See the proof | click |
| 3 | 7.0–12.0 | The Laya panel shows the verdict "Complete" plus two short reasons that type on | Laya recommends | typing (very soft) |
| 4 | 12.0–17.0 | Push into the "Approve & pay" button. Click. A signing sheet slides up, then "Confirmed" | You decide. One click. | click, chime |
| 5 | 17.0–21.0 | The milestone row flips to "Released" and the budget bar fills in lime (demo figures, "Testnet demo" badge) | Paid from escrow, milestone by milestone | tick |
| 6 | 21.0–25.0 | End card | **Transparent spending for every event.** Hyto · @tryhyto | tail |

### 04-laya-reviews — "Meet Laya." (20 s)
**Idea:** Laya explains its three verdicts on the same kind of task.
**Hook:** A blurry photo gets a big "Insufficient" at 0 s. Then: "Laya tells you why."
**Music:** Light piano and pulse at 92 BPM. **SFX:** A soft scan hum, one tick per verdict.

| Shot | Time | Visual / UI action | On-screen text | SFX |
|---|---|---|---|---|
| 1 | 0.0–2.0 | A blurry photo with the chip "Insufficient" | **Blurry photo? Laya notices.** | tick |
| 2 | 2.0–5.0 | Title card. Laya's name draws on with a lime underline | Meet Laya, Hyto's evidence reviewer | whoosh |
| 3 | 5.0–9.0 | Three cards slide in: Complete / Partial / Insufficient, each with a sample photo | Three clear verdicts | 3 ticks |
| 4 | 9.0–14.0 | Zoom into "Partial". The reason types on: "Desk set up, signage missing" | Every verdict comes with a reason | soft typing |
| 5 | 14.0–17.0 | The card hands off to the organizer's cursor, which clicks "Approve" | Laya recommends. People decide. | click |
| 6 | 17.0–20.0 | End card | **Laya never moves money.** Hyto · @tryhyto | tail |
> Match the verdict labels to Mockups v2 before rendering.

### 05-escrow-stellar — "Budget locked. Paid by milestone." (35 s, explainer)
**Idea:** How the money works: a multi-release escrow by Trustless Work on Stellar testnet, told like a short explainer: one idea per shot, no jargon without a visual.
**Hook:** A lime lock snaps shut on a budget bar at 0 s.
**Music:** Minimal electronic at 104 BPM. **SFX:** A lock click, a segment "pop" per milestone, a chime on release.

| Shot | Time | Visual / UI action | On-screen text | SFX |
|---|---|---|---|---|
| 1 | 0.0–2.0 | A budget bar with a lock that snaps shut | **The budget is locked before day one.** | lock click |
| 2 | 2.0–8.0 | The bar splits into 3 segments labeled Task 1 / Task 2 / Reimbursement | Each task is a milestone | 3 pops |
| 3 | 8.0–14.0 | Diagram: Organizer → Escrow (Trustless Work) → Volunteer, with a "Stellar testnet" chip | Held in escrow on Stellar, powered by Trustless Work | whoosh |
| 4 | 14.0–21.0 | Segment 1 gets a photo → Laya "Complete" → organizer click → the segment flows to the volunteer | Proof → review → approval → release | click, chime |
| 5 | 21.0–27.0 | The other segments stay locked. A tooltip: "No approval, no release" | Nothing moves without approval | soft tick |
| 6 | 27.0–32.0 | The report card slides in: Budget vs. Spent, two bars (demo values, "Testnet demo") | A clear report when it's over | tick |
| 7 | 32.0–35.0 | End card with small "Built on Stellar · Trustless Work" text | **Prove your worth. Get paid.** @tryhyto | tail |
> Check partner logo usage rules before using their logos. Text names are the safe default.

### 06-team-hackathon — "Five people. One week. One product." (20 s)
**Idea:** The team behind Hyto at the Find Your Way hackathon by Tellus.
**Hook:** Five role cards slam in at 0 s, one per beat.
**Music:** Upbeat light electronic at 110 BPM. **SFX:** One "card snap" per beat.

| Shot | Time | Visual / UI action | On-screen text | SFX |
|---|---|---|---|---|
| 1 | 0.0–2.0 | 5 cards snap into a row (initials, no faces) | **Meet the team behind Hyto** | 5 snaps |
| 2 | 2.0–8.0 | Each card flips to show its lane: Design & brand · Escrow & wallet · Backend & Laya · Admin app · Volunteer app | Five lanes, one product | flips |
| 3 | 8.0–13.0 | Quick montage of Mockups v2 screens behind the cards (1 s each, cut on the beat) | Built in days, designed with care | cuts on beat |
| 4 | 13.0–17.0 | Title card with the hackathon name as text | Building at **Find Your Way** by Tellus | whoosh |
| 5 | 17.0–20.0 | End card | **Prove your worth. Get paid.** @tryhyto | tail |
> Confirm with Abdiel: first names or initials, and whether the hackathon's logo can be used.

### 07-deadline-oct5 — "Shipping by Oct 5." (15 s)
**Idea:** A countdown and progress post ahead of the submission deadline on **Oct 5**.
**Hook:** A big lime "Oct 5" at 0 s with a ticking clock.
**Music:** A driving pulse at 108 BPM. **SFX:** Ticks, clicks on the checklist, a final chime.

| Shot | Time | Visual / UI action | On-screen text | SFX |
|---|---|---|---|---|
| 1 | 0.0–2.0 | "Oct 5" slams in and a clock ring draws | **Submissions close Oct 5.** | tick |
| 2 | 2.0–9.0 | A checklist ticks item by item: Escrow ✓ · Photo evidence ✓ · Laya review ✓ · Organizer approval ✓ | Here's where Hyto stands | click per item |
| 3 | 9.0–12.0 | Fast 3-screen montage of the volunteer flow | Volunteer. Proof. Payment. | cuts |
| 4 | 12.0–15.0 | End card | **Prove your worth. Get paid.** Follow @tryhyto | chime |
> Only tick the items that really work that day. Ask Abdiel before publishing.

---

## 5. QA checklist (Motion runs this before delivery)

- [ ] The hook lands within 2 s, and the first frame works as a thumbnail.
- [ ] 15–45 s, both 1920x1080 and 1080x1350 rendered, no text outside the safe area.
- [ ] English only, and no typos (check every text card).
- [ ] No real URL, domain, wallet, address, hash or amount. The "Testnet demo" badge is there when money shows.
- [ ] No AI model or vendor name. The reviewer is called "Laya", and "Laya recommends, the organizer decides" holds.
- [ ] Colors are only navy `#14162B` / lime `#B7EE34` / `#08090C` / white. Poppins only.
- [ ] Text contrast is ≥ 4.5:1, and every text card stays on screen ≥ 1.2 s per 5 words.
- [ ] Music is royalty-free, sits under the text, and is licensed in credits. A click SFX is on every click frame (±1 frame).
- [ ] Cuts land on the beat. No transition longer than 0.5 s.
- [ ] Muted playback still tells the story (captions and SRT present).
- [ ] UI matches Mockups v2 (labels and states). No features outside the MVP.

## 6. Demo data (only these)

- Event: "ZEEK Community Meetup (demo)". Organizer: "Organizer · Demo". Volunteers: "Alex R.", "Sam T.", "Jo M." (fictional).
- Tasks: "Set up registration desk", "Photo coverage", "Reimbursement: snacks".
- Amounts: round demo values in USDC (e.g. 20.00 USDC), always with the "Testnet demo" badge. No real balances.
- Wallets or addresses: never shown. If one is unavoidable, use `GDEMO…XXXX`.

## 7. Where these techniques come from

These are community practices for code-driven video, collected in the research that came with this file: rich context plus a style file, 3 storyboard directions, a still per shot before animating, a code pipeline (Remotion / HyperFrames / HTML+GSAP → FFmpeg), a render-and-critique loop, audio as a separate pass synced to the beat map, and precise direction notes.
