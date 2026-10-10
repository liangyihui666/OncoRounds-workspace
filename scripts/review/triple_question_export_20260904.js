  const questions = source.questions.map((q, index) => {
    const sourceOptions = Array.isArray(q.options) ? [...q.options] : letters.map(k => q.options && q.options[k]);
    if (sourceOptions.length !== 4 || sourceOptions.some(v => typeof v !== "string" || !v.trim()) || new Set(sourceOptions.map(v => v.trim())).size !== 4) {
      throw new Error(`Q${index + 1}需要四项不重复的有效选项`);
    }
    const originalAnswerIndex = typeof q.answer === "number" ? q.answer : letters.indexOf(String(q.answer).toUpperCase());
    if (!Number.isInteger(originalAnswerIndex) || originalAnswerIndex < 0 || originalAnswerIndex > 3) throw new Error(`Q${index + 1}答案索引非法`);
    const correctAnswerText = sourceOptions[originalAnswerIndex];
    if (q.answer_text !== correctAnswerText) throw new Error(`Q${index + 1}答案文字与选项不一致`);
    const dependentText = [q.question, q.explain, q.keyPoint, ...sourceOptions].join("\n");
    const orderSensitive = /(?:选项|答案|选择|排除|选)\s*[A-D]|[A-D]\s*(?:项|选项|正确|错误)|[A-D]\s*(?:和|与|及|、|或|\+|\/|and|or)\s*[A-D]|(?:以上|上述|前述|前两|前三|后两|其余|所有|全部).{0,6}(?:选项|都|均|皆|正确|错误)|(?:^|\n)\s*[A-D][.、：:)]/i.test(dependentText);
    let target = prepared.targets[index];
    let reorderedOptions;
    if (orderSensitive) {
      target = originalAnswerIndex;
      reorderedOptions = sourceOptions;
      prepared.report.warnings.push(`Q${index + 1}含位置相关表述，为保护题意保留原选项顺序；不因答案分布停止输出。`);
    } else {
      reorderedOptions = sourceOptions.filter((_, i) => i !== originalAnswerIndex);
      reorderedOptions.splice(target, 0, correctAnswerText);
    }
    prepared.report.selected[index].answer_mapping = { original: letters[originalAnswerIndex], final: letters[target], order_preserved: orderSensitive };
    return { id: q.id, type: q.type, phase: q.phase, timepoint: q.timepoint, question: q.question,
      options: { A: reorderedOptions[0], B: reorderedOptions[1], C: reorderedOptions[2], D: reorderedOptions[3] },
      answer: letters[target], answer_text: correctAnswerText, explain: q.explain, keyPoint: q.keyPoint, guidelineRef: q.guidelineRef };
  });
  const actualQuestionCount = questions.length;
  const answerDistribution = questions.reduce((c, q) => { c[q.answer]++; return c; }, { A: 0, B: 0, C: 0, D: 0 });
  prepared.report.answer_distribution = answerDistribution;
  if (Math.max(...Object.values(answerDistribution)) > 2 || Object.values(answerDistribution).filter(v => v > 0).length < 3) {
    prepared.report.warnings.push("为保护位置相关选项语义，本组答案分布未均衡；这不是证据不足，不删除题目。");
  }
  const finalData = { schema_version: "1.0", case_id: resolvedCaseId, cancer_type: source.cancer_type || cancerType,
    generation_status: "success", difficulty: resolvedDifficulty, question_count: actualQuestionCount, questions,
    missing_information: [] };

