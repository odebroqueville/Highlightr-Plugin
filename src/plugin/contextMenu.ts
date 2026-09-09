import type HighlightrPlugin from "./main";
import { Menu } from "obsidian";
import { HighlightrSettings } from "../settings/settingsData";
import { EnhancedApp, EnhancedEditor } from "../settings/types";
import {
  applyHighlightToMark,
  applyHighlightToSelection,
  annotateExistingMark,
  annotatePlainSelection,
  eraseAnnotationFromMark,
  eraseHighlightAndAnnotation,
  eraseHighlightRange,
} from "./highlightActions";
import {
  EditorRange,
  findMarkRangeAtCoords,
  findMarkRangeAtCursor,
  findMarkRangeBeforeCoords,
  parseMark,
} from "../utils/markup";
import { toSolidColor } from "../utils/color";
import { t } from "../i18n";

interface LastContextClick {
  target: EventTarget | null;
  x: number;
  y: number;
  time: number;
}

interface ContextMenuItem {
  dom?: HTMLElement;
  setSubmenu?: () => Menu & { setUseNativeMenu?: (useNativeMenu: boolean) => Menu };
  setTitle?: (title: string) => unknown;
  setIcon?: (icon: string) => unknown;
  onClick?: (handler: () => void) => unknown;
}

const lastContextClick: LastContextClick = {
  target: null,
  x: 0,
  y: 0,
  time: 0,
};

let listenerInstalled = false;

function ensureContextMenuListener() {
  if (listenerInstalled) return;
  listenerInstalled = true;
  window.addEventListener(
    "contextmenu",
    (evt: MouseEvent) => {
      lastContextClick.target = evt.target;
      lastContextClick.x = evt.clientX;
      lastContextClick.y = evt.clientY;
      lastContextClick.time = Date.now();
    },
    true,
  );
}

function findAncestor(el: Element | null, className: string, doc?: Document): Element | null {
  let node = el;
  const body = doc?.body ?? activeDocument.body;
  while (node && node !== body) {
    if (node.classList.contains(className)) return node;
    node = node.parentElement;
  }
  return null;
}

