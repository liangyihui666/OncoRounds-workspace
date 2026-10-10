# OncoRounds H5 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the five approved OncoRounds H5 content and layout refinements as a rebuilt standalone artifact.

**Architecture:** Keep the existing React screen flow and data model. Make the content requirement explicit in case fixtures, remove the attribution UI at the component boundary, and solve responsive/ring issues in CSS without introducing dependencies.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS.

## Global Constraints

- Do not edit synced files under `sources/`.
- Final distributable location: `/Users/shaohui/Downloads/OncoRounds-H5`.
- Keep the three existing cases and the existing home-to-overview-to-round-to-summary flow.

---

### Task 1: Restore maintainable source and establish baseline

**Files:**
- Restore: `package.json`, TypeScript/Vite configuration, and `src/**` from the matching Git revision.
- Copy: existing brand and case images into `public/assets/**`.

- [ ] Restore text source from Git history and install dependencies with `pnpm install`.
- [ ] Run `pnpm test -- --run` and record the clean baseline.

### Task 2: Add content and component regression tests

**Files:**
- Modify: `src/data/cases.test.ts`
- Modify: `src/App.test.tsx`

- [ ] Require each case to contain exactly five questions.
- [ ] Require overview attribution text to be absent and summary ring to expose the complete state.
- [ ] Run targeted tests and confirm they fail for the missing behavior.

### Task 3: Implement content and UI changes

**Files:**
- Modify: `src/data/cases.ts`
- Modify: `src/components/CaseOverview.tsx`
- Modify: `src/components/Ui.tsx`
- Modify: `src/components/RoundSummary.tsx`
- Modify: `src/styles.css`

- [ ] Add one clinically grounded decision question to each case.
- [ ] Remove the overview attribution card and retain the case duration near the tabs.
- [ ] Render `OncoRounds` as the compact inner-page wordmark and scale it to the icon.
- [ ] Rebalance home spacing, card heights, and short-viewport behavior.
- [ ] Separate the score-ring base track from its progress layer and add an explicit complete state.
- [ ] Run targeted tests until green, then run the full test suite.

### Task 4: Build and validate the distributable

**Files:**
- Generate: `/Users/shaohui/Downloads/OncoRounds-H5/index.html`
- Generate: `/Users/shaohui/Downloads/OncoRounds-H5/assets/**`

- [ ] Run `pnpm build` and copy the built output into the supplied H5 folder while preserving only the generated artifact structure.
- [ ] Serve the output locally and run Browser checks at 390×844 and 360×740.
- [ ] Exercise overview, all five questions, and a 100% summary; verify visible state and console health.
