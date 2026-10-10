function main({ raw_json }) {
  const input = String(raw_json ?? "").trim();

  if (!input) {
    throw new Error("病例结构化提取结果为空");
  }

  /**
   * 删除模型可能输出的 Markdown 代码围栏。
   */
  function removeCodeFence(value) {
    return String(value ?? "")
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
  }

  /**
   * 截取第一个 JSON 根对象。
   */
  function extractJsonObject(value) {
    const source = removeCodeFence(value);
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");

    if (start < 0 || end <= start) {
      throw new Error("未找到可解析的 JSON 根对象");
    }

    return source.slice(start, end + 1);
  }

  /**
   * 修复 JSON 字符串内部未转义的半角双引号，
   * 同时处理字符串内部的真实换行和制表符。
   */
  function repairUnescapedQuotes(value) {
    let result = "";
    let inString = false;
    let escaped = false;

    for (let index = 0; index < value.length; index++) {
      const char = value[index];

      if (!inString) {
        result += char;

        if (char === '"') {
          inString = true;
          escaped = false;
        }

        continue;
      }

      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        result += char;
        escaped = true;
        continue;
      }

      if (char === "\r") {
        if (value[index + 1] === "\n") {
          index += 1;
        }

        result += "\\n";
        continue;
      }

      if (char === "\n") {
        result += "\\n";
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        continue;
      }

      if (char !== '"') {
        result += char;
        continue;
      }

      // 判断当前双引号是字符串结束符，还是正文内部未转义引号。
      let nextIndex = index + 1;

      while (
        nextIndex < value.length &&
        /\s/.test(value[nextIndex])
      ) {
        nextIndex += 1;
      }

      const nextChar =
        nextIndex < value.length ? value[nextIndex] : "";

      const isClosingQuote =
        nextChar === ":" ||
        nextChar === "," ||
        nextChar === "}" ||
        nextChar === "]" ||
        nextChar === "";

      if (isClosingQuote) {
        result += '"';
        inString = false;
      } else {
        result += '\\"';
      }
    }

    if (inString) {
      throw new Error("JSON 字符串引号未闭合，无法安全修复");
    }

    return result;
  }

  /**
   * 删除对象或数组末尾多余的逗号。
   */
  function removeTrailingCommas(value) {
    let result = "";
    let inString = false;
    let escaped = false;

    for (let index = 0; index < value.length; index++) {
      const char = value[index];

      if (inString) {
        result += char;

        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
        result += char;
        continue;
      }

      if (char === ",") {
        let nextIndex = index + 1;

        while (
          nextIndex < value.length &&
          /\s/.test(value[nextIndex])
        ) {
          nextIndex += 1;
        }

        const nextChar =
          nextIndex < value.length ? value[nextIndex] : "";

        if (nextChar === "}" || nextChar === "]") {
          continue;
        }
      }

      result += char;
    }

    return result;
  }

  /**
   * 解析原始 JSON；失败时依次进行受控修复。
   */
  const source = extractJsonObject(input);
  let parsed;

  try {
    parsed = JSON.parse(source);
  } catch (firstError) {
    const quoteRepaired = repairUnescapedQuotes(source);
    const fullyRepaired = removeTrailingCommas(quoteRepaired);

    try {
      parsed = JSON.parse(fullyRepaired);
    } catch (secondError) {
      throw new Error(
        `病例结构化 JSON 修复失败：${secondError.message}`
      );
    }
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error("病例结构化结果必须是单个 JSON 对象");
  }

  /**
   * evidence_notes 只能保留患者正文内部的不确定信息，
   * 禁止记录导语、专家观点与正文的比较。
   */
  // evidence_notes原样保留，禁止格式修复节点删除临床不确定性说明。

  /**
   * patient_facts 只能保存具体患者事实，
   * 删除参考文献、图片推断等分类标签。
   */
  if (Array.isArray(parsed.patient_facts)) {
    parsed.patient_facts = parsed.patient_facts
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .filter((item) => {
        return !/^(参考文献|参考文献列表|图片推断|文章导语与二次资料|专家观点|专家点评|已移除内容类别)(?:[：:].*)?$/i.test(
          item
        );
      });
  }

  /**
   * missing_information 不能把已移除内容类别当作病例缺失信息。
   */
  if (Array.isArray(parsed.missing_information)) {
    parsed.missing_information =
      parsed.missing_information
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .filter((item) => {
          return !/^(参考文献|参考文献列表|图片推断|文章导语与二次资料|专家观点|专家点评|已移除内容类别)(?:[：:].*)?$/i.test(
            item
          );
        });
  }

  /**
   * 禁止保留模型自行计算出来的日期。
   * 保留原文的持续时间事实，但将日期改为“时间不详”。
   */
  if (typeof parsed.case_timeline === "string") {
    parsed.case_timeline = parsed.case_timeline
      .split(/\r?\n/)
      .map((line) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return "";
        }

        if (/（?推算）?/i.test(trimmed)) {
          const separatorIndex = trimmed.indexOf("：");

          if (separatorIndex >= 0) {
            const fact = trimmed
              .slice(separatorIndex + 1)
              .replace(/（?推算）?/gi, "")
              .trim();

            return fact ? `时间不详：${fact}` : "";
          }

          return trimmed
            .replace(/（?推算）?/gi, "")
            .replace(
              /^\d{4}\s*年(?:\s*\d{1,2}\s*月)?/,
              "时间不详"
            )
            .trim();
        }

        return trimmed;
      })
      .filter(Boolean)
      .join("\n");
  }

  return {
    repaired_json: JSON.stringify(parsed),
    repaired_data: parsed
  };
}