# iPhone Home Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home-screen Logo, featured case, and start action read as one naturally centered group on regular iPhone portrait screens.

**Architecture:** Add one narrow-screen override to the existing enhancement stylesheet. The override removes the action area's auto-expanding top margin only on iPhone-width screens at 700px or taller, while preserving the current short-screen and desktop rules.

**Tech Stack:** Static HTML, CSS media queries, in-app Browser viewport and DOM measurements.

## Global Constraints

- Main viewport: 390 × 844.
- Regression viewports: 393 × 852, 375 × 812, 390 × 667, and 1280 × 720.
- On regular iPhone viewports, button center must be 74%–79% of viewport height.
- Featured card to action-area gap must be 18–32px.
- Do not modify inner pages, case content, images, or interaction logic.

---

### Task 1: Center the iPhone Home Content Group

**Files:**
- Modify: `assets/lung-treatment-response.css`
- Modify: `index.html`
- Test: Browser DOM measurements at the five required viewports

**Interfaces:**
- Consumes: `.home-screen` flex layout and `.home-actions` action group from `index.html`.
- Produces: A narrow-screen CSS override for `.home-actions` with a normal top margin instead of `auto`.

- [ ] **Step 1: Run the failing layout measurement**

At 390 × 844, measure the bounding rectangles for `.home-header`, `.featured-case-section`, `.home-actions`, and `.home-actions .action-button`.

Expected before implementation: button center is about 84% and card-to-action gap is about 91px, which fails the 74%–79% and 18–32px targets.

- [ ] **Step 2: Add the minimal responsive override**

Append this rule after the existing tall-screen rule in `assets/lung-treatment-response.css`:

```css
@media (max-width: 559px) and (min-height: 700px) {
  .home-actions {
    margin-top: 0;
    margin-bottom: 0;
  }
}
```

Update the stylesheet query version in `index.html` from `v=20260814-6` to `v=20260814-7` so the offline browser loads the new CSS immediately.

- [ ] **Step 3: Run the target viewport verification**

At 390 × 844, verify:

```text
0.74 <= buttonCenter / viewportHeight <= 0.79
18 <= actionTop - cardBottom <= 32
document.scrollWidth == document.clientWidth
document.scrollHeight == document.clientHeight
```

- [ ] **Step 4: Run responsive regression checks**

Repeat visibility and overflow checks at 393 × 852, 375 × 812, 390 × 667, and 1280 × 720. The Logo, card, button, and disclaimer must remain visible; the desktop button must remain in the lower third.

- [ ] **Step 5: Run interaction and console checks**

Click “开始查房” and verify that the first lung-cancer case overview becomes visible. Confirm the browser console has no errors, return to the home screen, and save mobile and desktop screenshots outside the project.

- [ ] **Step 6: Commit the implementation**

```bash
git add Downloads/OncoRounds-H5-Offline-2026-08-14/assets/lung-treatment-response.css \
  Downloads/OncoRounds-H5-Offline-2026-08-14/index.html
git commit -m "fix: center iPhone home content"
```

