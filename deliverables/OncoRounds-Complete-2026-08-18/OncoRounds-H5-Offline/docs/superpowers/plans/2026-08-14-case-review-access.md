# Case Review Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the lung response image into the case summary, add an in-round case review overlay that preserves answer state, and enlarge the evidence text.

**Architecture:** Extend the existing DOM enhancement script rather than modifying the minified React bundle. Cache each case's rendered summary and timeline before the round starts, clone those nodes into a modal review layer, and keep all styling in the existing enhancement stylesheet.

**Tech Stack:** Static HTML, browser DOM APIs, CSS, Node.js built-in test runner, Codex in-app browser.

## Global Constraints

- Do not change the React question reducer or reset answer state.
- The review layer must expose both “病例摘要” and “病程轴”.
- The lung response image appears only in the summary.
- Evidence text computes to 11px.
- Keep source assets and `dist/client/assets` identical.

---

### Task 1: Regression contract

**Files:**
- Create: `tests/case-review-enhancements.test.mjs`
- Test: `assets/lung-treatment-response.js`
- Test: `assets/lung-treatment-response.css`

**Interfaces:**
- Consumes: enhancement script and stylesheet as UTF-8 text.
- Produces: a repeatable contract test for required selectors, controls, and typography.

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../assets/lung-treatment-response.js", import.meta.url), "utf8");
const css = await readFile(new URL("../assets/lung-treatment-response.css", import.meta.url), "utf8");

test("moves the lung response card into the summary", () => {
  assert.match(js, /summary-list/);
  assert.doesNotMatch(js, /append\(card\).*timeline/s);
});

test("adds an in-round case review dialog with both tabs", () => {
  assert.match(js, /case-review-trigger/);
  assert.match(js, /case-review-layer/);
  assert.match(js, /病例摘要/);
  assert.match(js, /病程轴/);
});

test("enlarges evidence text to 11px", () => {
  assert.match(css, /\.evidence-line\s*\{[^}]*font-size:\s*11px/s);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/case-review-enhancements.test.mjs`

Expected: failures for missing review selectors and 11px evidence text.

### Task 2: Case-content cache and review layer

**Files:**
- Modify: `assets/lung-treatment-response.js`

**Interfaces:**
- Consumes: `.overview-screen`, `.summary-list`, `.timeline`, `.round-header`, and “开始模拟查房”.
- Produces: `cacheVisibleOverview()`, `captureMissingTabBeforeRound()`, `ensureReviewTrigger()`, `openReviewLayer()`, and `closeReviewLayer()`.

- [ ] **Step 1: Move the response card target**

Change the insertion target from `section.timeline[aria-label="病程轴"]` to `.summary-list[aria-label="病例摘要"]` and append the card there.

- [ ] **Step 2: Cache both case tabs before starting a round**

Store cloned summary/timeline nodes in a `Map` keyed by the case title. On a capturing click listener for “开始模拟查房”, briefly switch to the missing tab, cache it, then re-dispatch the start click once.

- [ ] **Step 3: Add the round review trigger and modal**

Replace the round header live dot with a `.case-review-trigger` button. Open a `.case-review-layer[role="dialog"]` containing “病例摘要 / 病程轴” tabs and cloned cached content. Close on “返回答题” or Escape and restore trigger focus.

### Task 3: Styles and deployable asset sync

**Files:**
- Modify: `assets/lung-treatment-response.css`
- Modify: `dist/client/assets/lung-treatment-response.js`
- Modify: `dist/client/assets/lung-treatment-response.css`

**Interfaces:**
- Consumes: DOM classes created by Task 2.
- Produces: mobile-safe dialog layout, header trigger styling, summary image layout, and 11px evidence typography.

- [ ] **Step 1: Add component styles**

Set the response card margin to `0`, style the trigger and fixed review layer, reuse the existing tab/card styles, and add `.evidence-line { font-size: 11px; line-height: 1.55; }`.

- [ ] **Step 2: Sync deployable assets**

Run: `cp assets/lung-treatment-response.js dist/client/assets/lung-treatment-response.js && cp assets/lung-treatment-response.css dist/client/assets/lung-treatment-response.css`

- [ ] **Step 3: Run tests**

Run: `node --test tests/case-review-enhancements.test.mjs && cmp -s assets/lung-treatment-response.js dist/client/assets/lung-treatment-response.js && cmp -s assets/lung-treatment-response.css dist/client/assets/lung-treatment-response.css`

Expected: all tests pass and both comparisons exit 0.

### Task 4: Browser verification and publication

**Files:**
- Verify: `http://127.0.0.1:4173/`
- Publish: current Sites project in `.openai/hosting.json`

**Interfaces:**
- Consumes: the validated static bundle.
- Produces: a verified and deployed team site.

- [ ] **Step 1: Verify the target flow at 390×844**

Flow: home → lung case → confirm response image in summary and absent from timeline → start round → select an answer → open case review → switch tabs → close → confirm question and selection are unchanged → submit → confirm evidence is 11px.

- [ ] **Step 2: Check console and visual layout**

Require no relevant warnings/errors, no horizontal overflow, and visible trigger/Tab/close controls.

- [ ] **Step 3: Commit, save a Sites version, deploy, and poll**

Commit the validated source, push the exact commit to the Sites source repository, package it with `package-site.sh`, save one version, deploy to the existing shared access, and poll until `succeeded`.
