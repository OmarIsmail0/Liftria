export interface MaskOptions {
  /** Keep the text inside quotes and template literals (comments and regex bodies are still masked). */
  keepStrings?: boolean;
}

/** Characters after which a `/` starts a regular expression instead of dividing. */
const REGEX_PRECEDERS = '(,=:[!&|?{};+-*%~^';
const REGEX_KEYWORDS = ['return', 'typeof', 'case', 'in', 'of', 'void', 'delete', 'throw', 'new', 'else', 'do'];

const blank = (ch: string): string => (ch === '\n' || ch === '\r' ? ch : ' ');

function startsRegex(code: string, slash: number): boolean {
  let i = slash - 1;
  while (i >= 0 && /\s/.test(code[i] ?? '')) i--;
  if (i < 0) return true;
  const prev = code[i] ?? '';
  if (REGEX_PRECEDERS.includes(prev)) return true;
  if (prev === '>') return code[i - 1] === '=';
  if (!/[A-Za-z]/.test(prev)) return false;
  let start = i;
  while (start > 0 && /[A-Za-z]/.test(code[start - 1] ?? '')) start--;
  return REGEX_KEYWORDS.includes(code.slice(start, i + 1)) && !/[\w$.]/.test(code[start - 1] ?? '');
}

/**
 * Replaces comments, string and template text and regex bodies with spaces, keeping every
 * newline and every character offset, so a scanner can match real code only and still report
 * the right line. Quoted strings end at a line break, so a stray apostrophe in JSX text can
 * only hide the rest of its own line.
 */
export function maskNonCode(code: string, options: MaskOptions = {}): string {
  const keep = options.keepStrings === true;
  const templateDepths: number[] = [];
  let braceDepth = 0;
  let out = '';
  let i = 0;
  let inTemplate = false;

  while (i < code.length) {
    const ch = code[i] ?? '';
    const next = code[i + 1] ?? '';

    if (inTemplate) {
      if (ch === '\\') {
        out += keep ? ch + next : blank(ch) + blank(next);
        i += 2;
      } else if (ch === '`') {
        out += ch;
        inTemplate = false;
        i++;
      } else if (ch === '$' && next === '{') {
        out += '${';
        templateDepths.push(braceDepth);
        braceDepth++;
        inTemplate = false;
        i += 2;
      } else {
        out += keep ? ch : blank(ch);
        i++;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') {
        out += blank(code[i] ?? '');
        i++;
      }
    } else if (ch === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? code.length : end + 2;
      while (i < stop) {
        out += blank(code[i] ?? '');
        i++;
      }
    } else if (ch === '"' || ch === "'") {
      out += ch;
      i++;
      while (i < code.length && code[i] !== ch && code[i] !== '\n') {
        if (code[i] === '\\' && i + 1 < code.length) {
          out += keep ? code.slice(i, i + 2) : '  ';
          i += 2;
        } else {
          out += keep ? (code[i] ?? '') : ' ';
          i++;
        }
      }
      if (code[i] === ch) {
        out += ch;
        i++;
      }
    } else if (ch === '`') {
      out += ch;
      inTemplate = true;
      i++;
    } else if (ch === '/' && startsRegex(code, i)) {
      out += ch;
      i++;
      let inClass = false;
      while (i < code.length && code[i] !== '\n' && (inClass || code[i] !== '/')) {
        const current = code[i] ?? '';
        if (current === '\\' && i + 1 < code.length) {
          out += '  ';
          i += 2;
          continue;
        }
        if (current === '[') inClass = true;
        else if (current === ']') inClass = false;
        out += ' ';
        i++;
      }
      if (code[i] === '/') {
        out += '/';
        i++;
      }
    } else {
      if (ch === '{') braceDepth++;
      if (ch === '}') {
        braceDepth--;
        if (templateDepths.length > 0 && templateDepths[templateDepths.length - 1] === braceDepth) {
          templateDepths.pop();
          inTemplate = true;
        }
      }
      out += ch;
      i++;
    }
  }
  return out;
}

export const lineOf = (code: string, index: number): number => code.slice(0, index).split('\n').length;
