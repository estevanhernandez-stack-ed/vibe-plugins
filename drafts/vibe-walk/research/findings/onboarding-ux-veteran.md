# Onboarding UX Veteran — Research Findings

> **Persona:** Onboarding UX Veteran
> **Lens:** First-run flows, spotlight tours, progressive disclosure, aha-moment sequencing, empty states, step count, trigger timing, skip/replay.
> **Date:** 2026-05-21
> **Depth:** DEEP
> **Grounding:** Chameleon 2025 Benchmark Report (15M+ interactions), Appcues, Userpilot, NNGroup, Guideflow, UserGuiding, and named product case studies.

---

## Q1 — Optimal step count and completion drop-off

**The ceiling is 5. The sweet spot is 3–4.**

Chameleon's 2025 benchmark, drawn from 15 million+ tour interactions, is the hardest data available:

- **3-step tours**: ~72% completion
- **5-step tours**: ~50%+ completion (still defensible)
- **7-step tours**: ~16% completion — functionally abandoned
- Tours beyond 5 steps: "completion nosedives sharply"; more than half of users disengage

Secondary confirmation: UserGuiding data shows 72% of users abandon apps during onboarding if it requires too many steps (combined tour + setup friction). Guideflow's 2026 best-practices guide independently confirms the 3/5/7 step-count breakpoints.

**Why the cliff at 5:** Each step is an interruption. Steps 1–3 feel like a commitment; steps 4–5 feel like bonus coverage. Step 6+ signals "this app doesn't respect my time" and triggers the habit of dismissal that bleeds into future tours and in-app messages.

**Named product ceiling references:**
- **Loom**: 5-step tour (pause, resume, edit, share, embed) — tight, stops before the cliff
- **Canva**: 4-step new-user flow (create → design surface → template → invite) — activation-focused, hits aha by step 2
- **Figma**: Drops users on a blank canvas with a 5-of-5 progress indicator — the progress badge itself is visible evidence that teams capping at 5 steps treat it as a UX contract, not just a preference
- **GoToWebinar**: Guided walkthrough to first scheduled webinar — Appcues reported 77% completion, attributed to directing users to a single high-value action rather than a feature survey

**`[unverified]`**: The 72% / 16% split is widely cited across multiple sources but traces back to a Chameleon benchmark — independent third-party study replication not found.

---

## Q2 — Aha moment sequencing: "aha first" vs "context first"

**The field has converged: get to the aha moment as fast as possible, but don't skip the one question that makes the aha land.**

The pure "context first" school (give users a feature map, then guide them to value) underperforms because generic feature tours create no emotional connection. Intercom's research — the most-cited data point in this space — shows products where users reach their first aha moment within **five minutes retain 3× more people after week one**. That's a retention multiplier for speed-to-value, not for completeness of orientation.

**The nuance:** "aha first" doesn't mean "skip all context." It means: *one question that personalizes the path, then the aha*. Airbnb shows listings before asking for any information — value before friction. Pinterest asks users to select five interests, then immediately delivers a personalized feed — the question IS the aha setup. Twilio asks developer vs non-developer, then routes to a relevant quickstart. In each case, the single question serves the aha rather than delaying it.

**The "context first" failure mode:** Showing a feature map (5+ tooltip stops covering the nav, sidebar, profile, settings, dashboard) before the user has done anything meaningful. Users complete the tour, close it, and still don't know why they opened the app. This is the Figma vs Notion contrast: Figma's blank canvas with a 3-item overlay gets users drawing in 30 seconds; an equivalent Notion "here is the sidebar, here is the database view, here is the template gallery" flow pre-dates the moment users could feel what Notion is for.

**Apps that got this right:**
- **Duolingo**: No tutorial. First interaction IS a language lesson. Users experience their aha (I just translated a sentence) within 10 clicks. No spotlight tour exists — the product IS the onboarding.
- **Canva**: Reverse trial exposes premium features immediately — aha is "I made something that looks professional without knowing design." Arrives within the first design attempt.
- **Grammarly**: Demo content pre-loaded with errors. Users fix them in the first 60 seconds — aha is "I can already see it catching mistakes I'd miss." Action → aha, no context preamble required.
- **Airbnb**: Listings before account creation. Value perceived before commitment. Aha ("I can actually stay in this place in Tokyo") precedes signup gate.

