/**
 * EcoRoute Deterministic Routing & Local Processing Engine
 *
 * Rules-based, sub-millisecond classifier and executor for deterministic tasks.
 * Avoids calling LLMs for operations that can be solved reliably on CPU.
 */

export interface RoutingDecision {
  route: 'local' | 'gemma-4';
  ruleId: string;
  ruleName: string;
  confidence: number;
  reason: string;
  matchedPattern?: string;
  estimatedComplexity: 'O(1)' | 'O(n)' | 'O(n log n)' | 'O(LLM Attention)';
}

export interface ExecutionResult {
  output: string;
  route: 'local' | 'gemma-4';
  ruleId: string;
  ruleName: string;
  reason: string;
  matchedPattern?: string;
  elapsedMs: number;
  modelCall: boolean;
  tokensUsed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCostUsd: number;
  isValidJson?: boolean;
  jsonValidationError?: string;
  retryAvailable?: boolean;
  modelId?: string;
}

// Regex helpers
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /https?:\/\/[^\s$.?#].[^\s]*/gi;

type ArithmeticResult = { valid: true; value?: number; error?: string } | { valid: false };

/** Parse a small arithmetic expression without eval or generated code. */
function evaluateArithmetic(expression: string): ArithmeticResult {
  if (!expression || expression.length > 256) return { valid: false };

  const tokens: string[] = [];
  const tokenizer = /\s*(\d+(?:\.\d*)?|\.\d+|[()+\-*/%^])/gy;
  let offset = 0;
  while (offset < expression.length) {
    if (!expression.slice(offset).trim()) break;
    tokenizer.lastIndex = offset;
    const match = tokenizer.exec(expression);
    if (!match) return { valid: false };
    tokens.push(match[1]);
    if (tokens.length > 128) return { valid: false };
    offset = tokenizer.lastIndex;
  }
  if (!tokens.length) return { valid: false };

  let cursor = 0;
  const parseExpression = (): number => {
    let value = parseTerm();
    while (tokens[cursor] === '+' || tokens[cursor] === '-') {
      const operator = tokens[cursor++];
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseUnary();
    while (tokens[cursor] === '*' || tokens[cursor] === '/' || tokens[cursor] === '%') {
      const operator = tokens[cursor++];
      const right = parseUnary();
      if ((operator === '/' || operator === '%') && right === 0) {
        throw new Error('Division by zero.');
      }
      if (operator === '*') value *= right;
      else if (operator === '/') value /= right;
      else value %= right;
    }
    return value;
  };
  const parseUnary = (): number => {
    if (tokens[cursor] === '+') {
      cursor++;
      return parseUnary();
    }
    if (tokens[cursor] === '-') {
      cursor++;
      return -parseUnary();
    }
    return parsePower();
  };
  const parsePower = (): number => {
    const value = parsePrimary();
    if (tokens[cursor] === '^') {
      cursor++;
      return value ** parseUnary();
    }
    return value;
  };
  const parsePrimary = (): number => {
    const token = tokens[cursor++];
    if (token === '(') {
      const value = parseExpression();
      if (tokens[cursor++] !== ')') throw new Error('Unbalanced parentheses.');
      return value;
    }
    if (token && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);
    throw new Error('Invalid arithmetic expression.');
  };

  try {
    const value = parseExpression();
    if (cursor !== tokens.length) return { valid: false };
    if (!Number.isFinite(value)) return { valid: true, error: 'The result is outside the supported numeric range.' };
    return { valid: true, value };
  } catch (error) {
    if (error instanceof Error && error.message === 'Division by zero.') {
      return { valid: true, error: error.message };
    }
    return { valid: false };
  }
}

function parseArithmeticPrompt(input: string): (ArithmeticResult & { expression: string }) | null {
  const match = /^(?:(?:please\s+)?(?:calculate|compute|evaluate|solve)\s+|what\s+is\s+|how\s+much\s+is\s+)?(.+?)\??$/i.exec(input.trim());
  if (!match) return null;

  const expression = match[1].trim();
  if (!/[+\-*/%^]/.test(expression)) return null;
  const result = evaluateArithmetic(expression);
  return result.valid ? { ...result, expression } : null;
}

/**
 * Classify a prompt or input text using deterministic rules.
 * Runs in under 1ms without calling any AI model.
 */
export function classifyRequest(input: string): RoutingDecision {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      route: 'local',
      ruleId: 'EMPTY_INPUT',
      ruleName: 'Empty Input Handler',
      confidence: 1.0,
      reason: 'No content provided. Handled instantly on local CPU.',
      estimatedComplexity: 'O(1)',
    };
  }

  // Basic arithmetic is deterministic and can be evaluated locally.
  const arithmetic = parseArithmeticPrompt(trimmed);
  if (arithmetic) {
    return {
      route: 'local',
      ruleId: 'LOCAL_ARITHMETIC',
      ruleName: 'Local Arithmetic Calculator',
      confidence: 1.0,
      reason: 'A supported arithmetic expression was detected and can be evaluated locally without a model call.',
      matchedPattern: arithmetic.expression,
      estimatedComplexity: 'O(1)',
    };
  }

  // 1. Email Extraction Detection
  const hasEmailKeyword = /(extract|find|get|list|pull|show)\s+(all\s+)?(emails?|email addresses?|mail)/i.test(lower);
  const emailsInText = trimmed.match(EMAIL_REGEX) || [];
  if (hasEmailKeyword || (emailsInText.length >= 2 && !/(explain|write|generate|summarize|translate|code)/i.test(lower))) {
    return {
      route: 'local',
      ruleId: 'LOCAL_EXTRACT_EMAILS',
      ruleName: 'Deterministic Email Extractor',
      confidence: 0.99,
      reason: `Deterministic pattern matched. Text contains email patterns or explicit extraction directive. Solvable via RFC 5322 regex in <1ms without LLM inference.`,
      matchedPattern: `Regex /${EMAIL_REGEX.source}/g`,
      estimatedComplexity: 'O(n)',
    };
  }

  // 2. Word Count, Character Count & Readability Stats
  const wordCountTriggers = [
    'count words',
    'word count',
    'count characters',
    'character count',
    'char count',
    'reading time',
    'readability',
    'text stats',
    'how many words',
    'how many characters',
    'count lines',
    'line count',
  ];
  if (wordCountTriggers.some((t) => lower.startsWith(t) || lower.endsWith(t) || lower.includes(`please ${t}`))) {
    return {
      route: 'local',
      ruleId: 'LOCAL_TEXT_STATS',
      ruleName: 'Deterministic Text & Token Metrics',
      confidence: 1.0,
      reason: 'Lexical analysis request detected. Computing exact word count, character metrics, reading time, and density deterministically on CPU.',
      matchedPattern: 'Keyword trigger: ' + wordCountTriggers.find((t) => lower.includes(t)),
      estimatedComplexity: 'O(n)',
    };
  }

  // 3. Whitespace Cleaning & Text Normalization
  const whitespaceTriggers = [
    'clean whitespace',
    'remove extra spaces',
    'strip whitespace',
    'normalize whitespace',
    'remove empty lines',
    'trim spaces',
    'strip trailing spaces',
    'fix spacing',
    'remove line breaks',
    'collapse whitespace',
  ];
  if (whitespaceTriggers.some((t) => lower.includes(t))) {
    return {
      route: 'local',
      ruleId: 'LOCAL_CLEAN_WHITESPACE',
      ruleName: 'Deterministic Whitespace Normalizer',
      confidence: 0.98,
      reason: 'Text formatting and space normalization detected. Standard string buffer transforms execute locally with zero model overhead.',
      matchedPattern: 'Keyword trigger: ' + whitespaceTriggers.find((t) => lower.includes(t)),
      estimatedComplexity: 'O(n)',
    };
  }

  // 4. JSON Formatting, Minification & Syntax Validation
  const jsonTriggers = [
    'format json',
    'beautify json',
    'prettify json',
    'minify json',
    'validate json',
    'clean json',
    'repair json',
    'indent json',
  ];
  const hasJsonKeyword = jsonTriggers.some((t) => lower.includes(t));
  const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (hasJsonKeyword || (looksLikeJson && !/(why|explain|what is|translate|generate story)/i.test(lower))) {
    return {
      route: 'local',
      ruleId: 'LOCAL_JSON_TRANSFORM',
      ruleName: 'Deterministic JSON Engine',
      confidence: looksLikeJson ? 0.95 : 0.99,
      reason: 'JSON parsing, syntax validation, and pretty-printing detected. Native AST parser validates structure and formats instantaneously.',
      matchedPattern: hasJsonKeyword ? 'JSON formatting keywords' : 'Valid JSON bounding tokens ({ or [)',
      estimatedComplexity: 'O(n)',
    };
  }

  // 5. Case Transformations / Slugification
  const caseTriggers = [
    'convert to uppercase',
    'to uppercase',
    'to lowercase',
    'to title case',
    'to slug',
    'slugify',
    'to snake_case',
    'to kebab-case',
    'to camelcase',
  ];
  if (caseTriggers.some((t) => lower.includes(t))) {
    return {
      route: 'local',
      ruleId: 'LOCAL_CASE_TRANSFORM',
      ruleName: 'Deterministic Case & Slug Engine',
      confidence: 0.99,
      reason: 'Casing or URL slug transformation requested. Solved with native UTF-8 string manipulation routines.',
      matchedPattern: 'Keyword trigger: ' + caseTriggers.find((t) => lower.includes(t)),
      estimatedComplexity: 'O(n)',
    };
  }

  // 6. CSV to JSON Conversion
  const csvTriggers = ['csv to json', 'convert csv', 'parse csv table', 'tsv to json'];
  if (csvTriggers.some((t) => lower.includes(t))) {
    return {
      route: 'local',
      ruleId: 'LOCAL_CSV_TO_JSON',
      ruleName: 'Deterministic CSV/TSV Parser',
      confidence: 0.96,
      reason: 'Tabular data serialization detected. Parsing delimited records directly into structured JSON records on CPU.',
      matchedPattern: 'CSV serialization directive',
      estimatedComplexity: 'O(n)',
    };
  }

  // 7. Base64 Encode / Decode
  const base64Triggers = ['base64 encode', 'base64 decode', 'encode to base64', 'decode base64'];
  if (base64Triggers.some((t) => lower.includes(t))) {
    return {
      route: 'local',
      ruleId: 'LOCAL_BASE64_TRANSFORM',
      ruleName: 'Deterministic Base64 Engine',
      confidence: 1.0,
      reason: 'Cryptographic byte encoding/decoding detected. Solved using native Buffer routines.',
      matchedPattern: 'Base64 keyword detected',
      estimatedComplexity: 'O(n)',
    };
  }

  // 8. URL / Link Extraction
  const urlTriggers = ['extract urls', 'extract links', 'find links', 'get all links', 'pull urls'];
  if (urlTriggers.some((t) => lower.includes(t))) {
    return {
      route: 'local',
      ruleId: 'LOCAL_EXTRACT_URLS',
      ruleName: 'Deterministic Link Extractor',
      confidence: 0.97,
      reason: 'URL pattern parsing requested. Solved with RFC URI regex matching and deduplication.',
      matchedPattern: 'URI regex pattern match',
      estimatedComplexity: 'O(n)',
    };
  }

  // Default: Route to Gemma 4 Open-Weight AI Model via Google Gen AI SDK
  return {
    route: 'gemma-4',
    ruleId: 'GEMMA_4_REASONING',
    ruleName: 'Gemma 4 (gemma-4-26b-a4b-it)',
    confidence: 0.92,
    reason: 'Complex semantic understanding, synthesis, multi-step reasoning, or generative text required. Deterministic rules cannot solve this without neural inference.',
    matchedPattern: 'Open-ended natural language / reasoning prompt',
    estimatedComplexity: 'O(LLM Attention)',
  };
}

