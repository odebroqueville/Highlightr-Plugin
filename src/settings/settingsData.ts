import type { Language } from "../i18n";

export const HIGHLIGHTER_STYLES = [
  "none",
  "lowlight",
  "floating",
  "rounded",
  "realistic",
];

export const HIGHLIGHTER_METHODS = ["css-classes", "inline-styles"];

export interface Highlighters {
  [color: string]: string;
}

export interface HighlighterClasses {
  [color: string]: string;
}

export interface HighlighterActivity {
  [color: string]: boolean;
}

export function createDefaultHighlighterClass(colorName: string): string {
  return colorName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

export interface HighlightrSettings {
  highlighterStyle: string;
  focusHighlightsAndNotes: boolean;
  highlighterMethods: string;
  highlighterLanguage: Language;
  highlighters: Highlighters;
  highlighterClasses: HighlighterClasses;
  highlighterActivity: HighlighterActivity;
  highlighterOrder: string[];
  conflictScanScope: "active-file" | "folder" | "vault";
  conflictScanFolder: string;
}

const DEFAULT_SETTINGS: HighlightrSettings = {
  highlighterStyle: "none",
  focusHighlightsAndNotes: false,
  highlighterMethods: "inline-styles",
  highlighterLanguage: "auto",
  highlighters: {
    Pink: "#FFB8EBE6",
    Red: "#FF5582E6",
    Orange: "#FFB86CE6",
    Yellow: "#FFF3A3E6",
    Green: "#BBFABBE6",
    Cyan: "#ABF7F7E6",
    Blue: "#ADCCFFE6",
    Purple: "#D2B3FFE6",
    Grey: "#CACFD9E6",
  },
  highlighterClasses: {},
  highlighterActivity: {},
  highlighterOrder: [],
  conflictScanScope: "active-file",
  conflictScanFolder: "",
};

DEFAULT_SETTINGS.highlighterOrder = Object.keys(DEFAULT_SETTINGS.highlighters);
DEFAULT_SETTINGS.highlighterOrder.forEach((highlighter) => {
  DEFAULT_SETTINGS.highlighterClasses[highlighter] = createDefaultHighlighterClass(highlighter);
  DEFAULT_SETTINGS.highlighterActivity[highlighter] = true;
});

export default DEFAULT_SETTINGS;