**What does NOT work:** Tours that sequence context → features → aha. By step 3 of a features tour, engagement is already declining. The aha needs to be the destination of step 1 or the direct payoff of step 2.

---

## Q3 — Empty states vs first-run spotlight tours: complementary or competing

**Complementary — but empty states are primary, spotlight tours are secondary.**

The UX consensus in 2025–2026 has shifted: empty states are the higher-leverage onboarding surface because users encounter them more frequently than any modal or tooltip overlay. If a product invests in only one onboarding surface, the empty state delivers higher ROI.

**How each pattern fires:**

| Trigger | Pattern | What it does |
|---|---|---|
| First login, no content yet | **Empty state** | Fills the void with a human-voiced call to first action — "Start your first project" / template suggestions / sample content |
| First login, existing content (or after a welcome modal) | **Spotlight tour** | Orients the user to a populated UI — "here's what this does" once there's something to point at |
| Day 3–7 re-engagement | **Feature tour or hotspot** | Contextual re-entry after user has real content to relate to |

**Empty state failure mode:** treating it as a technical state ("No data found") rather than an onboarding surface. Notion's blank page handles this correctly — it responds with the slash-command shortcut, template suggestions, and human-voiced prompt. An empty Notion page that just showed "No content yet" would be a missed onboarding opportunity on every single first interaction.

**Spotlight tour failure mode:** firing against an empty UI. A spotlight tour that says "Click here to see your projects" when the user has no projects yet is dissonant — the callout points at nothing. Tours should fire after the user has done the first action (created their first project, item, or record) so the spotlight points at real content. Celestia3's trigger model (tour gates after the welcome modal AND after the user has seen the aura canvas) follows this principle correctly.

**Apps that use each pattern well:**
- **Slack** (empty state): Uses empty channels and threads as guided prompts — "Start a conversation with your team." No spotlight tour fires on load; the empty state IS the onboarding. Tooltips appear contextually when users first navigate to a new feature area.
- **Notion** (empty state): Blank page responds with action prompts and template shortcuts. Templates function as scaffolded empty states — populated enough to show what's possible, blank enough to invite editing.
- **Figma** (spotlight + empty): Blank canvas overlay with 5 contextual tooltips — used once on new-file creation, not on load. The tour fires against the tool surface itself, which is always populated (by the canvas), not against data.
- **Intercom** (contextual tooltip hotspots): Uses pulsating hotspots on empty feature areas to indicate "this is where X happens when you have messages" — pointing at potential rather than current void.

---

## Q4 — Trigger patterns in the wild and overlay-sequencing rules

**Auto-once fires too early; user-triggered outperforms by 2–3×. The sequencing problem is real and underdocumented.**

**Trigger types observed:**

1. **Auto-on-first-login** (immediate, page load): Most common, lowest performing. Chameleon's data shows modals triggered at page load are outperformed by hover/click/behavior-based triggers. 38% of users close a page-load modal in under 4 seconds — faster than most people can read the headline.

2. **Auto-once + behavior gate**: Fires on first login only after user takes a qualifying action (navigates to a feature, creates first item, completes account setup). This is Celestia3's model — gates on the welcome modal being seen first. Significantly better timing alignment.

3. **User-triggered / on-demand only**: Best completion profile. Chameleon: self-triggered tours achieve "123% more completion" vs auto-launch. User-triggered tours outperform delayed or blanket-trigger by 2–3× (Guideflow 2026 data). Mechanism: user opted in, so intent to learn is already present.

