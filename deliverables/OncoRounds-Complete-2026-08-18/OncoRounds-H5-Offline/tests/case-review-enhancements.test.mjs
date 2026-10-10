import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(
  new URL("../assets/lung-treatment-response.js", import.meta.url),
  "utf8",
);
const css = await readFile(
  new URL("../assets/lung-treatment-response.css", import.meta.url),
  "utf8",
);

test("moves the lung response card into the summary", () => {
  assert.match(js, /summary-list/);
  assert.match(js, /summary\.append\(card\)/);
  assert.doesNotMatch(js, /timeline\.append\(card\)/);
});

test("adds an in-round case review dialog with both tabs", () => {
  assert.match(js, /case-review-trigger/);
  assert.match(js, /case-review-layer/);
  assert.match(js, /病例摘要/);
  assert.match(js, /病程轴/);
});

test("labels the in-round review trigger clearly", () => {
  assert.match(js, /trigger\.textContent = "回顾病例资料"/);
});

test("does not intercept the start-round click", () => {
  assert.doesNotMatch(js, /captureMissingTabBeforeRound/);
  assert.doesNotMatch(js, /stopImmediatePropagation/);
  assert.doesNotMatch(js, /addEventListener\("click",[^\n]+true\)/);
});

test("enlarges evidence text to 11px", () => {
  assert.match(css, /\.evidence-line\s*\{[^}]*font-size:\s*11px/s);
});
