# OncoRounds Home Vertical Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance the home screen vertically so its three content regions use the available phone viewport instead of clustering at the top.

**Architecture:** Keep the existing React markup and apply the change only through home-scoped CSS. Use a centered flex stack with responsive gaps and a small upward visual offset on regular/tall phones, while retaining a compact short-viewport override with safe scrolling.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, CSS, in-app Browser validation.

## Global Constraints

- Modify only home-screen layout rules in `src/styles.css`.
- Do not change component markup, copy, typography, colors, images, or inner-screen styles.
- Preserve `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` support.
- Final distributable location: `/Users/shaohui/Downloads/OncoRounds-H5`.

---

### Task 1: Rebalance the home content stack

**Files:**
- Modify: `src/styles.css:273-298`
- Modify: `src/styles.css:496-502`
- Modify: `src/styles.css:1467-1561`

**Interfaces:**
- Consumes: Existing `.home-screen`, `.home-header`, `.featured-case-section`, and `.home-actions` elements.
- Produces: A responsive vertical stack with unchanged DOM and behavior.

- [x] **Step 1: Run the live-render layout check and verify the baseline fails**

At 390×844, measure the bottom of `.home-actions`; the observed baseline is 617px with 227px unused below it. At 360×740, the observed baseline is 548px with 192px unused below it. These results fail the approved balanced-layout requirement.

- [x] **Step 2: Implement the minimal home-only CSS change**

Update `.home-screen` to center its children with responsive gaps and balanced block padding. Remove the fixed home-header height and the separate action margin that currently pack the sections together. In `@media (max-height: 760px)`, use compact gaps and a smaller vertical offset while preserving overflow scrolling.

- [x] **Step 3: Run the live-render layout check and verify the new geometry**

At 390×844 and 360×740, confirm `.home-actions` is lower than the recorded baseline, the entire action/disclaimer group remains inside the viewport, and the top/bottom whitespace retains a slight upward bias.

- [x] **Step 4: Verify interaction and regression safety**

Click `开始查房` and confirm the case overview opens. Run `pnpm exec vitest run`; expected result is all tests passing.

- [x] **Step 5: Build and refresh the distributable**

Run `pnpm build && cp -R dist/. .`; expected result is a successful Vite production build and refreshed root artifact files.
