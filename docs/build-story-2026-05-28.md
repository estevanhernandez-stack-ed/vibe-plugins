# Build story — vibe-plugins, 2026-05-28

> Generated 2026-05-29 by Vibe Insights build-story mode. Grounded in the repo's scoped
> session timeline, the 626 decision log, and git history. Coder voice. Nothing invented.

**A plugin went from nothing to four shipped versions, and the stable promotion that almost got buried under it.**

Yesterday was a marketplace day. Two builds landed on `vibe-plugins`, and one of them did not exist when the day started.

## vibe-iterate → v1.2.0 stable

The quiet one first. vibe-iterate got promoted v1.1.0 → v1.2.0 to stable (commit 11:54, merged via PR #2 at 13:26). The bump bundled horizon long-range mode and an evolve-iterate hygiene fix that mattered more than its size suggests: the Windows append path in the friction logger was corrupting its own serializer, producing escape artifacts in roughly 18% of friction entries. A logging bug that quietly poisons one in five of your own signal entries doesn't show up until you go to read the data and half of it is garbage. Fixed before the promotion, not after.

## vibe-prompt: 0 → 0.4.0 in a day

Then the real story. vibe-prompt did not exist on the marketplace at 14:00. By midnight it had shipped four times.

It started as a cowpath. A manual prompt-audit pattern worked out on Celestia3 (16 prompt sites, 8 personas, an F1-F7 taxonomy of smells) got crystallized into a plugin. **v0.1.0** shipped at 14:04 as a static prompt-auditor, and the tell that it was real: the plugin proved more accurate than the hand-run cowpath that birthed it.

**v0.2.0** (19:51) folded behavioral eval and radar in as step-commands instead of separate plugins. Concern-per-plugin discipline held. It earned its keep immediately: run cross-vendor on Celestia3, it caught a drift the in-session Claude baseline had refused, Gemini leaking a "Fellow Pilgrim" persona artifact. Cost to find it: $0.0002.

**v0.3.0** (21:32) added the grading layer (monotonic best-ever baseline regression tracking) and creative discovery, and upgraded the LLM-judge with the Anthropic SWRS pattern plus a swap-and-discard control for position bias. 21 commits, +1274/-54. The round-trip validated end to end on Celestia3 for $0.003 against a $2 ceiling. Neither user-reported production bug reproduced, because prod was likely running an older model.

**v0.4.0** bumped at 23:37 to close the day.

## The shape of it

One plugin already stable got a careful promotion; one went from a Celestia3 cowpath to four marketplace releases between lunch and midnight. The through-line is the same discipline in both: catch the poison before you ship (the 18% serializer bug, the cross-vendor persona leak), and let the artifact prove itself against the manual process it replaced. The Jest 30 bump (29.7 → 30.4) fits the pattern too: zero source changes, 228/228 green, because the test surface sat in the safe slice.

A day measured in versions, not commits.

— Este
