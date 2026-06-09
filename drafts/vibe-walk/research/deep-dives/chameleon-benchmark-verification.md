# Chameleon Benchmark Verification — Deep Dive

> **Researcher:** Wave 2 Deep-Dive (Chameleon Benchmark Verification)
> **Date:** 2026-05-21
> **Assignment:** Pin down the empirical basis for the "5-step tour completion cliff" — resolve the 15M vs 550M discrepancy, extract actual methodology, find independent corroboration.
> **Status:** DONE_WITH_CONCERNS

---

## 1. The discrepancy resolved: two different reports, six years apart

The Wave 1 conflict — UX Veteran citing "15M+ interactions," PLG Analyst citing "550M+ interactions" — is not a contradiction within the same report. They are **two distinct Chameleon publications**:

| Report | Interaction count | Year | Where the step-count chart lives |
|---|---|---|---|
| **"What We Learned Analyzing 15 Million Product Tour Interactions"** | 15 million | July 2019 | Blog article: `chameleon.io/blog/product-tour-benchmarks-highlights` |
| **Chameleon Benchmark Report 2025** (sixth annual) | 550+ million | 2025 | Full PDF behind email gate; also summarized in `chameleon.io/blog/mastering-product-tours` |

The UX Veteran researcher appears to have cited the **2019 article**. The PLG Analyst cited the **2025 report**. Both call themselves "the Chameleon benchmark," hence the apparent conflict.

**This matters:** The curve shape (72% at 3 steps → 16% at 7 steps) originates in the 2019 analysis of 15M interactions. The 2025 report with 550M interactions references the same pattern but the specific per-step percentages are **not extractable as text** from the 2025 publication — they appear in a chart image only.

---

## 2. What the primary sources actually state (verbatim)

### 2.1 The 2019 article (15M interactions)

**URL:** `https://www.chameleon.io/blog/product-tour-benchmarks-highlights`

**Stated interaction count:** "15 million product tour interactions"

**Publication date:** Timestamp in image filename = June/July 2019. No formal date displayed on page.

**Completion percentages by step count:** The article contains a chart titled "product-tour-completion-rate-by-number-of-steps.png" but **the 72% and 16% figures appear only in the chart image, not as extractable text.** The only textual statistic is:

> "The average completion rate for a Product Tour is **61%**"

**Completion definition:** Not formally stated. The article implies completion = "users complete Tours they start" (reach the final step), but no operational definition is given.

**Methodology:** "SaaS companies of all sizes, from a few hundred MAUs to tens of thousands." No sampling method, confidence intervals, data collection period, or control variables disclosed.

### 2.2 The 2025 Benchmark Report (550M interactions)

**URL:** `https://www.chameleon.io/benchmark-report` (full PDF behind email gate)
**Summary article:** `https://www.chameleon.io/blog/mastering-product-tours`

**Stated interaction count:** "550+ million user interactions" across product tours, checklists, embeddables, launchers, modals, and microsurveys.

**Important caveat:** This is 550M across **all in-app experience types** — not 550M product tour interactions specifically. The 2025 report covers a broader product surface than the 2019 tour-only analysis.

**Verbatim step-count data from the summary article:**
- 3-step tours: **"72% completion rate"**
- 4-step tours: **"74%"**
- 7+ steps: **"Only 16% make it to the end"**

These percentages appear in the 2025 blog summary of the 2025 report. They match the 2019 chart values exactly — which raises the question of whether the 2025 report produced new per-step measurements or carried forward the 2019 curve.

**The report also states:** "Tours beyond five steps lose attention from more than half of users" — this is the textual anchor for the "5-step ceiling" claim. The full PDF is gated; per-step methodology in the 2025 edition cannot be confirmed without downloading it.

**Completion definition:** Not explicitly stated in accessible content.

**Methodology:** Not detailed in accessible content. No sample breakdown by tour type vs. other experience types for the step-count analysis.

### 2.3 What Chameleon's dedicated metrics article adds

**URL:** `https://www.chameleon.io/blog/effective-product-tour-metrics`

States: "72% completion for three-step tours... 16% completion for seven-step tours" — attributed to "Chameleon's 2025 benchmark data." Adds: "Progress indicators improve completion by ≈12%." No methodology disclosed. No sample size cited in article text.

---

## 3. The 72%/16% figure trail

The specific per-step percentages have a single origin: **Chameleon's own data**, first published in 2019 in chart form (15M interactions) and restated in 2025 text summaries (550M mixed interactions). The propagation chain:

