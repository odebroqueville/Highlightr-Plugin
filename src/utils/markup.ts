import type { EnhancedEditor } from "../settings/types";

export interface EditorRange {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
}

export interface ParsedMark {
  attributes: string;
  innerContent: string;
  hasStyle: boolean;
  hasHighlightClass: boolean;
  hasHighlight: boolean;
  hasDataNote: boolean;
  hasDataTags: boolean;
  hasAnnotation: boolean;
  note: string;
  tags: string;
}

export const MARK_REGEX = /<mark\b[^>]*>[\s\S]*?<\/mark>/g;

export function escapeAttributeValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function unescapeAttributeValue(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function getAttribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return match ? unescapeAttributeValue(match[1]) : null;
}

export function hasHighlightClass(attributes: string): boolean {
  const classValue = getAttribute(attributes, "class");
  if (!classValue) return false;
  return classValue.split(/\s+/).some((token) => token.startsWith("hltr-"));
}

export function parseMark(markText: string): ParsedMark | null {
  const match = markText.match(/^<mark\b([^>]*)>([\s\S]*?)<\/mark>$/i);
  if (!match) return null;
  const attributes = (match[1] || "").trim();
  const note = getAttribute(attributes, "data-note") ?? "";
  const tags = getAttribute(attributes, "data-tags") ?? "";
  const hasDataNote = /\bdata-note\s*=/.test(attributes);
  const hasDataTags = /\bdata-tags\s*=/.test(attributes);
  const hasStyle = /\bstyle\s*=/.test(attributes);
  const highlightClass = hasHighlightClass(attributes);
  return {
    attributes,
    innerContent: match[2],
    hasStyle,
    hasHighlightClass: highlightClass,
    hasHighlight: hasStyle || highlightClass,
    hasDataNote,
    hasDataTags,
    hasAnnotation: hasDataNote || hasDataTags,
    note,
    tags,
  };
}

export function setAttribute(attributes: string, name: string, value: string): string {
  const escaped = escapeAttributeValue(value);
  const regex = new RegExp(`\\b${name}="[^"]*"`, "i");
  if (regex.test(attributes)) {
    return attributes.replace(regex, `${name}="${escaped}"`).trim();
  }
  return `${attributes} ${name}="${escaped}"`.trim();
}

export function removeAttribute(attributes: string, name: string): string {
  return attributes
    .replace(new RegExp(`\\s*\\b${name}="[^"]*"`, "ig"), "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function removeHighlightStyling(attributes: string): string {
  let next = removeAttribute(attributes, "style");
  const classValue = getAttribute(next, "class");
  if (!classValue) return next;
  const remainingClasses = classValue
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !token.startsWith("hltr-"));
  if (remainingClasses.length === 0) {
    next = removeAttribute(next, "class");
    return next;
  }
  return setAttribute(next, "class", remainingClasses.join(" "));
}

export function createMark(innerContent: string, attributes: string): string {
  const attr = attributes.trim();
  if (!attr) return `<mark>${innerContent}</mark>`;
  return `<mark ${attr}>${innerContent}</mark>`;
}

export function findMarkRangeAt(
  editor: EnhancedEditor,
  pos: { line: number; ch: number },
): EditorRange | null {
  const line = editor.getLine(pos.line);
  MARK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARK_REGEX.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (pos.ch >= start && pos.ch <= end) {
      return {
        from: { line: pos.line, ch: start },
        to: { line: pos.line, ch: end },
      };
    }
  }
  return null;
}

export function findLastMarkRangeBefore(
  editor: EnhancedEditor,
  pos: { line: number; ch: number },
): EditorRange | null {
  const line = editor.getLine(pos.line);
  MARK_REGEX.lastIndex = 0;
  let result: EditorRange | null = null;
  let match: RegExpExecArray | null;
  while ((match = MARK_REGEX.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (end <= pos.ch + 1) {
      result = {
        from: { line: pos.line, ch: start },
        to: { line: pos.line, ch: end },
      };
      continue;
    }
    break;
  }
  return result;
}

export function findMarkRangeAtCoords(
  editor: EnhancedEditor,
  x: number,
  y: number,
): EditorRange | null {
  const cm = editor.cm;
  if (!cm) return null;
  let offset: number | null = null;
  try {
    if (typeof cm.posAtCoords === "function") {
      const result = cm.posAtCoords({ x, y });
      if (typeof result === "number") offset = result;
      else if (result && typeof result.pos === "number") offset = result.pos;
    }
  } catch {
    offset = null;
  }
  if (offset == null) return null;
  try {
    const pos = editor.offsetToPos(offset);
    return findMarkRangeAt(editor, pos);
  } catch {
    return null;
  }
}

export function findMarkRangeBeforeCoords(
  editor: EnhancedEditor,
  x: number,
  y: number,
): EditorRange | null {
  const cm = editor.cm;
  if (!cm) return null;
  let offset: number | null = null;
  try {
    if (typeof cm.posAtCoords === "function") {
      const result = cm.posAtCoords({ x, y });
      if (typeof result === "number") offset = result;
      else if (result && typeof result.pos === "number") offset = result.pos;
    }
  } catch {
    offset = null;
  }
  if (offset == null) return null;
  try {
    const pos = editor.offsetToPos(offset);
    return findLastMarkRangeBefore(editor, pos);
  } catch {
    return null;
  }
}

export function findMarkRangeAtCursor(editor: EnhancedEditor): EditorRange | null {
  return findMarkRangeAt(editor, editor.getCursor("from"));
}
