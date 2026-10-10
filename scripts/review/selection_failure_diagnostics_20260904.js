  if (pool.candidates.length < 5) {
    const errors = pool.groups.filter(g => g.parse_status === "ERROR");
    const stopped = pool.groups.filter(g => g.parse_status !== "ERROR" && g.generation_status === "insufficient");
    const rejected = pool.groups.reduce((n, g) => n + (g.rejected_questions || []).length, 0);
    report.selection_status = "insufficient";
    report.failure_kind = errors.length ? "UPSTREAM_OUTPUT_ERROR"
      : stopped.length ? "UPSTREAM_INSUFFICIENT"
      : rejected ? "CANDIDATE_STRUCTURE_INCOMPLETE" : "CANDIDATE_COUNT_INSUFFICIENT";
    report.warnings.push(errors.length
      ? "仅成功读入" + pool.candidates.length + "道结构完整候选，另有" + errors.length + "组输出/解析异常；不能把这些异常等同于医学证据不足。"
      : "成功解析后的结构完整候选为" + pool.candidates.length + "道，不足5道。");
    for (const g of pool.groups) {
      if (g.parse_status === "ERROR") report.warnings.push(g.group_id + " [" + (g.error_code || "REPLY_PARSE_ERROR") + "] " + g.error);
      if (g.generation_status === "insufficient") report.warnings.push(g.group_id + "的上游最终输出明确为insufficient，未生成题目。");
      for (const reason of (g.upstream_missing_information || []).slice(0, 4)) report.warnings.push(g.group_id + "上游缺口：" + reason);
      if ((g.rejected_questions || []).length) report.warnings.push(g.group_id + "有" + g.rejected_questions.length + "道题因结构/答案映射不完整未入池，详见rejected_questions。");
    }
    const final_data = { schema_version: "1.0", case_id: String(case_id || ""), cancer_type: String(disease || ""),
      generation_status: "insufficient", difficulty: String(difficulty || "进阶"), question_count: 0, questions: [],
      missing_information: report.warnings.slice() };
    return { stop: { final_data, final_json: JSON.stringify(final_data, null, 2), case_page_data: {}, case_page_json: "{}",
      selection_report: report, selection_report_json: JSON.stringify(report, null, 2), quality_notice: report.warnings.join("\n") } };
  }
