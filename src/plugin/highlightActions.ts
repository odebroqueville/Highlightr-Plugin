import type { HighlightrSettings } from "../settings/settingsData";
import { createDefaultHighlighterClass } from "../settings/settingsData";
import type { EnhancedApp, EnhancedEditor } from "../settings/types";
import { annotateWithModal } from "../ui/annotationModal";
import {
  EditorRange,
  ParsedMark,
  MARK_REGEX,
  createMark,
  escapeAttributeValue,
  getAttribute,
  parseMark,
  removeAttribute,
  removeHighlightStyling,
  setAttribute,
} from "../utils/markup";

export type FinalizeAfterEdit = () => void;

function replaceRange(editor: EnhancedEditor, range: EditorRange, nextText: string): void {
  editor.setSelection(range.from, range.to);
  editor.replaceSelection(nextText);
  editor.focus();
}

/**
 * Wraps a plain-text selection in <mark> tags using the given highlighter.
 */
export function applyHighlightToSelection(
  editor: EnhancedEditor,
  range: EditorRange,
  highlighter: string,
  color: string,
  settings: HighlightrSettings,
  finalize: FinalizeAfterEdit,
): void {
  const selectionText = editor.getRange(range.from, range.to);
  if (!selectionText.length) return;
  const isCssClassesMode = settings.highlighterMethods === "css-classes";
  const className = (settings.highlighterClasses?.[highlighter] ?? createDefaultHighlighterClass(highlighter)).toLowerCase();
  const wrapped = isCssClassesMode
    ? `<mark class="hltr-${className}" style="--hltr-color: ${color};">${selectionText}</mark>`
    : `<mark style="background-color: ${color};">${selectionText}</mark>`;
  replaceRange(editor, range, wrapped);
  finalize();
}

/**
 * Re-colors (or highlights) an existing <mark> element.
 */
export function applyHighlightToMark(
  editor: EnhancedEditor,
  range: EditorRange,
  parsed: ParsedMark,
  highlighter: string,
  color: string,
  settings: HighlightrSettings,
  finalize: FinalizeAfterEdit,
): void {
  let attributes = parsed.attributes;
  attributes = removeHighlightStyling(attributes);
  if (settings.highlighterMethods === "css-classes") {
    const className = (settings.highlighterClasses?.[highlighter] ?? createDefaultHighlighterClass(highlighter)).toLowerCase();
    const classValue = getAttribute(attributes, "class");
    const remainingClasses = classValue
      ? classValue
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token.length > 0 && !token.startsWith("hltr-"))
      : [];
    remainingClasses.push(`hltr-${className}`);
    attributes = setAttribute(attributes, "class", remainingClasses.join(" "));
    attributes = setAttribute(attributes, "style", `--hltr-color: ${color};`);
  } else {
    attributes = setAttribute(attributes, "style", `background-color: ${color};`);
  }
  replaceRange(editor, range, createMark(parsed.innerContent, attributes));
  finalize();
}

/**
 * Removes the highlight of a mark. If the mark also carries annotations the
 * mark element is kept (without its highlight styling); otherwise it is
 * unwrapped back to plain text.
 */
export function eraseHighlightRange(
  editor: EnhancedEditor,
  range: EditorRange,
  parsed: ParsedMark,
  finalize: FinalizeAfterEdit,
): void {
  if (parsed.hasAnnotation) {
    const attributes = removeHighlightStyling(parsed.attributes);
    replaceRange(editor, range, createMark(parsed.innerContent, attributes));
    finalize();
    return;
  }
  replaceRange(editor, range, parsed.innerContent);
  finalize();
}

/**
 * Removes annotation attributes (data-note / data-tags) from a mark.
 */
export function eraseAnnotationFromMark(
  editor: EnhancedEditor,
  range: EditorRange,
  parsed: ParsedMark,
  finalize: FinalizeAfterEdit,
): void {
  let attributes = parsed.attributes;
  attributes = removeAttribute(attributes, "data-note");
  attributes = removeAttribute(attributes, "data-tags");
  if (!attributes.trim()) {
    replaceRange(editor, range, parsed.innerContent);
    finalize();
    return;
  }
  replaceRange(editor, range, createMark(parsed.innerContent, attributes));
  finalize();
}

/**
 * Removes the highlight and any annotation entirely (unwraps the mark).
 */
