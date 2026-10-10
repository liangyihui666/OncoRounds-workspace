# Design QA — Home Mobile Layout

- Source visual truth: `/var/folders/w1/41_fpph576397n0xlfz3wcp40000gn/T/codex-clipboard-32feb6b6-d029-4ad8-ab93-2800b7e0bd50.png`
- Implementation screenshot: `/tmp/oncorounds-reference-layout-v8.jpg`
- Combined comparison: `/tmp/oncorounds-layout-comparison-v8.png`
- Viewport and state: 390 × 844 CSS pixels, home screen, no interaction state
- Source pixels: 390 × 844 RGB PNG
- Implementation pixels: 390 × 844 RGB JPEG
- Density normalization: 1 CSS pixel to 1 image pixel; no resize required

## Full-view comparison evidence

The combined comparison places the reference on the left and implementation on the right. The Logo lockup, recommended-case shell, lung artwork crop, case information panel, primary action, disclaimer, and decorative lower pattern occupy the same major regions. Measured implementation anchors are Logo top 104px, case section top 196px, action top 617px, and case-to-action gap 24px.

## Required fidelity surfaces

- Fonts and typography: The same application font stack, sizes, weights, line heights, wrapping, and copy are retained. No actionable mismatch is visible.
- Spacing and layout rhythm: Major vertical anchors match the selected reference. The mobile override now keeps 84px header offset, 24px section gaps, 68px Logo mark, and the original case-card proportions without a height-based compact mode.
- Colors and visual tokens: Existing background, violet CTA gradient, white glass surfaces, chips, shadows, and muted text colors match the reference.
- Image quality and asset fidelity: The implementation uses the same supplied Logo and lung cover assets as the reference. Crop, focal point, and scale match; the only visible quality difference is expected JPEG capture compression in the implementation evidence.
- Copy and content: Product name, English subtitle, recommendation label, case title, chips, description, CTA, and disclaimer match the reference.

## Findings

No actionable P0, P1, or P2 visual mismatches remain at the selected 390 × 844 viewport.

## Focused region comparison

A separate crop was not required because the combined 390 × 844 view renders the Logo, case typography, chips, CTA label, and disclaimer legibly at 1:1 density. All image assets are reused directly rather than approximated.

## Comparison history

1. Earlier responsive behavior applied a compact layout below 700px height: 52px Logo, 166px cover, card top 125px, and action top 513px.
2. The mobile override was changed to use the selected reference layout at every viewport height: 68px Logo, approximately 195px cover at 390px width, card top 196px, and action top 617px.
3. Post-fix 390 × 844 capture matches the reference anchors, and a 390 × 667 measurement confirms the same component sizes and y-positions are retained rather than compressed.

## Interaction and runtime checks

- Page identity and meaningful content rendered successfully.
- No framework error overlay was present.
- Browser console contained zero warnings or errors.
- The “开始查房” action opens the first ROS1 lung-cancer case overview.

final result: passed
