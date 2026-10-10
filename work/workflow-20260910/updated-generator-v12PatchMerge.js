function main(inputs) {
  const source = inputs && typeof inputs === "object" ? inputs : {};
  let EXPECTED_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5"];
  const REPAIR_TASK_KEYS = ["target_ids", "code", "fields", "message"];
  const ROOT_ONLY_FIELDS = new Set([
    "schema_version",
    "generation_status",
    "case_summary",
    "question_count",
    "questions",
    "difficulty",
    "missing_information",
    "risk_message",
    "evidence_pool"
  ]);
  const errors = [];

  function hasOwn(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  }

  function nonEmptyString(value) {
    return typeof value === "string" && Boolean(value.trim());
  }

  function duplicateRootKeys(text) {
    let cursor = skipWhitespace(text, 0);
    if (text[cursor] !== "{") return [];
    cursor += 1;
    const seen = new Set();
    const duplicates = new Set();

    while (cursor < text.length) {
      cursor = skipWhitespace(text, cursor);
      if (text[cursor] === "}") break;
      if (text[cursor] !== '"') return [];
      const keyEnd = readStringEnd(text, cursor);
      if (keyEnd < 0) return [];
      let key;
      try {
        key = JSON.parse(text.slice(cursor, keyEnd));
      } catch (_) {
        return [];
      }
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
      cursor = skipWhitespace(text, keyEnd);
      if (text[cursor] !== ":") return [];
      cursor = skipWhitespace(text, cursor + 1);
      const valueEnd = scanValueEnd(text, cursor);
      if (valueEnd <= cursor) return [];
      cursor = skipWhitespace(text, valueEnd);
      if (text[cursor] === ",") {
        cursor += 1;
        continue;
      }
      if (text[cursor] === "}") break;
      return [];
    }
    return Array.from(duplicates).sort();
  }

  function parseObject(value, label, allowInvalid) {
    const raw =
      typeof value === "string"
        ? value
        : value && typeof value === "object"
          ? JSON.stringify(value)
          : "";
    if (!raw.trim()) {
      if (!allowInvalid) errors.push(`${label}为空或不是JSON对象/字符串`);
      return { parsed: null, raw, valid: false };
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        if (!allowInvalid) errors.push(`${label}根值必须是JSON对象`);
        return { parsed: null, raw, valid: false };
      }
      const duplicates = duplicateRootKeys(raw);
      if (duplicates.length > 0) {
        if (!allowInvalid) {
          errors.push(`${label}根对象存在重复键：${duplicates.join("、")}`);
        }
        return { parsed: null, raw, valid: false };
      }
      return { parsed, raw, valid: true };
    } catch (error) {
      if (!allowInvalid) {
        errors.push(
          `${label}不能被JSON.parse直接解析：${String(
            error && error.message ? error.message : error
          )}`
        );
      }
      return { parsed: null, raw, valid: false };
    }
  }

  function parseArrayMaybe(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function canonical(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }

  function semanticEqual(left, right) {
    return canonical(left) === canonical(right);
  }

  function readStringEnd(text, start) {
    let escaped = false;
    for (let index = start + 1; index < text.length; index++) {
      const char = text[index];
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        return index + 1;
      }
    }
    return -1;
  }

  function skipWhitespace(text, index) {
    let cursor = index;
    while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
    return cursor;
  }

  function scanValueEnd(text, start) {
    const first = text[start];
    if (first === '"') return readStringEnd(text, start);
    if (first !== "{" && first !== "[") {
      let cursor = start;
      while (
        cursor < text.length &&
        text[cursor] !== "," &&
        text[cursor] !== "]" &&
        text[cursor] !== "}"
      ) {
        cursor += 1;
      }
      return cursor;
    }

    let objectDepth = 0;
    let arrayDepth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === "{") objectDepth += 1;
      else if (char === "}") objectDepth -= 1;
      else if (char === "[") arrayDepth += 1;
      else if (char === "]") arrayDepth -= 1;
      if (objectDepth === 0 && arrayDepth === 0) return index + 1;
    }
    return -1;
  }

  function findRootArray(text, propertyName) {
    let objectDepth = 0;
    let arrayDepth = 0;
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (char === '"') {
        const end = readStringEnd(text, index);
        if (end < 0) return null;
        if (objectDepth === 1 && arrayDepth === 0) {
          let key = "";
          try {
            key = JSON.parse(text.slice(index, end));
          } catch (_) {
            return null;
          }
          if (key === propertyName) {
            let cursor = skipWhitespace(text, end);
            if (text[cursor] === ":") {
              cursor = skipWhitespace(text, cursor + 1);
              if (text[cursor] === "[") {
                const arrayEnd = scanValueEnd(text, cursor);
                return arrayEnd > cursor
                  ? { start: cursor, end: arrayEnd }
                  : null;
              }
            }
          }
        }
        index = end - 1;
        continue;
      }
      if (char === "{") objectDepth += 1;
      else if (char === "}") objectDepth -= 1;
      else if (char === "[") arrayDepth += 1;
      else if (char === "]") arrayDepth -= 1;
    }
    return null;
  }

  function extractArrayElements(text, propertyName) {
    const span = findRootArray(text, propertyName);
    if (!span) return { span: null, elements: [] };
    const elements = [];
    let cursor = span.start + 1;
    while (cursor < span.end - 1) {
      cursor = skipWhitespace(text, cursor);
      if (text[cursor] === ",") {
        cursor += 1;
        continue;
      }
      if (cursor >= span.end - 1 || text[cursor] === "]") break;
      const end = scanValueEnd(text, cursor);
      if (end <= cursor) return { span, elements: [], invalid: true };
      const raw = text.slice(cursor, end);
      try {
        elements.push({ start: cursor, end, raw, value: JSON.parse(raw) });
      } catch (_) {
        return { span, elements: [], invalid: true };
      }
      cursor = end;
    }
    return { span, elements, invalid: false };
  }

  function normalizeTasks(packet) {
    if (!hasOwn(packet, "repair_tasks") || !Array.isArray(packet.repair_tasks)) {
      errors.push("repair_packet.repair_tasks必须为数组，且不得从旧字段或字符串回退");
      return [];
    }

    const tasks = [];
    const seen = new Set();
    for (const task of packet.repair_tasks) {
      if (!task || typeof task !== "object" || Array.isArray(task)) {
        errors.push("repair_tasks中的每一项都必须是对象");
        continue;
      }
      const keys = Object.keys(task).sort();
      const expectedKeys = [...REPAIR_TASK_KEYS].sort();
      if (!semanticEqual(keys, expectedKeys)) {
        errors.push(
          `repair_task只能含target_ids、code、fields、message四字段：${JSON.stringify(
            task
          )}`
        );
        continue;
      }
      if (
        !Array.isArray(task.target_ids) ||
        task.target_ids.some((id) => typeof id !== "string" || !/^Q[1-5]$/.test(id)) ||
        new Set(task.target_ids).size !== task.target_ids.length
      ) {
        errors.push(`repair_task ${String(task.code || "")} 的target_ids无效`);
        continue;
      }
      if (!nonEmptyString(task.code) || !/^[A-Z][A-Z0-9_]*$/.test(task.code)) {
        errors.push("repair_task.code必须为非空大写英文错误码");
        continue;
      }
      if (
        !Array.isArray(task.fields) ||
        task.fields.length === 0 ||
        task.fields.some((field) => !nonEmptyString(field))
      ) {
        errors.push(`repair_task ${task.code} 的fields必须为非空字符串数组`);
        continue;
      }
      if (!nonEmptyString(task.message)) {
        errors.push(`repair_task ${task.code} 的message必须非空`);
        continue;
      }
      const normalized = {
        target_ids: [...task.target_ids],
        code: task.code,
        fields: [...task.fields],
        message: task.message
      };
      const key = canonical(normalized);
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push(normalized);
    }
    if (tasks.length === 0) {
      errors.push("repair_packet必须至少包含一项有效repair_task");
    }
    return tasks;
  }

  function changedForField(previous, replacement, field) {
    const evidenceBindingFields = [
      "guidelineRef",
      "evidence_type",
      "doc_id",
      "split_index",
      "authority",
      "source_title",
      "source_version",
      "source_section",
      "source_url"
    ];
    if (evidenceBindingFields.includes(field)) {
      if (
        (hasOwn(previous, field) || hasOwn(replacement, field)) &&
        !semanticEqual(previous[field], replacement[field])
      ) {
        return true;
      }
      return ["evidence_id", "support_mode", "evidence_summary"].some(
        (key) => !semanticEqual(previous[key], replacement[key])
      );
    }
    if (field === "all" || field === "questions") {
      return !semanticEqual(previous, replacement);
    }
    return !semanticEqual(previous[field], replacement[field]);
  }

  function rootOnlyTask(task) {
    return (
      Array.isArray(task.fields) &&
      task.fields.length > 0 &&
      task.fields.every((field) => ROOT_ONLY_FIELDS.has(field))
    );
  }

  function failure() {
    return {
      merged_internal_json: "",
      merge_decision: "FAIL",
      merge_errors: errors,
      changed_ids: [],
      preserved_ids: []
    };
  }

  const packetResult = parseObject(source.repair_packet, "repair_packet", false);
  const patchResult = parseObject(source.patch_json, "patch_json", false);
  const previousResult = parseObject(
    source.previous_internal_json,
    "previous_internal_json",
    true
  );
  if (!packetResult.valid || !patchResult.valid) return failure();

  const packet = packetResult.parsed;
  const patch = patchResult.parsed;
  const tasks = normalizeTasks(packet);
  const isAdvisoryCheck = task => ["QUOTA_CHECK", "QUOTA_RECALCULATION_RISK"].includes(task.code);
  const recheckOnly = tasks.length > 0 && tasks.every(isAdvisoryCheck);
  const requestedMode = packet.revision_mode || "";
  if (!new Set(["PATCH", "FULL"]).has(requestedMode)) {
    errors.push("repair_packet.revision_mode必须明确为PATCH或FULL，不得由模型patch_json自行选择");
  }
  if (!new Set(["PATCH", "FULL"]).has(patch.revision_mode)) {
    errors.push("patch_json.revision_mode只能为PATCH或FULL");
  } else if (requestedMode && patch.revision_mode !== requestedMode) {
    errors.push(
      `patch_json.revision_mode=${patch.revision_mode}与授权模式${requestedMode}不一致`
    );
  }
  const allowedPatchRootKeys = new Set([
    "revision_mode",
    "replacements",
    "generation_status",
    "missing_information",
    "risk_message",
    ...(requestedMode === "FULL" ? ["case_summary"] : [])
  ]);
  const unexpectedPatchRootKeys = Object.keys(patch).filter(
    (key) => !allowedPatchRootKeys.has(key)
  );
  if (unexpectedPatchRootKeys.length > 0) {
    errors.push(`patch_json包含未授权根字段：${unexpectedPatchRootKeys.join("、")}`);
  }
  if (requestedMode === "PATCH" && hasOwn(patch, "case_summary")) {
    errors.push("PATCH不得输出case_summary；该字段必须逐字保留上一轮值");
  }
  if (!new Set(["success", "insufficient"]).has(patch.generation_status)) {
    errors.push("patch_json.generation_status只能为success或insufficient");
  }
  // Metadata inheritance only: never manufacture missing clinical facts.
  const summaryTask = tasks.some(t => t.fields.includes("case_summary") || t.fields.includes("all"));
  if (requestedMode === "FULL" && !hasOwn(patch, "case_summary") && !summaryTask &&
      previousResult.valid && nonEmptyString(previousResult.parsed.case_summary) && previousResult.parsed.case_summary.length <= 400) {
    patch.case_summary = previousResult.parsed.case_summary;
  }
  if (patch.generation_status === "insufficient" && !hasOwn(patch, "risk_message") &&
      Array.isArray(patch.missing_information) && patch.missing_information.length > 0 && patch.missing_information.every(nonEmptyString)) {
    patch.risk_message = "本轮未完成修订，具体缺口见missing_information；不代表医学审核通过。";
  }
  if (
    requestedMode === "FULL" &&
    (!nonEmptyString(patch.case_summary) || patch.case_summary.length > 400)
  ) {
    errors.push("FULL修订必须返回非空且不超过400字的case_summary");
  }

  if (patch.generation_status === "insufficient") {
    if (!Array.isArray(patch.replacements) || patch.replacements.length !== 0) {
      errors.push("修订结果insufficient时replacements必须为空数组");
    }
    if (
      !Array.isArray(patch.missing_information) ||
      patch.missing_information.length === 0 ||
      patch.missing_information.some((item) => !nonEmptyString(item))
    ) {
      errors.push("修订结果insufficient时missing_information必须具体且非空");
    }
    if (!nonEmptyString(patch.risk_message)) {
      errors.push("修订结果insufficient时risk_message必须具体且非空");
    }
    if (errors.length > 0) return failure();
    const previous = previousResult.valid ? previousResult.parsed : {};
    const insufficient = {
      schema_version: "1.1",
      generation_status: "insufficient",
      case_summary:
        requestedMode === "FULL"
          ? patch.case_summary
          : typeof previous.case_summary === "string"
            ? previous.case_summary
            : typeof patch.case_summary === "string"
              ? patch.case_summary
              : "",
      question_count: 0,
      difficulty: "进阶",
      questions: [],
      missing_information: patch.missing_information,
      risk_message: patch.risk_message
    };
    return {
      merged_internal_json: JSON.stringify(insufficient),
      merge_decision: "INSUFFICIENT",
      merge_errors: [],
      changed_ids: [],
      preserved_ids: []
    };
  }

  if (!Array.isArray(patch.replacements)) {
    errors.push("patch_json.replacements必须为数组");
  }
  if (!Array.isArray(patch.missing_information) || patch.missing_information.some(item => !nonEmptyString(item))) {
    errors.push("missing_information必须是字符串数组，可保留真实缺口");
  }
  if (typeof patch.risk_message !== "string") {
    errors.push("risk_message必须为字符串");
  }
  if (errors.length > 0) return failure();

  const replacements = patch.replacements;
  const replacementById = new Map();
  for (const replacement of replacements) {
    if (!replacement || typeof replacement !== "object" || Array.isArray(replacement)) {
      errors.push("每个replacement必须是完整内部题对象");
      continue;
    }
    if (!nonEmptyString(replacement.id) || !/^Q[1-5]$/.test(replacement.id)) {
      errors.push("replacement.id只能为Q1至Q5");
      continue;
    }
    if (replacementById.has(replacement.id)) {
      errors.push(`patch_json重复提供${replacement.id}`);
      continue;
    }
    replacementById.set(replacement.id, replacement);
  }
  if (errors.length > 0) return failure();

  const questionAuthorizedIds = new Set(
    tasks
      .filter((task) => !rootOnlyTask(task))
      .flatMap((task) => task.target_ids)
  );
  const patchIds = new Set(replacementById.keys());
  const previousQuestions =
    previousResult.valid && Array.isArray(previousResult.parsed.questions)
      ? previousResult.parsed.questions
      : [];
  const previousById = new Map();
  for (const question of previousQuestions) {
    if (!question || typeof question !== "object" || Array.isArray(question)) continue;
    if (nonEmptyString(question.id)) {
      if (previousById.has(question.id)) {
        errors.push(`previous_internal_json中题号${question.id}重复`);
      } else {
        previousById.set(question.id, question);
      }
    }
  }

  if (requestedMode === "PATCH") {
    if (!previousResult.valid || !Array.isArray(previousResult.parsed.questions)) {
      errors.push("PATCH要求previous_internal_json为含questions数组的可解析对象");
    }
    if (tasks.some(rootOnlyTask)) {
      errors.push("根字段修复任务必须使用FULL，不能使用PATCH");
    }
    if (tasks.length === 0 || questionAuthorizedIds.size === 0) {
      errors.push("PATCH必须包含至少一个有target_ids的repair_task");
    }
    for (const id of questionAuthorizedIds) {
      if (!patchIds.has(id)) errors.push(`PATCH漏修授权目标题${id}`);
      if (!previousById.has(id)) errors.push(`PATCH授权题${id}不在上一轮题集中`);
    }
    for (const id of patchIds) {
      if (!questionAuthorizedIds.has(id)) errors.push(`PATCH越权修改或新增题号${id}`);
    }
    if (hasOwn(patch, "questions")) {
      errors.push("PATCH只能通过replacements返回授权题，不得返回完整questions字段");
    }
  } else if (requestedMode === "FULL") {
    const existingIds = Array.from(previousById.keys());
    EXPECTED_IDS = [...new Set([...existingIds, ...patchIds])].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
    // A sparse FULL may omit only explicitly preserved, unauthorized old IDs.
    const preserve = Array.isArray(packet.preserve_ids) ? packet.preserve_ids : [];
    for (const id of EXPECTED_IDS) {
      if (!patchIds.has(id) && !questionAuthorizedIds.has(id) && preserve.includes(id) && previousById.has(id)) {
        const old = previousById.get(id);
        replacementById.set(id, old); patchIds.add(id); replacements.push(old);
      }
    }
    if (
      replacements.length < 1 || replacements.length > 5 ||
      EXPECTED_IDS.some((id) => !patchIds.has(id)) ||
      patchIds.size !== EXPECTED_IDS.length || EXPECTED_IDS.some((id,i)=>id!==`Q${i+1}`)
    ) {
      errors.push("FULL合并结果须为连续Q1至QN（1≤N≤5），保留未授权题");
    }
  }
  if (errors.length > 0) return failure();

  for (const task of tasks) {
    if (rootOnlyTask(task) || isAdvisoryCheck(task)) continue;
    const comparableTargets = task.target_ids.filter(
      (id) => previousById.has(id) && replacementById.has(id)
    );
    for (const id of task.target_ids) {
      if (!replacementById.has(id) && !(requestedMode === "FULL" && previousById.size === 0)) {
        errors.push(`repair_task ${task.code} 的目标题${id}没有replacement`);
      }
    }
    if (requestedMode === "PATCH") {
      for (const id of comparableTargets) {
        const previous = previousById.get(id);
        const replacement = replacementById.get(id);
        if (!task.fields.some((field) => changedForField(previous, replacement, field))) {
          errors.push(
            `${id}只修改了与repair_task ${task.code}无关的字段，任务字段均未发生实质变化`
          );
        }
      }
    } else if (
      comparableTargets.length > 0 &&
      !comparableTargets.some((id) =>
        task.fields.some((field) =>
          changedForField(previousById.get(id), replacementById.get(id), field)
        )
      )
    ) {
      errors.push(
        `FULL未对repair_task ${task.code}的任何授权目标题完成相关实质变化`
      );
    }
  }

  if (requestedMode === "PATCH") {
    for (const id of questionAuthorizedIds) {
      const previous = previousById.get(id);
      if (!recheckOnly && previous && semanticEqual(previous, replacementById.get(id))) {
        errors.push(`${id}与上一轮完全相同，未完成实质修订`);
      }
    }
  }
  if (errors.length > 0) return failure();

  if (requestedMode === "FULL") {
    const previous = previousResult.valid ? previousResult.parsed : {};
    const explicitPreserveIds = Array.isArray(packet.preserve_ids)
      ? packet.preserve_ids
      : [];
    if (
      explicitPreserveIds.some((id) => !/^Q[1-5]$/.test(String(id))) ||
      new Set(explicitPreserveIds).size !== explicitPreserveIds.length
    ) {
      errors.push("repair_packet.preserve_ids必须是互异的Q1至Q5数组");
      return failure();
    }
    if (previousResult.valid && previousQuestions.length > 0) {
      const mustPreserve = EXPECTED_IDS.filter(
        (id) => previousById.has(id) && !questionAuthorizedIds.has(id)
      );
      if (explicitPreserveIds.length > 0) {
        const declared = [...explicitPreserveIds].sort();
        const expected = [...mustPreserve].sort();
        if (!semanticEqual(declared, expected)) {
          errors.push("FULL的preserve_ids必须恰好列出所有未被repair_tasks.target_ids授权的题号");
        }
      }
      for (const id of mustPreserve) {
        if (
          previousById.has(id) &&
          !semanticEqual(previousById.get(id), replacementById.get(id))
        ) {
          errors.push(`FULL越权修改未列入target_ids的题${id}`);
        }
      }
      if (errors.length > 0) return failure();
    }
    const merged = {
      ...previous,
      schema_version: "1.1",
      generation_status: "success",
      case_summary: patch.case_summary,
      question_count: EXPECTED_IDS.length,
      difficulty: "进阶",
      questions: EXPECTED_IDS.map((id) => replacementById.get(id)),
      missing_information: patch.missing_information,
      risk_message: patch.risk_message
    };
    if (previousResult.valid) {
      for (const task of tasks.filter(rootOnlyTask)) {
        if (
          !task.fields.some((field) =>
            !semanticEqual(previous[field], merged[field])
          )
        ) {
          errors.push(`FULL未修复根字段任务${task.code}`);
        }
      }
      if (errors.length > 0) return failure();
    }
    const changedIds = EXPECTED_IDS.filter(
      (id) => !previousById.has(id) || !semanticEqual(previousById.get(id), replacementById.get(id))
    );
    if (!recheckOnly && previousResult.valid && semanticEqual(previous, merged)) {
      errors.push("第二轮FULL结果与上一轮候选完全相同");
      return failure();
    }
    let mergedRaw = JSON.stringify(merged);
    if (previousResult.valid && previousQuestions.length > 0) {
      const previousElements = extractArrayElements(
        previousResult.raw,
        "questions"
      );
      if (
        !previousElements.span ||
        previousElements.invalid ||
        previousElements.elements.length !== previousQuestions.length
      ) {
        errors.push("FULL无法定位上一轮questions原始字节区间");
        return failure();
      }
      const previousRawById = new Map();
      for (const element of previousElements.elements) {
        const id =
          element.value && typeof element.value === "object"
            ? element.value.id
            : "";
        if (nonEmptyString(id)) previousRawById.set(id, element.raw);
      }
      const patchElements = extractArrayElements(patchResult.raw, "replacements");
      const patchRawById = new Map();
      if (patchElements.span && !patchElements.invalid) {
        for (const element of patchElements.elements) {
          const id =
            element.value && typeof element.value === "object"
              ? element.value.id
              : "";
          if (nonEmptyString(id)) patchRawById.set(id, element.raw);
        }
      }
      const mergedQuestionRaws = EXPECTED_IDS.map((id) => {
        const previousQuestion = previousById.get(id);
        const replacement = replacementById.get(id);
        if (
          previousQuestion &&
          semanticEqual(previousQuestion, replacement) &&
          previousRawById.has(id)
        ) {
          return previousRawById.get(id);
        }
        return patchRawById.get(id) || JSON.stringify(replacement);
      });
      const skeletonArray = findRootArray(mergedRaw, "questions");
      if (!skeletonArray) {
        errors.push("FULL无法构造合并后的questions数组");
        return failure();
      }
      mergedRaw =
        mergedRaw.slice(0, skeletonArray.start) +
        `[${mergedQuestionRaws.join(",")}]` +
        mergedRaw.slice(skeletonArray.end);
      try {
        JSON.parse(mergedRaw);
      } catch (error) {
        errors.push(
          `FULL合并后JSON不可解析：${String(
            error && error.message ? error.message : error
          )}`
        );
        return failure();
      }
    }
    return {
      merged_internal_json: mergedRaw,
      merge_decision: "PASS",
      merge_errors: [],
      changed_ids: changedIds,
      preserved_ids: EXPECTED_IDS.filter((id) => !changedIds.includes(id))
    };
  }

  const previousElements = extractArrayElements(previousResult.raw, "questions");
  const patchElements = extractArrayElements(patchResult.raw, "replacements");
  if (
    !previousElements.span ||
    previousElements.invalid ||
    previousElements.elements.length !== previousQuestions.length
  ) {
    errors.push("无法从previous_internal_json精确定位questions原始字节区间");
    return failure();
  }
  const rawReplacementById = new Map();
  if (patchElements.span && !patchElements.invalid) {
    for (const element of patchElements.elements) {
      if (
        element.value &&
        typeof element.value === "object" &&
        nonEmptyString(element.value.id)
      ) {
        rawReplacementById.set(element.value.id, element.raw);
      }
    }
  }

  const edits = [];
  const previousRawById = new Map();
  for (const element of previousElements.elements) {
    const id =
      element.value && typeof element.value === "object" ? element.value.id : "";
    if (nonEmptyString(id)) previousRawById.set(id, element.raw);
    if (!questionAuthorizedIds.has(id)) continue;
    edits.push({
      start: element.start,
      end: element.end,
      raw:
        rawReplacementById.get(id) || JSON.stringify(replacementById.get(id))
    });
  }
  if (edits.length !== questionAuthorizedIds.size) {
    errors.push("PATCH未能为每个授权题定位唯一原始字节区间");
    return failure();
  }

  let mergedRaw = previousResult.raw;
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    mergedRaw = mergedRaw.slice(0, edit.start) + edit.raw + mergedRaw.slice(edit.end);
  }
  let mergedParsed;
  try {
    mergedParsed = JSON.parse(mergedRaw);
  } catch (error) {
    errors.push(
      `PATCH合并后JSON不可解析：${String(
        error && error.message ? error.message : error
      )}`
    );
    return failure();
  }

  if (!Array.isArray(mergedParsed.questions) || mergedParsed.questions.length !== previousQuestions.length) {
    errors.push("PATCH合并后题目数量发生变化");
    return failure();
  }
  const mergedIds = mergedParsed.questions.map((question) =>
    question && typeof question === "object" ? question.id : ""
  );
  const previousIds = previousQuestions.map((question) =>
    question && typeof question === "object" ? question.id : ""
  );
  if (!semanticEqual(mergedIds, previousIds)) {
    errors.push("PATCH合并后题号或顺序发生变化");
    return failure();
  }
  const mergedById = new Map(
    mergedParsed.questions.map((question) => [
      question && typeof question === "object" ? question.id : "",
      question
    ])
  );
  for (const id of questionAuthorizedIds) {
    if (!semanticEqual(mergedById.get(id), replacementById.get(id))) {
      errors.push(`PATCH合并后授权题${id}的解析值与replacement不一致`);
    }
  }
  if (errors.length > 0) return failure();

  const mergedElements = extractArrayElements(mergedRaw, "questions");
  const mergedRawById = new Map();
  for (const element of mergedElements.elements) {
    const id =
      element.value && typeof element.value === "object" ? element.value.id : "";
    if (nonEmptyString(id)) mergedRawById.set(id, element.raw);
  }
  const preservedIds = previousIds.filter(
    (id) => nonEmptyString(id) && !questionAuthorizedIds.has(id)
  );
  for (const id of preservedIds) {
    if (previousRawById.get(id) !== mergedRawById.get(id)) {
      errors.push(`PATCH未逐字节保留未授权题${id}`);
    }
  }

  const explicitPreserveIds = Array.isArray(packet.preserve_ids)
    ? packet.preserve_ids
    : null;
  if (explicitPreserveIds) {
    const invalidFormat = explicitPreserveIds.some(
      (id) => typeof id !== "string" || !/^Q[1-5]$/.test(id)
    );
    const hasDuplicates =
      new Set(explicitPreserveIds).size !== explicitPreserveIds.length;
    const declared = [...explicitPreserveIds].sort();
    const actual = [...preservedIds].sort();
    if (invalidFormat || hasDuplicates || !semanticEqual(declared, actual)) {
      errors.push("repair_packet.preserve_ids与实际未授权题集合不一致");
    }
  }
  if (errors.length > 0) return failure();

  return {
    merged_internal_json: mergedRaw,
    merge_decision: "PASS",
    merge_errors: [],
    changed_ids: previousIds.filter((id) => questionAuthorizedIds.has(id) && !semanticEqual(previousById.get(id), replacementById.get(id))),
    preserved_ids: recheckOnly ? previousIds : preservedIds
  };
}