4. **Day-N re-engagement tours**: Feature adoption follow-up sent at day 2–7 via in-app message or email linking back to a contextual tour. Most common in B2B tools (HubSpot's "You haven't tried reporting yet" sequences). [unverified] in pure B2C consumer context.

5. **New-feature-flag-gated tours**: Fire once for existing users when a new feature ships, gated to accounts that haven't touched the feature. Standard pattern in Pendo and Appcues deployments.

**Overlay sequencing — the rule that most products get wrong:**

NNGroup's "Overlay Overload" documents the stacking problem: real sessions on Magnolia, Best Buy, Local Eclectic, and Leesa.com showed users facing simultaneous privacy overlay + marketing modal + browser plugin popup + chat widget — all before interacting with any product content. The consequence is habitual dismissal: users develop a "mash X" reflex that then fires on any subsequent overlay including legitimate tour tooltips.

**Hard rules that emerge:**

- **One overlay per session until user interaction occurs.** Don't fire a tour while any modal (welcome, cookie, chat widget invitation) is still present or was dismissed less than 30 seconds ago.
- **Queue, don't stack.** If a welcome modal exists, the tour trigger must wait for modal dismissal AND a qualifying first interaction (not just modal close — that's still zero engagement).
- **Frequency cap across all overlay types.** Without this, a user on their first login can see: cookie consent → welcome modal → tour → chat bubble invitation → feedback prompt. Five overlays before they've done anything. Each one trains dismissal.
- **Auto-once-no-replay is the worst of both worlds.** Users who dismissed under 4 seconds (38%) never saw it; users who can't find it to replay can't recover. Always pair auto-once with a persistent replay path.

**Celestia3 model as reference:** gates the spotlight tour behind `hasSeenWelcome` state check, deferred to the app's existing onboarding-state system. This is correct sequencing — it ensures the tour fires after the flyby + welcome modal, not concurrent with them.

---

## Q5 — Copy voice for tour tooltips

**Benefit-led wins across B2C and B2B, but the mechanism differs. Directive and pure-descriptive both underperform.**

**The three voice registers:**

| Register | Example | When it works | When it fails |
|---|---|---|---|
| **Directive** | "Click the chart" | Zero-UI-literacy audience; first-time smartphone users | Any product where users know what clicking does — feels condescending; intermediate users disengage |
| **Descriptive** | "The chart shows your history" | Legacy enterprise tooling with specialized data | Users feel the tour explains the obvious; "I can see it's a chart" |
| **Benefit-led** | "See every move in context — this chart connects your actions to outcomes" | B2C consumer, productivity tools, PLG products | Can tip into marketing-speak if not grounded in a specific action |

**The field consensus:**

Guideflow's 2026 guide recommends: "Start your first project. This is where your team will track everything in one place" (benefit-led) vs "Click 'New Project' to create a project" (directive). The benefit-led version answers *why*, not just *what*. Body copy target: 15–25 words per step.

Appcues' copy guidance: "Read it aloud — does it sound like your brand or a tooltip factory?" The test for bad copy: does it sound like the instructions on a government form? If yes, rewrite.

**B2C vs B2B differences:**

- **B2C (Slack, Canva, Duolingo, Grammarly):** Warm, conversational, personality-forward. Slack's tooltips are "personable" — they read like a colleague pointing something out, not a manual entry. Typeform's onboarding modal copy is described as "welcoming enough to comfort even annoyed users."
- **B2B (HubSpot, Intercom, Pendo self-onboarding):** Authoritative and ROI-framed. Credibility over personality. "This report shows pipeline by stage — your team's primary forecast input." Less warmth, more precision.

**Named examples of copy quality:**

- **Grammarly**: Onboarding-by-doing sidesteps the copy problem entirely — users read the edits, not the tooltip. Where copy appears, it's brief and action-confirming ("You caught a passive voice issue"). No over-explanation.
- **Canva**: Tooltips use the benefit-adjacent register: "Your designs, fonts, and brand colors will live here" — not "This is the brand kit" and not "Click here to add fonts." Specific, personal, mild benefit frame.
- **Notion**: Copy is warm and self-aware ("A place for all your stuff"). Avoids instructional register entirely — closer to product marketing copy inside a tooltip than to a help article.
- **Figma**: Minimalist — tooltip body is a single sentence, no action directive. Trusts users to click. Benefit is implicit in pointing at the canvas tools.

**What to avoid:**

- Reading-level mismatch: a tooltip that says "Utilize the kanban-view affordance to manage workflow states" in a consumer task app assumes expertise that most users don't have.
- Over-prescription: "First, click the blue button. Then, type your project name. Then, press Enter." Directive stacking reads like condescension after step 1.
- Marketing copy in a tooltip: "Unlock the power of AI-driven insights!" in a small hovering tooltip produces instant eye-roll from anyone who has used software before.

---

## Q6 — Skip and replay handling

**Replay is universally under-surfaced. The users who most need it (skippers) are the ones least able to find it.**

