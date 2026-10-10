# OncoRounds H5 Polish Design

## Scope

Polish the supplied OncoRounds H5 without changing its core flow or visual identity.

## Approved changes

- Remove the doctor and hospital attribution card from the case overview.
- Keep exactly five teaching questions for each of the three built-in cases.
- Rebalance the home screen so the primary action and disclaimer remain usable at 360×740 while the 390×844 layout stays spacious.
- Increase the compact inner-page `OncoRounds` wordmark so it is visually balanced with the 38px logo.
- Rebuild the summary score ring as a complete base track with an independent blue-violet-to-teal progress layer. At 100%, the progress layer must render a closed circle with no apparent quarter gap.

## Implementation approach

Restore the corresponding React/Vite source from the project's Git history into the editable project mirror, add regression tests first, apply the smallest component/data/CSS changes, then rebuild the distributable H5 into `/Users/shaohui/Downloads/OncoRounds-H5`.

## Validation

- Vitest verifies three cases, exactly five questions per case, hidden attribution, and a complete-ring state hook.
- TypeScript and Vite production build complete without errors.
- Browser QA covers the home screen at 390×844 and 360×740, the case overview, the fifth-question flow, and the 100% summary state, with console inspection.