function isHighlightedElement(el: Element | null, doc?: Document): boolean {
  let node: Element | null = el;
  const body = doc?.body ?? activeDocument.body;
  while (node && node !== body) {
    if (node.tagName === "MARK") return true;
    const cls = node.classList;
    if (cls && (cls.contains("cm-highlight") || cls.contains("cm-formatting-highlight"))) {
      return true;
    }
    if (cls) {
      for (let i = 0; i < cls.length; i++) {
        if (cls[i].startsWith("hltr-")) return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

function getActiveHighlighters(settings: HighlightrSettings): string[] {
  const ordered = settings.highlighterOrder.length > 0
    ? settings.highlighterOrder
    : Object.keys(settings.highlighters);
  return ordered.filter((highlighter) => settings.highlighterActivity?.[highlighter] !== false);
}

function addColorSubmenu(
  menu: Menu,
  title: string,
  settings: HighlightrSettings,
  onColor: (highlighter: string, color: string) => void,
): void {
  const orderedHighlighters = getActiveHighlighters(settings);
  if (orderedHighlighters.length === 0) {
    return;
  }

  menu.addItem((item) => {
    item.setTitle(title).setIcon("highlightr-pen");
    const contextItem = item as unknown as ContextMenuItem;
    if (typeof contextItem.setSubmenu !== "function") {
      item.onClick(() => {
        const first = getActiveHighlighters(settings)[0];
        if (!first) return;
        onColor(first, settings.highlighters[first]);
      });
      return;
    }
    const submenu = contextItem.setSubmenu();
    submenu?.setUseNativeMenu?.(false);
    orderedHighlighters.forEach((highlighter) => {
      submenu?.addItem((highlighterItem) => {
        const menuItem = highlighterItem as unknown as ContextMenuItem;
        const color = settings.highlighters[highlighter];
        menuItem.setTitle?.(highlighter);
        menuItem.setIcon?.("highlighter");
        menuItem.onClick?.(() => onColor(highlighter, color));
        const itemDom = menuItem.dom;
        if (itemDom) {
          itemDom.addClass("highlightr-color-menu-item");
          const previewColor = color && color.trim().length > 0 ? toSolidColor(color) : "transparent";
          itemDom.style.setProperty("--highlightr-color", previewColor);
        }
      });
    });
  });
}

export default function contextMenu(
  app: EnhancedApp,
  menu: Menu,
  editor: EnhancedEditor,
  plugin: HighlightrPlugin,
  settings: HighlightrSettings,
): void {
  ensureContextMenuListener();

  const selection = editor.getSelection();
  const hasSelection = selection.length > 0;
  const initialSelectionRange = hasSelection
    ? { from: editor.getCursor("from"), to: editor.getCursor("to") }
    : null;

  const menuWithNativeToggle = menu as Menu & {
    setUseNativeMenu?: (useNativeMenu: boolean) => Menu;
  };
  menuWithNativeToggle.setUseNativeMenu?.(false);

  const selectedMark = hasSelection ? parseMark(selection) : null;
  const selectedMarkRange = selectedMark
    ? { from: editor.getCursor("from"), to: editor.getCursor("to") }
    : null;

  let clickedMarkRange: EditorRange | null = null;
  let clickedNoteIcon = false;

  if (Date.now() - lastContextClick.time < 1500) {
    const target = lastContextClick.target as Element | null;
    const activeDoc = app.workspace.activeDocument ?? activeDocument;
    const noteIcon = target ? findAncestor(target, "note-icon", activeDoc) : null;
    clickedNoteIcon = !!noteIcon;
    if (clickedNoteIcon) {
      clickedMarkRange = findMarkRangeBeforeCoords(editor, lastContextClick.x, lastContextClick.y);
    } else if (target && isHighlightedElement(target, activeDoc)) {
      clickedMarkRange = findMarkRangeAtCoords(editor, lastContextClick.x, lastContextClick.y);
    }
  }

  const cursorMarkRange = !selectedMark ? findMarkRangeAtCursor(editor) : null;
  const activeRange = selectedMarkRange ?? clickedMarkRange ?? cursorMarkRange;

  const activeMarkText = activeRange ? editor.getRange(activeRange.from, activeRange.to) : null;
  const activeMark = activeMarkText ? parseMark(activeMarkText) : null;

  const hasActiveMark = !!activeRange && !!activeMark;
  const hasActiveAnnotation = hasActiveMark ? activeMark.hasAnnotation : false;
  const hasActiveHighlight = hasActiveMark ? activeMark.hasHighlight : false;

  const finalizeAfterEdit = () => {
    plugin.suppressFullPostProcessing(450);
    plugin.syncDecorationsNearSelection(editor);
  };

  if (!hasActiveMark && hasSelection) {
    addColorSubmenu(menu, t("menu.highlight"), settings, (highlighter, color) => {
      applyHighlightToSelection(editor, initialSelectionRange, highlighter, color, settings, finalizeAfterEdit);
    });

    menu.addItem((item) => {
      item
        .setTitle(t("menu.annotate"))
        .setIcon("sticky-note")
        .onClick(() => {
          void annotatePlainSelection(app, editor, initialSelectionRange, finalizeAfterEdit);
        });
    });
    return;
  }

  if (!hasActiveMark || !activeRange || !activeMark) {
    return;
  }

  if (hasActiveHighlight && !hasActiveAnnotation) {
    menu.addItem((item) => {
      item
        .setTitle(t("menu.unhighlight"))
        .setIcon("highlightr-eraser")
        .onClick(() => eraseHighlightRange(editor, activeRange, activeMark, finalizeAfterEdit));
    });

    addColorSubmenu(menu, t("menu.changeColor"), settings, (highlighter, color) => {
      applyHighlightToMark(editor, activeRange, activeMark, highlighter, color, settings, finalizeAfterEdit);
    });

    menu.addItem((item) => {
      item
        .setTitle(t("menu.annotate"))
        .setIcon("sticky-note")
        .onClick(() => {
          void annotateExistingMark(app, editor, activeRange, activeMark, false, finalizeAfterEdit);
        });
    });
    return;
  }

  if (hasActiveHighlight && hasActiveAnnotation) {
    menu.addItem((item) => {
      item
        .setTitle(t("menu.unhighlight"))
        .setIcon("highlightr-eraser")
        .onClick(() => eraseHighlightRange(editor, activeRange, activeMark, finalizeAfterEdit));
    });

    addColorSubmenu(menu, t("menu.changeColor"), settings, (highlighter, color) => {
      applyHighlightToMark(editor, activeRange, activeMark, highlighter, color, settings, finalizeAfterEdit);
    });

    menu.addItem((item) => {
      item
        .setTitle(t("menu.eraseAnnotation"))
        .setIcon("trash")
        .onClick(() => eraseAnnotationFromMark(editor, activeRange, activeMark, finalizeAfterEdit));
    });

    menu.addItem((item) => {
      item
        .setTitle(t("menu.eraseHighlightAndAnnotation"))
        .setIcon("trash")
        .onClick(() => eraseHighlightAndAnnotation(editor, activeRange, activeMark, finalizeAfterEdit));
    });

    menu.addItem((item) => {
      item
        .setTitle(t("menu.editAnnotation"))
        .setIcon("pencil")
        .onClick(() => {
          void annotateExistingMark(app, editor, activeRange, activeMark, true, finalizeAfterEdit);
        });
    });
    return;
  }

  if (!hasActiveHighlight && hasActiveAnnotation) {
    addColorSubmenu(menu, t("menu.highlight"), settings, (highlighter, color) => {
      applyHighlightToMark(editor, activeRange, activeMark, highlighter, color, settings, finalizeAfterEdit);
    });

    menu.addItem((item) => {
      item
        .setTitle(t("menu.eraseAnnotation"))
        .setIcon("trash")
        .onClick(() => eraseAnnotationFromMark(editor, activeRange, activeMark, finalizeAfterEdit));
    });

    menu.addItem((item) => {
      item
        .setTitle(t("menu.editAnnotation"))
        .setIcon("pencil")
        .onClick(() => {
          void annotateExistingMark(app, editor, activeRange, activeMark, true, finalizeAfterEdit);
        });
    });
    return;
  }

  if (clickedNoteIcon) {
    addColorSubmenu(menu, t("menu.highlight"), settings, (highlighter, color) => {
      applyHighlightToMark(editor, activeRange, activeMark, highlighter, color, settings, finalizeAfterEdit);
    });
  }
}
