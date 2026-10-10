const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const code = fs.readFileSync(
  path.join(__dirname, "irAE双锚点确定性拆分.js"),
  "utf8"
);
const context = {};
vm.createContext(context);
vm.runInContext(code, context, { filename: "irAE双锚点确定性拆分.js" });
assert.equal(typeof context.main, "function");

const twoEvents = context.main({
  adverse_events:
    "1. G4免疫检查点抑制剂相关1型糖尿病并糖尿病酮症酸中毒。\n" +
    "2. G3免疫相关间质性肺炎，灌洗液见革兰阴性杆菌，感染不能排除。",
  fallback_anchor_a: "",
  fallback_anchor_b: ""
});

assert.equal(twoEvents.anchor_a.startsWith("G4｜"), true);
assert.equal(twoEvents.anchor_b.startsWith("G3｜"), true);
assert.match(twoEvents.query_a, /免疫检查点抑制剂/);
assert.match(twoEvents.query_a, /G4/);
assert.match(twoEvents.query_a, /正式指南/);
assert.doesNotMatch(twoEvents.query_a, /感染鉴别与并行管理/);
assert.match(twoEvents.query_b, /肺炎|间质性肺病/);
assert.match(twoEvents.query_b, /感染鉴别与并行管理/);
assert.equal(twoEvents.needs_fallback, false);

const oneEvent = context.main({
  adverse_events: "仅发生G3免疫相关心肌炎；无第二项严重不良反应",
  fallback_anchor_a: "",
  fallback_anchor_b: ""
});
assert.equal(oneEvent.has_a, true);
assert.equal(oneEvent.has_b, false);
assert.equal(oneEvent.query_b, "");
assert.equal(oneEvent.needs_fallback, false);

const unresolved = context.main({
  adverse_events: "免疫相关葡萄膜炎，CTCAE三级",
  fallback_anchor_a: "",
  fallback_anchor_b: ""
});
assert.equal(unresolved.needs_fallback, true);
assert.equal(unresolved.fallback_max_calls, 1);

const afterFallback = context.main({
  adverse_events: "免疫相关葡萄膜炎，CTCAE三级",
  fallback_anchor_a: "G3｜葡萄膜炎",
  fallback_anchor_b: ""
});
assert.equal(afterFallback.fallback_applied, true);
assert.equal(afterFallback.needs_fallback, false);
assert.equal(afterFallback.anchor_a, "G3｜葡萄膜炎");
assert.match(afterFallback.query_a, /G3/);
assert.match(afterFallback.query_a, /葡萄膜炎/);
assert.match(afterFallback.query_a, /正式指南/);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      anchor_a: twoEvents.anchor_a,
      anchor_b: twoEvents.anchor_b,
      query_a: twoEvents.query_a,
      query_b: twoEvents.query_b,
      fallback_query: afterFallback.query_a
    },
    null,
    2
  )
);