**Skip behavior:**

- ~70% of users skip traditional imposed product tours (Guideflow, UserGuiding; both cite this figure; traces to Chameleon benchmark data)
- 38% of users close modals in under 4 seconds — faster than reading (Chameleon 2025)
- The skip population includes: experienced users who don't want a tour, impatient users who want to explore first, and users who dismissed accidentally. All three have different needs — a single "skip" UX serves none of them well.

**What skippers actually do:**

Most skippers do not return via replay. Lack of a visible, persistent replay path is the primary reason — not lack of interest. ProductFruits and Guideflow both document that "availability on demand via help menus recovers engagement from users whose timing wasn't aligned." One documented case: adding a replay button to the navbar produced a 20% increase in new user engagement with key features within the first week [source: Guideflow blog — [unverified] as to which specific product].

**Best-practice replay surface locations (observed in the wild):**

1. **Help menu / Resource center** (most common): "Take the tour again" as a persistent entry in the app's help icon dropdown. Seen in Intercom, HubSpot, and Pendo-powered products.
2. **Onboarding checklist** (common in B2B SaaS): "Complete your setup" checklist with a re-trigger link. Launcher-driven tours achieve ~67% completion (Chameleon 2025) — highest observed — because the user controls the moment.
3. **Persistent floating beacon**: Small pulsating dot near a feature the tour covered. Non-intrusive, contextual, re-triggerable. Grammarly uses hotspot-style beacons; Zest uses animated hotspots.
4. **Empty state re-surface**: When the user returns to a section that was covered in the tour, show a soft "Want a reminder of what this does?" prompt. Only fires once, not on every visit.

**Skip-and-return rate:** No published consumer B2C data found on what percentage of skippers return via replay. The only signal is the directional "replay availability increases engagement 20%" data point above, which is from a single unnamed case study. **`[unverified]`** as an industry-wide figure.

**The worst anti-pattern:** auto-once-no-replay. A user who dismissed within 4 seconds is locked out permanently. This is the most common implementation (shipped tour, no replay path) and the most damaging one — it guarantees that the fast-dismissal population (38%) never benefits from the tour at all.

**The second-worst anti-pattern:** replay buried in Settings > Account > Advanced. If a user has to hunt for it, it doesn't exist functionally.

---

## Patterns

1. **Five-step ceiling, three-step sweet spot.** Completion craters at 7 steps (16%). Top-1%-completing tours don't exceed 5. Build to 3–4, treat step 5 as a luxury, treat step 6 as a failure signal.

2. **Speed-to-aha is the primary retention lever.** Intercom data: users who hit their aha moment within 5 minutes retain 3× better after week 1. Every tour step that precedes the aha is a hurdle. Minimize them.

3. **User-triggered > auto-triggered, always.** Self-triggered tours outperform auto-launch by 2–3×. But: most apps can't fully control trigger timing at install; the fallback is to gate auto-once tours on a qualifying first action (not raw page load).

4. **Overlay sequencing matters more than overlay design.** Users who encounter multiple overlays before any product interaction develop a dismiss-everything reflex. Tours that fire into this reflex will be dismissed regardless of quality.

5. **Empty states are the highest-ROI onboarding surface.** More durable, more frequent, no overlay fatigue. Tours and empty states are complementary — empty states handle the first action; tours orient after the first action has been taken.

6. **Benefit-led copy, 15–25 words.** Directive copy condescends to anyone who knows how to use a mouse. Descriptive copy states the obvious. Benefit-led copy answers "why should I care right now" — which is the only question in the user's head at step 1.

7. **Skip is universal; replay recovery is not.** 70% skip rate is the realistic baseline. Tours without a persistent, zero-hunt replay path effectively don't exist for the 70% who dismiss them.

8. **Co-presence constraint (from Celestia3).** Tours can only spotlight elements present in the current view. A 6-stop tour that spans multiple routes requires either scoping to one view or orchestrating view-switches between steps. Default: scope to single view.

---

## Real named examples

