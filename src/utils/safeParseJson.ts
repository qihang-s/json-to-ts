/**
 * 自定义错误类，包含修复后的字符串信息
 */
class SafeParseJsonError extends Error {
  public repaired: string;
  public cause?: Error;

  constructor(message: string, repaired: string, cause?: Error) {
    super(message);
    this.name = 'SafeParseJsonError';
    this.repaired = repaired;
    this.cause = cause;
  }
}

/**
 * 尝试把“半结构化 / 控制台打印”风格的对象文本修复为合法 JSON，
 * 并返回解析后的对象。如果无法解析会抛错并返回最后的修复字符串供调试。
 */
export function safeParseJson(input: string): unknown {
  const normalizeQuote = (s: string) =>
    s
      .replace(/\u201c|\u201d|\u2018|\u2019/g, '"') // smart quotes
      .replace(/’|‘|“|”/g, '"')
      .replace(/`/g, '"')
      .replace(/'/g, '"'); // 把单引号也统一为双引号（用于修复）

  const s0 = normalizeQuote(input);
  const n = s0.length;
  let i = 0;
  const outParts: string[] = [];
  let lastWrittenType: 'start' | 'key' | 'colon' | 'value' | 'open' | 'close' | 'comma' | null = null;

  const isWhitespace = (ch: string) => /\s/.test(ch);
  const skipWhitespace = (pos: number) => {
    while (pos < n && isWhitespace(s0[pos])) pos++;
    return pos;
  };

  while (true) {
    i = skipWhitespace(i);
    if (i >= n) break;
    const ch = s0[i];

    // open bracket
    if (ch === '{' || ch === '[') {
      if (lastWrittenType === 'value' || lastWrittenType === 'close') {
        // 如果前面是个 value/close，且没有逗号，补逗号
        const last = outParts[outParts.length - 1] ?? '';
        if (!/,\s*$/.test(last)) outParts.push(',');
      }
      outParts.push(ch);
      i++;
      lastWrittenType = 'open';
      continue;
    }

    // close bracket
    if (ch === '}' || ch === ']') {
      outParts.push(ch);
      i++;
      lastWrittenType = 'close';
      continue;
    }

    // literal colon / comma
    if (ch === ',' || ch === ':') {
      outParts.push(ch);
      i++;
      lastWrittenType = ch === ',' ? 'comma' : 'colon';
      continue;
    }

    // string literal (双引号)
    if (ch === '"') {
      // parse string (包含转义)
      let j = i + 1;
      let escaped = false;
      while (j < n) {
        if (s0[j] === '\\' && !escaped) {
          escaped = true;
          j += 1;
        } else if (s0[j] === '"' && !escaped) {
          j += 1;
          break;
        } else {
          escaped = false;
          j += 1;
        }
      }
      const token = s0.slice(i, j); // 包含引号
      const k = skipWhitespace(j);
      if (k < n && s0[k] === ':') {
        // 这是 key（字符串形式）
        if (lastWrittenType === 'value' || lastWrittenType === 'close') {
          const last = outParts[outParts.length - 1] ?? '';
          if (!/,\s*$/.test(last)) outParts.push(',');
        }
        outParts.push(token); // 保留 key 的引号
        // consume colon (allow spaces)
        i = j;
        i = skipWhitespace(i);
        if (i < n && s0[i] === ':') {
          outParts.push(':');
          i++;
        }
        lastWrittenType = 'colon';
      } else {
        // 这是 value 字符串
        if (lastWrittenType === 'value' || lastWrittenType === 'close') {
          const last = outParts[outParts.length - 1] ?? '';
          if (!/,\s*$/.test(last)) outParts.push(',');
        }
        outParts.push(token);
        i = j;
        lastWrittenType = 'value';
      }
      continue;
    }

    // identifier: 可能是 key（后面跟 :）或 value（true/false/null，或裸字符串）
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_]/.test(s0[j])) j++;
      const ident = s0.slice(i, j);
      const k = skipWhitespace(j);
      if (k < n && s0[k] === ':') {
        // key（未加引号） -> 输出时加引号
        if (lastWrittenType === 'value' || lastWrittenType === 'close') {
          const last = outParts[outParts.length - 1] ?? '';
          if (!/,\s*$/.test(last)) outParts.push(',');
        }
        outParts.push(`"${ident}"`);
        // consume colon
        i = k + 1;
        outParts.push(':');
        lastWrittenType = 'colon';
      } else {
        // 裸值（true/false/null 或裸单词） -> 处理为 boolean/null/或字符串
        if (ident === 'true' || ident === 'false' || ident === 'null') {
          if (lastWrittenType === 'value' || lastWrittenType === 'close') {
            const last = outParts[outParts.length - 1] ?? '';
            if (!/,\s*$/.test(last)) outParts.push(',');
          }
          outParts.push(ident);
          lastWrittenType = 'value';
        } else {
          // 把裸单词当字符串包起来（更安全）
          if (lastWrittenType === 'value' || lastWrittenType === 'close') {
            const last = outParts[outParts.length - 1] ?? '';
            if (!/,\s*$/.test(last)) outParts.push(',');
          }
          outParts.push(`"${ident}"`);
          lastWrittenType = 'value';
        }
        i = j;
      }
      continue;
    }

    // number
    if (/[0-9-]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[0-9eE+.-]/u.test(s0[j])) j++;
      const num = s0.slice(i, j);
      if (lastWrittenType === 'value' || lastWrittenType === 'close') {
        const last = outParts[outParts.length - 1] ?? '';
        if (!/,\s*$/.test(last)) outParts.push(',');
      }
      outParts.push(num);
      i = j;
      lastWrittenType = 'value';
      continue;
    }

    // skip // comment
    if (ch === '/' && i + 1 < n && s0[i + 1] === '/') {
      i += 2;
      while (i < n && s0[i] !== '\n') i++;
      continue;
    }

    // 其他字符：直接附加（避免死循环）
    outParts.push(ch);
    i++;
  }

  // join and do final cleanup
  let repaired = outParts.join('');
  repaired = repaired.replace(/,\s*([}\]])/g, '$1'); // 去掉结尾多余逗号

  // 最终尝试 JSON.parse
  try {
    return JSON.parse(repaired);
  } catch (e) {
    // 如果仍然失败，抛出并附上修复后的字符串，方便调试
    const message = 'safeParseJson: parse failed after auto-repair: ' + (e as Error).message;
    throw new SafeParseJsonError(message, repaired, e as Error);
  }
}