/**
 * Execute a local deterministic task.
 * Guarantees 0 token usage, zero network delay, zero model invocation.
 */
export function executeLocalTask(ruleId: string, rawInput: string): { output: string; isValidJson?: boolean; jsonValidationError?: string } {
  const trimmed = rawInput.trim();

  // Helper to strip the directive part if the user entered "extract emails from this text: ..."
  const extractPayload = (text: string): string => {
    const colonIndex = text.indexOf(':');
    if (colonIndex !== -1 && colonIndex < 80) {
      return text.substring(colonIndex + 1).trim();
    }
    // Check newline separation
    const lines = text.split('\n');
    if (lines.length > 1 && lines[0].length < 80) {
      return lines.slice(1).join('\n').trim();
    }
    return text;
  };

  switch (ruleId) {
    case 'LOCAL_ARITHMETIC': {
      const calculation = parseArithmeticPrompt(trimmed);
      if (!calculation) {
        return { output: 'Could not parse this arithmetic expression.', isValidJson: false };
      }
      if (calculation.error) {
        return { output: calculation.error, isValidJson: false };
      }
      return { output: String(calculation.value), isValidJson: false };
    }

    case 'LOCAL_EXTRACT_EMAILS': {
      const payload = extractPayload(trimmed);
      const matches = payload.match(EMAIL_REGEX) || trimmed.match(EMAIL_REGEX) || [];
      const unique = Array.from(new Set(matches.map((e) => e.toLowerCase())));
      
      const domainMap: Record<string, number> = {};
      unique.forEach((email) => {
        const domain = email.split('@')[1];
        domainMap[domain] = (domainMap[domain] || 0) + 1;
      });

      const structuredResult = {
        totalEmailsFound: unique.length,
        extractedEmails: unique,
        uniqueDomains: Object.keys(domainMap),
        domainsBreakdown: domainMap,
        extractedAt: new Date().toISOString(),
        engine: 'Deterministic Regex Engine (0 tokens, 0 GPU compute)',
      };

      return {
        output: JSON.stringify(structuredResult, null, 2),
        isValidJson: true,
      };
    }

    case 'LOCAL_TEXT_STATS': {
      const payload = extractPayload(trimmed);
      const textToAnalyze = payload.length > 10 ? payload : trimmed;
      const charsWithSpaces = textToAnalyze.length;
      const charsWithoutSpaces = textToAnalyze.replace(/\s+/g, '').length;
      const words = textToAnalyze.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const sentences = textToAnalyze.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
      const paragraphs = textToAnalyze.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
      const readingTimeMinutes = (wordCount / 200).toFixed(2);
      const speakingTimeMinutes = (wordCount / 130).toFixed(2);
      const avgWordLength = wordCount > 0 ? (charsWithoutSpaces / wordCount).toFixed(1) : '0';

      const stats = {
        wordCount,
        characterCount: {
          withSpaces: charsWithSpaces,
          withoutSpaces: charsWithoutSpaces,
        },
        sentenceCount: sentences,
        paragraphCount: paragraphs,
        averageWordLength: Number(avgWordLength),
        estimatedReadingTime: `${readingTimeMinutes} min (at 200 wpm)`,
        estimatedSpeakingTime: `${speakingTimeMinutes} min (at 130 wpm)`,
        processedBy: 'Local Lexical Engine',
      };

      return {
        output: JSON.stringify(stats, null, 2),
        isValidJson: true,
      };
    }

    case 'LOCAL_CLEAN_WHITESPACE': {
      const payload = extractPayload(trimmed);
      const target = payload.length > 5 ? payload : trimmed;
      // 1. Normalize line breaks to \n
      // 2. Remove trailing whitespace on each line
      // 3. Collapse multiple blank lines into max 1
      // 4. Collapse multiple inline spaces into single space
      const lines = target
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim());

      // Filter consecutive empty lines
      const cleanedLines: string[] = [];
      let lastWasEmpty = false;
      for (const line of lines) {
        if (line === '') {
          if (!lastWasEmpty) {
            cleanedLines.push('');
            lastWasEmpty = true;
          }
        } else {
          cleanedLines.push(line);
          lastWasEmpty = false;
        }
      }

      const cleaned = cleanedLines.join('\n').trim();
      const removedBytes = target.length - cleaned.length;

      return {
        output: cleaned,
        isValidJson: false,
      };
    }

    case 'LOCAL_JSON_TRANSFORM': {
      // Find candidate JSON payload
      let jsonString = extractPayload(trimmed);
      if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
        const firstBrace = jsonString.indexOf('{');
        const firstBracket = jsonString.indexOf('[');
        const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
        if (start !== -1) {
          jsonString = jsonString.slice(start);
        }
      }

      // Check minification intent
      const isMinify = /minify/i.test(trimmed);

      try {
        const parsed = JSON.parse(jsonString);
        const formatted = isMinify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
        return {
          output: formatted,
          isValidJson: true,
        };
      } catch (err: any) {
        // Try light auto-repair for common issues: trailing commas, single quotes
        try {
          const repaired = jsonString
            .replace(/,\s*([}\]])/g, '$1') // remove trailing commas
            .replace(/'/g, '"'); // single to double quotes
          const parsed = JSON.parse(repaired);
          const formatted = isMinify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
          return {
            output: formatted,
            isValidJson: true,
          };
        } catch (repairErr: any) {
          return {
            output: `JSON Syntax Validation Error: ${err.message}\n\nOriginal Input snippet:\n${jsonString.slice(0, 300)}`,
            isValidJson: false,
            jsonValidationError: err.message,
          };
        }
      }
    }

    case 'LOCAL_CASE_TRANSFORM': {
      const payload = extractPayload(trimmed);
      const target = payload.length > 2 ? payload : trimmed;
      const lower = trimmed.toLowerCase();

      let transformed = '';
      if (lower.includes('slug')) {
        transformed = target
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');
      } else if (lower.includes('snake_case') || lower.includes('snake case')) {
        transformed = target
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim()
          .replace(/\s+/g, '_');
      } else if (lower.includes('kebab-case') || lower.includes('kebab case')) {
        transformed = target
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim()
          .replace(/\s+/g, '-');
      } else if (lower.includes('camelcase') || lower.includes('camel case')) {
        transformed = target
          .toLowerCase()
          .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
            if (+match === 0) return '';
            return index === 0 ? match.toLowerCase() : match.toUpperCase();
          });
      } else if (lower.includes('uppercase')) {
        transformed = target.toUpperCase();
      } else if (lower.includes('lowercase')) {
        transformed = target.toLowerCase();
      } else if (lower.includes('title case')) {
        transformed = target.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      } else {
        transformed = target.toUpperCase();
      }

      return {
        output: transformed,
        isValidJson: false,
      };
    }

    case 'LOCAL_CSV_TO_JSON': {
      const payload = extractPayload(trimmed);
      const target = payload.length > 5 ? payload : trimmed;
      const lines = target.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        return {
          output: JSON.stringify({ error: 'At least 2 rows (header + data) required for CSV conversion.' }, null, 2),
          isValidJson: true,
        };
      }

      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());

      const records = lines.slice(1).map((line) => {
        const values = line.split(delimiter).map((v) => v.replace(/^["']|["']$/g, '').trim());
        const obj: Record<string, string | number> = {};
        headers.forEach((h, i) => {
          const val = values[i] !== undefined ? values[i] : '';
          const num = Number(val);
          obj[h] = !isNaN(num) && val !== '' ? num : val;
        });
        return obj;
      });

      return {
        output: JSON.stringify(records, null, 2),
        isValidJson: true,
      };
    }

    case 'LOCAL_BASE64_TRANSFORM': {
      const payload = extractPayload(trimmed);
      const target = payload.length > 0 ? payload : trimmed;
      const isDecode = /decode/i.test(trimmed);

      try {
        if (isDecode) {
          const decoded = Buffer.from(target, 'base64').toString('utf-8');
          return { output: decoded, isValidJson: false };
        } else {
          const encoded = Buffer.from(target, 'utf-8').toString('base64');
          return { output: encoded, isValidJson: false };
        }
      } catch (err: any) {
        return { output: `Base64 Error: ${err.message}`, isValidJson: false };
      }
    }

    case 'LOCAL_EXTRACT_URLS': {
      const payload = extractPayload(trimmed);
      const matches = payload.match(URL_REGEX) || trimmed.match(URL_REGEX) || [];
      const unique = Array.from(new Set(matches));

      const structured = {
        totalUrlsFound: unique.length,
        urls: unique,
        secureCount: unique.filter((u) => u.startsWith('https://')).length,
        insecureCount: unique.filter((u) => u.startsWith('http://')).length,
        processedBy: 'Local Deterministic URI Parser',
      };

      return {
        output: JSON.stringify(structured, null, 2),
        isValidJson: true,
      };
    }

    default:
      return {
        output: trimmed,
        isValidJson: false,
      };
  }
}