| Product | Tour type | Key observable detail |
|---|---|---|
| **Duolingo** | No tour — action IS onboarding | First interaction is an interactive lesson. No spotlight overlay. Aha moment (I translated a sentence) within 10 clicks. |
| **Canva** | 4-step activation flow + reverse trial | Aha moment: "I made something professional." Arrives within first design attempt. No feature map preamble. |
| **Grammarly** | Demo content + 3-step tooltip | Pre-loaded demo errors. User fixes them in <60s. Aha via action, not description. No feature walkthrough. |
| **Figma** | 5-step canvas overlay (5-of-5 badge) | Fires on blank canvas, not against empty data. Tooltip body: 1 sentence. Trusts user to click. |
| **Slack** | Contextual tooltips (no linear tour) | Empty channels used as onboarding surface. Feature tooltips fire on first navigation to a new area, not on login. Personable copy. |
| **Notion** | Empty-state driven | Blank page prompt: slash-command shortcut + template suggestions. Warm copy. No explicit spotlight tour on first login. |
| **Airbnb** | Value-before-signup (no tour) | Shows listings before asking for account info. Aha (I can actually stay here) precedes signup gate. |
| **GoToWebinar** | Guided walkthrough to first scheduled webinar | 77% completion rate (Appcues case study). Single high-value action as destination — not a feature survey. |
| **Loom** | 5-step tooltip sequence | Core recording actions (pause, resume, edit, share, embed). Tight, sub-cliff. Redirects to knowledge base after step 5. |
| **HubSpot** | Onboarding checklist + feature tours | Launcher-model: user controls timing. Checklist completion drives ~67% tour completion. |
| **Typeform** | Welcome modal with warm copy | Copy tone: "welcoming enough to comfort even annoyed users." Sets tone before any feature exposure. |
| **Intercom** | Contextual hotspot beacons | Pulsating dots on empty feature areas. Opt-in engagement. Replay via resource center. |
| **Magnolia / Best Buy** | Anti-pattern: stacked overlays | NNGroup "Overlay Overload" case studies: privacy + marketing + chat overlays before first product interaction. Habitual dismiss reflex result. |

---

## What works

1. **3–5 step hard cap.** Tours at 3 steps hit 72% completion; at 7 steps it's 16%. The number is not aesthetic — it's the boundary of user patience for an unsolicited interruption. (Source: Chameleon 2025 benchmark, 15M+ interactions)

2. **Aha-first sequencing.** Route the user to the product's core value action in step 1 or 2, not after a context tour. Duolingo (first lesson immediately), Grammarly (demo content to edit), Airbnb (listings before signup) all front-load the value moment. Retention multiplier: 3× at week 1 for users who hit aha within 5 minutes (Intercom data).

3. **User-triggered or behavior-gated auto-once.** User-triggered tours outperform blanket auto-launch by 2–3× on completion. If auto-once is required, gate on a qualifying first action (not raw page load). Celestia3's gate-behind-`hasSeenWelcome` is the minimum viable implementation.

4. **Progress indicator.** Visible step progress (e.g., "3 of 5") increases completion by 12% (Chameleon 2025). It changes "when does this end?" to "two more to go."

5. **Benefit-led copy at 15–25 words.** "This is where your team tracks everything" outperforms "Click New Project" because it answers *why* before *what*. (Guideflow 2026 guidance, seconded by Appcues copy framework)

6. **Persistent, zero-hunt replay.** Help menu entry, persistent checklist, or resource center link. One unnamed case study: adding a navbar replay button drove +20% engagement with key features in the first week. (Guideflow blog — [unverified] product name)

7. **Empty states as primary onboarding surface.** Slack, Notion, and Figma all use empty states or blank-canvas states as their first onboarding moment — before or instead of a spotlight tour. Interactive walkthroughs that require real user action cut time-to-value by 40% vs passive tours [unverified source].

8. **Single-view scoping.** Tours scoped to one view eliminate the co-presence failure mode. View-switching between steps is a real feature with real complexity — don't ship it accidentally.

---

## What fails

1. **Tours longer than 5 steps.** 84% drop from 72% (3-step completion) to 16% (7-step). Every step added past 5 is a bet against the user's patience. (Chameleon 2025)

2. **Auto-fire on page load with no behavior gate.** 38% of users close page-load modals in under 4 seconds — before reading the headline. A tour fired at raw page load will be dismissed by a third of users before they see step 1.