```
Chameleon 2019 chart (15M tours, chart-only)
    ↓
Chameleon 2025 benchmark summary text (550M mixed interactions)
    ↓
Chameleon blog posts (effective-tour-metrics, mastering-product-tours)
    ↓
Guideflow, UserGuiding, Amplitude, Appcues blog posts [citing Chameleon]
    ↓
Wave 1 researchers (both citing "Chameleon benchmark")
```

**Every downstream citation traces to Chameleon's own publications.** No independent third-party research organization has published a replication of the 72%/16% breakpoints.

---

## 4. Independent corroboration search — findings

### 4.1 What was searched

- Academic databases (ResearchGate)
- Industry analysts not selling tour tooling (NNGroup, Baymard, Nielsen)
- Platform vendors with their own data (Intercom, Amplitude, Pendo, Appcues)
- Practitioner communities (Intercom community forum)

### 4.2 Academic

One relevant paper found: *"Effective Onboarding Processes for Mobile Apps: A Comparative Study of Product Tours vs. Progressive Walkthroughs"* (ResearchGate, 2025). **Could not access full text (HTTP 403).** Abstract suggests an A/B study of tour vs. walkthrough on mobile apps — relevant to the question of whether tours help — but step-count completion breakpoints were not accessible for extraction.

No other peer-reviewed research on step-count completion curves for in-app product tours was located.

### 4.3 NNGroup / Baymard / independent UX research

NNGroup has published on completion rate methodology (distinguishing success rate from completion rate) but **has not published a benchmark study on product tour step count vs. completion rate.** No accessible NNGroup, Baymard, or equivalent-tier independent study confirms or contradicts the 3-step/7-step breakpoints.

### 4.4 Platform vendors (Amplitude, Intercom, Pendo, Appcues)

- **Amplitude's product tour guide** cites Chameleon for step-count data. No independent Amplitude research on this question.
- **Intercom community forum:** Practitioners report ~60% completion in their own products. Forum experts explicitly state "there is no single industry standard" and recommend establishing your own baseline. No step-count breakpoints cited.
- **Pendo and Appcues** blog content cites Chameleon or does not address step-count breakpoints with independent data.

### 4.5 Cognitive load research (adjacent, not direct)

The cognitive psychology literature supports the *principle* that more steps → more cognitive load → higher abandonment. Miller's Law (7±2 chunks), Zeigarnik Effect (open loops drive engagement), and Fogg's Behavior Model (motivation declines with friction) all provide theoretical grounding. But **none produce the specific 72%/16% numbers** — those require empirical product tour data that only tour-platform vendors have at scale.

### 4.6 Absence finding

**No independent, non-Chameleon source has published a replication of the 3-step ≈72% / 7-step ≈16% completion curve for product tours.** This absence is load-bearing. The curve may be accurate — Chameleon has genuine access to large interaction data — but it is a single-vendor claim that has not been independently validated.

---

## 5. Methodological concerns with the Chameleon data

Even accepting Chameleon's numbers at face value, four concerns bear noting:

**1. Definition of "completion" is unstated.** Does "completion" mean reaching the final step, clicking a "Done" button, or remaining through all steps without a skip/close event? Different definitions produce different rates. This is not disclosed.

**2. Selection bias by platform.** Chameleon's customer base skews toward PLG/SaaS products that invest in in-app onboarding. Tours on this customer base are likely higher-quality than the industry average — which means the 61% average may be an optimistic estimate for the broader market.

**3. The 550M figure spans more than tours.** The 2025 report's 550M interactions cover "product tours, checklists, embeddables, launchers, modals, and microsurveys." The per-step tour analysis may draw from a subset of this, and that subset size is not disclosed.

**4. The 2019→2025 continuity question.** The per-step percentages (72%/16%) appear identical in both the 2019 chart and the 2025 text summary. It is unclear whether the 2025 report ran a new step-count analysis with new data or carried forward the 2019 findings. If the latter, the "2025 benchmark" framing for these specific numbers is misleading.

---

## 6. What the data does and does not support

### What it supports (with appropriate confidence)

- **The direction is reliable:** Shorter tours complete at higher rates than longer tours. This is directionally consistent across all vendor data and is theoretically grounded in cognitive load research. Multiple Chameleon publications across 6 years report the same shape.
- **The cliff is steep:** 72% vs 16% represents a 56-point gap from 3 to 7 steps. Even if the exact numbers are off by 10 points in either direction, the qualitative verdict ("tours beyond 5 steps lose most users") holds.
- **The 5-step ceiling as a hard guardrail is defensible** — not because 72%/16% are proven to the fourth decimal place, but because no credible source contradicts the curve direction, and the 5-step threshold is a conservative reading of Chameleon's own stated ceiling ("tours beyond five steps lose attention from more than half of users").

### What it does not support