export function eraseHighlightAndAnnotation(
  editor: EnhancedEditor,
  range: EditorRange,
  parsed: ParsedMark,
  finalize: FinalizeAfterEdit,
): void {
  replaceRange(editor, range, parsed.innerContent);
  finalize();
}

/**
 * Opens the annotation modal for a plain-text selection and, on submit,
 * wraps it in a <mark data-note ... data-tags ...> element.
 */
export async function annotatePlainSelection(
  app: EnhancedApp,
  editor: EnhancedEditor,
  range: EditorRange,
  finalize: FinalizeAfterEdit,
): Promise<void> {
  const selectionText = editor.getRange(range.from, range.to);
  if (!selectionText.length) return;
  const result = await annotateWithModal(app, "", "");
  if (!result) return;
  if (!result.note.trim() && !result.tags.trim()) return;
  const wrapped = `<mark data-note="${escapeAttributeValue(result.note)}" data-tags="${escapeAttributeValue(result.tags)}">${selectionText}</mark>`;
  replaceRange(editor, range, wrapped);
  finalize();
}

/**
 * Opens the annotation modal to add or edit the annotation of an existing
 * <mark> element.
 */
export async function annotateExistingMark(
  app: EnhancedApp,
  editor: EnhancedEditor,
  range: EditorRange,
  parsed: ParsedMark,
  isEdit: boolean,
  finalize: FinalizeAfterEdit,
): Promise<void> {
  const startNote = isEdit ? parsed.note : "";
  const startTags = isEdit ? parsed.tags : "";
  const result = await annotateWithModal(app, startNote, startTags);
  if (!result) return;
  let attributes = parsed.attributes;
  attributes = setAttribute(attributes, "data-note", result.note);
  attributes = setAttribute(attributes, "data-tags", result.tags);
  replaceRange(editor, range, createMark(parsed.innerContent, attributes));
  finalize();
}

export interface SelectionState {
  kind: "none" | "plain" | "whole-mark" | "inside-mark";
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  text: string;
  markRange?: EditorRange;
  parsed?: ParsedMark;
}

function findContainedSingleMark(
  editor: EnhancedEditor,
  from: { line: number; ch: number },
  to: { line: number; ch: number },
  text: string,
): { range: EditorRange; parsed: ParsedMark } | null {
  if (from.line !== to.line) return null;
  // Selecting raw markup on purpose should not be treated as "inside a mark".
  if (text.indexOf("<") !== -1 || text.indexOf(">") !== -1) return null;
  const lineText = editor.getLine(from.line);
  MARK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARK_REGEX.exec(lineText)) !== null) {
    const openTagEnd = lineText.indexOf(">", match.index);
    const closeTagStart = match.index + match[0].length - "</mark>".length;
    if (openTagEnd === -1 || closeTagStart <= openTagEnd) continue;
    const innerStart = openTagEnd + 1;
    // The whole selection must lie inside the mark's inner content so that
    // acting on it targets the complete existing highlight.
    if (from.ch < innerStart || to.ch > closeTagStart) continue;
    const parsed = parseMark(match[0]);
    if (!parsed) continue;
    return {
      range: {
        from: { line: from.line, ch: match.index },
        to: { line: from.line, ch: match.index + match[0].length },
      },
      parsed,
    };
  }
  return null;
}

/**
 * Analyzes the current editor selection so the floating toolbar (and other
 * callers) can decide whether the user selected plain text, a full <mark>
 * element (including its tags) or just the inner text of a single mark.
 */
export function resolveSelectionState(editor: EnhancedEditor): SelectionState {
  const text = editor.getSelection();
  const from = editor.getCursor("from");
  const to = editor.getCursor("to");
  if (!text || text.length === 0) {
    return { kind: "none", from, to, text: "" };
  }
  const wholeMark = parseMark(text);
  if (wholeMark) {
    return {
      kind: "whole-mark",
      from,
      to,
      text,
      markRange: { from, to },
      parsed: wholeMark,
    };
  }
  const contained = findContainedSingleMark(editor, from, to, text);
  if (contained) {
    return {
      kind: "inside-mark",
      from,
      to,
      text,
      markRange: contained.range,
      parsed: contained.parsed,
    };
  }
  return { kind: "plain", from, to, text };
}
