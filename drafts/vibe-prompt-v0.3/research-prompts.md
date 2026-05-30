# Vibe-Prompt v0.3 — grading capability research prompts

These two prompts kick off the v0.3 brainstorm: prompt A gathers research sources via Antigravity / a deep-research agent / NotebookLM's own search; prompt B synthesizes them into a notebook-shaped design brief.

**Workflow:**
1. Drop prompt A into Antigravity (or your research agent of choice). Returns source list (papers + blog posts + framework docs).
2. Upload returned sources + your Anthropic training notes into a NotebookLM notebook.
3. Drop prompt B into that notebook. Returns the synthesis report.
4. Report becomes the input for `/vibe-prompt:brainstorm` or whatever drives v0.3 design.

---

## Prompt A — Research gathering

```
# Research prompt: prompt grading methodologies for LLM evaluation systems

I'm designing a prompt-grading capability for an open-source plugin called vibe-prompt
(github.com/estevanhernandez-stack-ed/Vibe-Prompt) that audits + behaviorally tests
LLM prompts shipped in production apps. Today the plugin produces severity-tagged
findings (high/medium/low) but doesn't aggregate them into scores. v0.3 will add
scoring/grading.

Anthropic's training literature identifies three grader types: code graders
(programmatic), model graders (LLM-as-judge), and human graders (rubric-driven
manual review). The canonical Anthropic model-grader pattern returns JSON with
strengths, weaknesses, reasoning, and score — they specifically note that asking
for reasoning alongside the score prevents the model from defaulting to middling
6/10 scores.

Find me research documents that would inform the design of a production grading
system. Specifically:

## Source categories to gather

1. **LLM-as-Judge canonical work** — papers and posts that established the pattern:
   - Zheng et al. "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena"
   - Liu et al. "G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment"
   - AlpacaEval methodology
   - Anthropic's Constitutional AI framing for self-evaluation
   - Recent meta-analyses of LLM-judge reliability (2024-2026)

2. **Evaluator-drift / self-preference bias** — critical because the plugin runs
   Claude as judge against Gemini production outputs:
   - Papers documenting LLMs preferring their own outputs (Panickssery et al.
     "LLM Evaluators Recognize and Favor Their Own Generations" is the
     canonical one — find similar work)
   - Calibration techniques to correct for evaluator bias
   - Multi-judge ensemble approaches as bias mitigation
   - Counter-positions / defenses of single-judge methodology

3. **Production eval frameworks** — comparison of what's deployed today:
   - DeepEval (Confident AI), Promptfoo, OpenAI Evals, Anthropic Evals
   - Patronus AI, BrainTrust, Humanloop, Helicone
   - LangSmith / LangChain eval primitives
   - What each does well, where each falls short, design choices around scoring

4. **Code grader patterns** — programmatic check designs:
   - Schema-conformance checking patterns
   - Hallucination detection via fact-checkers
   - Readability + structural scoring (Flesch-Kincaid etc. adapted for LLM output)
   - Output safety / toxicity classifiers as graders

5. **Human-in-the-loop grading workflows**:
   - Rubric design literature (per-dimension scoring)
   - Inter-annotator agreement techniques (Cohen's kappa, Krippendorff's alpha)
   - Active learning loops for prompt iteration
   - When to escalate from model-grader to human-grader

6. **Composite scoring + regression tracking**:
   - Aggregating multi-dimensional grades into a single score
   - Regression scoring across prompt versions (v1 → v2 → v3 trends)
   - Statistical significance of score deltas (when is a score change real?)
   - Dashboards + reporting patterns for prompt-quality grades over time

## What to return

For each category, 3-7 sources (papers + blog posts + framework docs), each with:
- Title + author/org + year
- URL (stable preferred — arxiv, official blogs, official docs)
- 2-3 sentence summary of what it contributes to the grading question specifically
- Why it matters for the vibe-prompt:grade design

Skip: general LLM intro material, prompt engineering 101, anything pre-2023 unless
foundational (e.g., BLEU/ROUGE limitations as backdrop for LLM-judge emergence).

Bias toward: recent (2024-2026), production-grounded, evidence-backed. Where
multiple sources converge on a finding, surface that explicitly. Where they
disagree, name the disagreement so I can dig in.

Return as a markdown document I can save and upload to NotebookLM alongside
Anthropic's training notes.
```

---

## Prompt B — Report synthesis

```


```

---

## What to do with the report

When NotebookLM returns the synthesis report:

1. **Save it** to `drafts/vibe-prompt-v0.3/grading-research-synthesis.md` alongside this file
2. **It becomes the brainstorm seed** — like the Celestia3 cowpath was for v0.1+v0.2, this research synthesis is the cowpath for v0.3's design
3. **Section 8's "proposed design"** is the first-cut spec. Section 9's "open questions" feed the brainstorm gates.
4. From there, `/vibe-cartographer:scope` → `/vibe-cartographer:spec` → `/vibe-cartographer:checklist` → `/vibe-cartographer:build` is the natural Cart-driven path, OR continue with the superpowers brainstorming → writing-plans → subagent-driven flow that worked for v0.1 and v0.2.

The research synthesis ends up as the v0.3 equivalent of `process-notes.md` — evidence-grounded design rationale you can point back to when the v0.3 spec makes a choice that needs defending.