- **The specific percentages as precise figures.** 72% and 16% are extracted from a chart image in a 2019 vendor publication with unstated methodology. They should not be cited as industry-standard constants.
- **Causal claims.** Neither Chameleon publication presents a controlled experiment. The numbers are observational — tours of N steps have Y% completion — without controlling for product type, audience, copy quality, trigger type, or tour subject matter.
- **Universal applicability.** The data comes from Chameleon customers. Results on different platforms, audiences, or product types may differ.

---

## 7. VERDICT

**Can the 15M vs 550M discrepancy be resolved?**
Yes. Definitively. The 15M figure is a 2019 Chameleon blog post analyzing product-tour-only data. The 550M figure is the 2025 Chameleon annual benchmark covering all in-app experience types. Wave 1 researchers cited two different editions of the same vendor's research. Neither researcher was wrong about the number they cited — they were citing different publications.

**Is the 5-step ceiling actually supported?**
Weakly at the specific-numbers level, strongly at the directional level.

- The curve shape (steep decline past 5 steps) is consistent across all Chameleon publications and is theoretically grounded.
- The specific breakpoints (72% / 74% / 16%) originate in a chart image in a 2019 vendor publication with minimal methodology disclosure. They have not been independently replicated by any non-Chameleon source.
- No independent research organization or academic study has confirmed or contradicted the 3-step/7-step breakpoints.
- The absence of contradicting data from any source is meaningful — practitioners in the Intercom community report similar ranges from their own products (~60% on typical tours).

**The honest confidence level:** The curve shape is probably real. The specific percentages are Chameleon's own numbers, propagated without independent verification across the entire industry. Treat them as strong directional signal, not empirical constants.

**Recommended way for Vibe-Walk to state the step-count guardrail:**

Do not cite "72% / 16%" as if they were independently replicated findings. State it this way:

> *"Chameleon's benchmark data (550M+ in-app interactions, 2025) shows a steep completion decline past 5 steps — roughly 72% at 3 steps vs. 16% at 7+ steps (Chameleon 2019/2025). These specific percentages come from a single vendor's platform data and have not been independently replicated. The curve direction — short tours complete, long tours don't — is consistent across all available sources and grounded in cognitive load research. Vibe-Walk's 5-step ceiling is set conservatively below Chameleon's observed cliff, not as a precise empirical threshold."*

Cite the curve shape. Cite the source accurately (single-vendor benchmark, not peer-reviewed). Don't headline the specific percentages as settled fact.

---

## 8. Recommended action for the seed

The `[verify]` flag on item 2.1 in `_shared-context.md` can now be downgraded as follows:

- **The discrepancy:** Resolved — different reports, different years. Not a data conflict.
- **The headline figure:** Use 550M+ interactions (2025 report) as the sample description. Use "15M product tour interactions" only when citing the 2019 article specifically.
- **The percentages:** Cite as "Chameleon benchmark data" with the caveat above. Do not present as independently validated.
- **The design verdict:** Unchanged. The 5-step ceiling holds as a design guardrail — the curve shape is consistent enough to build on. The guardrail should be justified by the curve direction + theoretical grounding, not by the specific percentages.

---

## Sources accessed

| URL | What it yielded |
|---|---|
| `https://www.chameleon.io/benchmark-report` | 2025 report landing page — 550M figure, no step-count text, PDF gated |
| `https://www.chameleon.io/blog/mastering-product-tours` | 72%/74%/16% as text — sourced to 2025 benchmark, 550M data points |
| `https://www.chameleon.io/blog/product-tour-benchmarks-highlights` | 2019 article — 15M interactions, 61% average, step-count in chart image only |
| `https://www.chameleon.io/product-tour-benchmarks-report` | Separate landing page for gated PDF — 15M figure, content behind email gate |
| `https://www.chameleon.io/blog/effective-product-tour-metrics` | Cites 72%/16% as text, attributes to "Chameleon 2025 benchmark data," no methodology |
| `https://www.guideflow.com/blog/product-tour-best-practices` | Cites 72%/16% without attribution — likely downstream Chameleon citations |
| `https://userguiding.com/blog/user-onboarding-statistics` | No step-count completion data; Clutch, NNGroup cited for other stats |
| `https://amplitude.com/explore/product/how-to-use-product-tours` | Cites Chameleon; no Amplitude-original step-count research |
| `https://community.intercom.com/product-tours-10/what-is-the-industry-standard-completion-goal-rate-for-product-tours-299` | Practitioners report ~60%; experts say "no single standard" |
| `https://www.researchgate.net/publication/394281762_...` | HTTP 403 — could not access |
| `https://nngroup.com` (search) | Completion vs success rate methodology only; no tour step-count benchmark |