3. **Overlay stacking.** Cookie consent + welcome modal + product tour + chat widget invitation on a single first session trains the habitual dismiss reflex. NNGroup's Overlay Overload documents this in detail for Magnolia, Best Buy, Local Eclectic, Leesa.com. The reflex bleeds into future tours.

4. **Firing a tour against an empty UI.** Spotlighting a "Your projects will appear here" panel when the user has zero projects is cognitively dissonant — the callout points at nothing. Tour fires after first action creates content the tour can point at.

5. **Auto-once-no-replay.** Locks out the 38% who dismissed too fast. No recovery path. The modal might as well not exist for that population.

6. **Directive copy.** "Click the blue button" for any product targeting anyone with prior software experience. Reads as condescension; disengagement begins at step 2.

7. **Feature-survey tours.** Touring every feature in sequence (sidebar, nav, profile, settings, charts, export, collaboration) with no throughline is not onboarding — it's a spec sheet with pictures. Users complete it without remembering a single stop. No aha moment is reachable via enumeration.

8. **Aha buried at step N.** Tours that front-load context (what every button does) and save the aha for step 5 or 6 guarantee that only the fraction of users who reached step 5 experienced the value proposition. By then, completion is already degraded.

---

## Implications for Vibe-Walk

1. **Hard-code a 5-stop ceiling in the Phase 2 build step.** The 3–5 range is not a style preference — it's a completion-rate boundary. Default the generated tour to 3–4 stops. Expose a `max_steps: 5` config option. Document the completion data as justification in the generated spec. Do not generate 8-stop or 10-stop tours even if the user asks for comprehensive coverage.

2. **Phase 1 should identify the aha-moment candidate explicitly.** The UI-surface inventory should produce a ranked list where stop #1 is labeled "candidate aha moment" — the surface where a new user first experiences the product's core value, not the most complex feature. The tour must route to this stop by step 1 or 2.

3. **Phase 1 must detect existing onboarding surfaces before building (already in the cowpath — reinforce this).** Slack-style contextual tooltips, Notion-style empty states, and any welcome modal all compete for the same user attention window. If the app already uses empty states as onboarding, a spotlight tour may be redundant or harmful. Phase 1 step 7 (detect existing onboarding) must explicitly check for empty-state copy and contextual tooltip patterns, not just explicit tour code.

4. **The Phase 1.5 trigger interview must include an overlay-sequencing gate.** The question is not just "auto-once or on-demand" — it's "what other overlays fire in the same session, and what is the sequencing rule?" If the host app has a welcome modal, cookie consent, or chat widget, the tour trigger must be gated after all of those. The interview should ask: "What other modals or banners fire on first login?" and surface a sequencing recommendation.

5. **Generate a persistent replay surface, always.** The generated tour module should include a replay entry point as a non-optional output. Minimum viable: a line in the component that registers a `startTour()` function to `window.vibeWalk.replay` so the host can wire it to a help menu or settings item. Auto-once-no-replay must not be a Vibe-Walk default.

6. **Copy template must default to benefit-led, 15–25 words.** The Phase 2 step-description generator should produce tooltip body copy in the format: "[Action or surface name]. [One sentence: why this matters right now for the user.]" Directive copy ("Click here to do X") should be flagged as a low-quality output if it appears without a benefit clause.

7. **Empty-state detection should influence the tour-or-not decision.** If Phase 1 finds that the app's primary surfaces are data-driven (projects list, message thread, file list) and those surfaces are currently empty for new users, Vibe-Walk should recommend empty-state enhancements as the higher-ROI onboarding investment *before* or *instead of* a spotlight tour — and include this as a Phase 1 verdict option alongside "build tour," "build tour after anchor injection," and "do not build."

8. **Scope tours to a single view by default (co-presence rule).** Multi-view tours require explicit opt-in and a warning in the Phase 2 spec that view-switching between stops adds complexity and a co-presence failure risk. The default output is a single-view, 3–5 stop tour. Cross-view orchestration is a v2 feature.

9. **Flag overlay-stacking risk as a Phase 1 output signal.** If Phase 1 detects a welcome modal, an onboarding checklist, a cookie consent banner, AND a chat widget all present, Vibe-Walk should emit a risk flag: "High overlay density detected — tour completion risk elevated. Recommend deferring tour auto-trigger until after first meaningful user action (not just modal dismissal)."
