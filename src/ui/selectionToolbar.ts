import { setIcon } from "obsidian";
import type { HighlightrSettings } from "../settings/settingsData";
import { toSolidColor } from "../utils/color";
import { t } from "../i18n";

export interface SelectionToolbarHandlers {
  onPickColor: (highlighter: string) => void;
  onErase: () => void;
  onAnnotate: () => void;
  onPickStyle: (style: string) => void;
}

export interface SelectionToolbarShowOptions {
  doc: Document;
  /** Horizontal anchor (center of the selection / mouse release point). */
  x: number;
  /** Vertical anchor (top of the selection). The bar is drawn above it. */
  y: number;
  /** Whether the "erase highlight" action applies to the current selection. */
  canErase: boolean;
}

const EDIT_KEYS = ["Backspace", "Delete", "Enter", "Tab"];
const NAVIGATION_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];
const STYLE_VALUES = ["none", "lowlight", "floating", "rounded", "realistic"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * A Word-like mini toolbar that pops up near the current text selection and
 * lets the user pick a highlighter color (plus erase / annotate actions)
 * without going through the context menu.
 */
export class SelectionToolbar {
  private el: HTMLElement | null = null;
  private stylePanel: HTMLElement | null = null;
  private doc: Document | null = null;
  private visible = false;
  private cleanup: Array<() => void> = [];
  private handlers: SelectionToolbarHandlers = {
    onPickColor: () => undefined,
    onErase: () => undefined,
    onAnnotate: () => undefined,
    onPickStyle: () => undefined,
  };

  constructor(private readonly getSettings: () => HighlightrSettings) {}

  setHandlers(handlers: SelectionToolbarHandlers): void {
    this.handlers = handlers;
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** True when the given node lives inside the floating bar (or its style panel). */
  contains(node: Node | null): boolean {
    if (!node) {
      return false;
    }
    if (this.el && this.el.contains(node)) {
      return true;
    }
    return !!this.stylePanel && this.stylePanel.contains(node);
  }

  hide(): void {
    this.closeStylePanel();
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    this.cleanup.forEach((dispose) => dispose());
    this.cleanup = [];
    this.doc = null;
    this.visible = false;
  }

  show(options: SelectionToolbarShowOptions): void {
    this.hide();

    const doc = options.doc;
    const win = doc.defaultView;
    if (!win) {
      return;
    }

    const settings = this.getSettings();
    const el = doc.createElement("div");
    el.className = "hltr-selection-toolbar";
    el.style.left = "0px";
    el.style.top = "0px";

    // Prevent the browser from collapsing the underlying text selection /
    // stealing focus when the user clicks on the toolbar.
    el.addEventListener("mousedown", (event: MouseEvent) => event.preventDefault());

    const ordered =
      settings.highlighterOrder.length > 0
        ? settings.highlighterOrder
        : Object.keys(settings.highlighters);
    const activeHighlighters = ordered.filter(
      (highlighter) => settings.highlighterActivity?.[highlighter] !== false,
    );

    activeHighlighters.forEach((highlighter) => {
      const color = settings.highlighters[highlighter] ?? "";
      const swatch = doc.createElement("button");
      swatch.type = "button";
      swatch.className = "hltr-selection-toolbar-swatch";
      swatch.title = color && color.trim().length > 0 ? `${highlighter} (${color})` : highlighter;
      swatch.setAttribute("aria-label", highlighter);
      swatch.style.setProperty(
        "--hltr-color",
        color && color.trim().length > 0 ? toSolidColor(color) : "transparent",
      );
      swatch.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        this.hide();
        this.handlers.onPickColor(highlighter);
      });
      el.appendChild(swatch);
    });

    const separator = doc.createElement("span");
    separator.className = "hltr-selection-toolbar-sep";
    el.appendChild(separator);

    const eraseButton = doc.createElement("button");
    eraseButton.type = "button";
    eraseButton.className = "hltr-selection-toolbar-btn";
    if (!options.canErase) {
      eraseButton.classList.add("is-disabled");
      eraseButton.disabled = true;
    }
    eraseButton.title = t("toolbar.erase");
    eraseButton.setAttribute("aria-label", t("toolbar.erase"));
    setIcon(eraseButton, "highlightr-eraser");
    eraseButton.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      if (options.canErase) {
        this.handlers.onErase();
      }
    });
    el.appendChild(eraseButton);

    const annotateButton = doc.createElement("button");
    annotateButton.type = "button";
    annotateButton.className = "hltr-selection-toolbar-btn";
    annotateButton.title = t("toolbar.annotate");
    annotateButton.setAttribute("aria-label", t("toolbar.annotate"));
    setIcon(annotateButton, "sticky-note");
    annotateButton.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      this.handlers.onAnnotate();
    });
    el.appendChild(annotateButton);

    const styleButton = doc.createElement("button");
    styleButton.type = "button";
    styleButton.className = "hltr-selection-toolbar-btn";
    styleButton.title = t("toolbar.style");
    styleButton.setAttribute("aria-label", t("toolbar.style"));
    setIcon(styleButton, "palette");
    styleButton.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.stylePanel) {
        this.closeStylePanel();
        return;
      }
      this.openStylePanel(el, doc, settings);
    });
    el.appendChild(styleButton);

    doc.body.appendChild(el);

    const barWidth = el.offsetWidth || 120;
    const barHeight = el.offsetHeight || 36;
    const viewportWidth = win.innerWidth;
    const viewportHeight = win.innerHeight;

    let left = Math.round(options.x - barWidth / 2);
    let top = Math.round(options.y - barHeight - 10);
    if (top < 8) {
      top = Math.round(options.y + 10);
    }
    left = clamp(left, 8, Math.max(8, viewportWidth - barWidth - 8));
    top = clamp(top, 6, Math.max(6, viewportHeight - barHeight - 6));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;

    const onMousedown = (event: MouseEvent) => {
      if (this.contains(event.target as Node | null)) {
        return;
      }
      this.hide();
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (!this.el) return;
      if (event.key === "Escape") {
        this.hide();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const activeElement = doc.activeElement as HTMLElement | null;
      const editingInEditor = !!(
        activeElement &&
        typeof activeElement.closest === "function" &&
        activeElement.closest(".cm-content")
      );
      if (!editingInEditor) {
        return;
      }
      // While the user is extending the selection with Shift + Arrow keys,
      // keep the toolbar visible so it can follow the selection.
      if (event.shiftKey && NAVIGATION_KEYS.includes(event.key)) {
        return;
      }
      if (event.key.length === 1 || EDIT_KEYS.includes(event.key) || NAVIGATION_KEYS.includes(event.key)) {
        this.hide();
      }
    };
    const onScroll = () => this.hide();
    const onBlur = () => this.hide();

    win.addEventListener("mousedown", onMousedown, true);
    win.addEventListener("keydown", onKeydown, true);
    doc.addEventListener("scroll", onScroll, true);
    win.addEventListener("blur", onBlur);

    this.cleanup.push(() => win.removeEventListener("mousedown", onMousedown, true));
    this.cleanup.push(() => win.removeEventListener("keydown", onKeydown, true));
    this.cleanup.push(() => doc.removeEventListener("scroll", onScroll, true));
    this.cleanup.push(() => win.removeEventListener("blur", onBlur));

    this.el = el;
    this.doc = doc;
    this.visible = true;
  }

  private closeStylePanel(): void {
    if (this.stylePanel) {
      this.stylePanel.remove();
      this.stylePanel = null;
    }
  }

  private styleLabel(value: string): string {
    switch (value) {
      case "none":
        return t("styleItems.none");
      case "lowlight":
        return t("styleItems.lowlight");
      case "floating":
        return t("styleItems.floating");
      case "rounded":
        return t("styleItems.rounded");
      case "realistic":
        return t("styleItems.realistic");
      default:
        return value;
    }
  }

  private openStylePanel(bar: HTMLElement, doc: Document, settings: HighlightrSettings): void {
    this.closeStylePanel();
    const panel = doc.createElement("div");
    panel.className = "hltr-style-panel";

    STYLE_VALUES.forEach((value) => {
      const item = doc.createElement("button");
      item.type = "button";
      item.className = "hltr-style-panel-item";
      item.textContent = this.styleLabel(value);
      item.title = value;
      if (settings.highlighterStyle === value) {
        item.classList.add("is-active");
      }
      item.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        // Keep the toolbar (and the text selection) open so the user can still
        // pick a color afterwards — only the style panel closes.
        this.closeStylePanel();
        this.handlers.onPickStyle(value);
      });
      panel.appendChild(item);
    });

    // Keep the text selection intact when interacting with the style panel.
    panel.addEventListener("mousedown", (event: MouseEvent) => event.preventDefault());

    doc.body.appendChild(panel);
    const barRect = bar.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const win = doc.defaultView;
    if (win) {
      const maxLeft = Math.max(8, win.innerWidth - panelRect.width - 8);
      const maxTop = Math.max(6, win.innerHeight - panelRect.height - 6);
      const left = Math.min(Math.max(barRect.left, 8), maxLeft);
      const top = barRect.bottom + 4 > maxTop ? Math.max(6, barRect.top - panelRect.height - 4) : barRect.bottom + 4;
      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${Math.round(top)}px`;
    }
    this.stylePanel = panel;
  }
}
