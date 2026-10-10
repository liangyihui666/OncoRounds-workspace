# Design QA — 首页病例卡片轮播

- Source visual truth: `C:\Users\admin\AppData\Local\Temp\codex-clipboard-60d5ca79-62ce-4961-955c-3aace994c971.png`
- Implementation screenshot: `C:\Users\admin\Documents\ChatGPT\大查房\work\local-card-deck\home-card-deck-390x844.png`
- Combined comparison: `C:\Users\admin\Documents\ChatGPT\大查房\work\local-card-deck\card-deck-design-comparison.png`
- Viewport: 390 × 844 CSS px
- Source pixels: 663 × 475
- Implementation pixels: 390 × 844
- Density normalization: browser capture at CSS viewport density; implementation comparison crop is 390 × 475 and source is preserved at 663 × 475 inside one 1077 × 475 comparison canvas.
- State: ROS1 肺癌为当前卡片，食管癌与胃癌为左右相邻卡片。

## Full-view comparison evidence

The implementation preserves the existing OncoRounds mobile hierarchy and card proportions while adopting the source pattern: one centered foreground card, two partially exposed background cards, no arrows, and visible stacking depth. The active card is modestly smaller than the previous full-width card, leaving both neighboring cards discoverable without exposing a case count or a complete case list.

## Focused region comparison evidence

The combined comparison focuses on the carousel region because the reference image does not include the surrounding OncoRounds header, CTA, or mobile viewport. The reference and implementation both use a dominant centered card with clipped, slightly rotated side cards. The implementation intentionally retains medical imagery and the existing case-information overlay instead of copying the reference card's unrelated medication-question content.

## Required fidelity surfaces

- Fonts and typography: Existing OncoRounds Chinese type hierarchy is preserved. The active ROS1 title wraps to two balanced lines at 390 px without clipping; side-card text is secondary and partially obscured by design.
- Spacing and layout rhythm: Active card width is reduced to 78% of the carousel stage. Side cards remain visible on both sides, and the deck stays within the existing recommendation panel without horizontal overflow.
- Colors and visual tokens: Existing pale blue, white, violet, and navy tokens remain intact. Side cards use lower opacity to establish depth without introducing a new palette.
- Image quality and asset fidelity: Existing approved case images are reused at full source quality with `object-fit: cover`; no generated placeholders, CSS drawings, or replacement medical imagery were introduced.
- Copy and content: All existing case titles, disease tags, difficulty labels, summaries, and CTA copy are preserved. No case total, pagination fraction, or full case list is shown.

## Findings

- No actionable P0, P1, or P2 differences for the requested adaptation.
- P3: The side-card text is intentionally only partly readable at 390 px. This supports discoverability while keeping the active case dominant and does not block interaction.

## Primary interactions and runtime checks

- Clicking the right exposed card changes ROS1 lung cancer to the esophageal cancer case.
- The newly active card exposes ROS1 on the left and gastric cancer on the right.
- Touch-swipe switching is covered by the existing frontend interaction test.
- Browser console errors: none.
- Frontend tests: 23 passed.
- TypeScript and production build: passed.

## Comparison history

- Initial implementation introduced the centered card and two exposed side cards. The first comparison found no P0/P1/P2 mismatch against the user's structural reference, so no corrective visual iteration was required.

## Follow-up polish

- Optional P3 only: adjust side-card opacity after testing on a physical phone if clinicians prefer a stronger or quieter preview.

final result: passed
