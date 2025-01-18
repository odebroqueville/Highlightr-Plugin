import { Editor, Menu, Plugin, PluginManifest, MarkdownView } from "obsidian";
import { wait } from "src/utils/util";
import addIcons from "src/icons/customIcons";
import { HighlightrSettingTab } from "../settings/settingsTab";
import { HighlightrSettings } from "../settings/settingsData";
import DEFAULT_SETTINGS from "../settings/settingsData";
import contextMenu from "src/plugin/contextMenu";
import highlighterMenu from "src/ui/highlighterMenu";
import { createHighlighterIcons } from "src/icons/customIcons";
import { NoteModal } from "src/ui/NoteModal";

import { createStyles } from "src/utils/createStyles";
import { EnhancedApp, EnhancedEditor } from "src/settings/types";

export default class HighlightrPlugin extends Plugin {
  app: EnhancedApp;
  editor: EnhancedEditor;
  manifest: PluginManifest;
  settings: HighlightrSettings;

  async onload() {
    console.log(`Highlightr v${this.manifest.version} loaded`);
    addIcons();

    await this.loadSettings();

    this.app.workspace.onLayoutReady(() => {
      this.reloadStyles(this.settings);
      createHighlighterIcons(this.settings, this);
      this.attachEventListeners();
    });

    this.registerEvent(
      this.app.workspace.on("editor-change", () => {
        this.cleanupNotes();
      })
    );
  }

  onunload() {
    console.log("Highlightr unloaded");
  }

  handleHighlighterInContextMenu = (
    menu: Menu,
    editor: EnhancedEditor
  ): void => {
    contextMenu(this.app, menu, editor, this, this.settings);
  };

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  reloadStyles(settings: HighlightrSettings) {
    let currentSheet = document.querySelector("style#highlightr-styles");
    if (currentSheet) {
      currentSheet.remove();
      createStyles(settings);
    } else {
      createStyles(settings);
    }
  }

  eraseHighlight = (editor: Editor) => {
    const currentStr = editor.getSelection();
    const newStr = currentStr
      .replace(/\<mark style.*?[^\>]\>/g, "")
      .replace(/\<mark class.*?[^\>]\>/g, "")
      .replace(/\<\/mark>/g, "");
    editor.replaceSelection(newStr);
    editor.focus();
  };

  generateCommands(editor: Editor) {
    this.settings.highlighterOrder.forEach((highlighterKey: string) => {
      const applyCommand = (command: CommandPlot, editor: Editor, note: string) => {
        const selectedText = editor.getSelection();
        const noteAttribute = note ? ` data-note="${note}"` : "";
        const prefix =
          this.settings.highlighterMethods === "css-classes"
            ? `<mark class="hltr-${highlighterKey.toLowerCase()}"${noteAttribute}>`
            : `<mark style="background: ${this.settings.highlighters[highlighterKey]};"${noteAttribute}>`;
        const suffix = "</mark>";

        console.log("Applying highlight with note:", note); // Debugging log
        const noteIcon = note ? `<span class="note-icon">:LiStickyNote:</span>` : "";
        editor.replaceSelection(`${prefix}${selectedText}${suffix}${noteIcon}`);
        editor.setCursor(editor.getCursor("to"));
      };

      type CommandPlot = {
        char: number;
        line: number;
        prefix: string;
        suffix: string;
      };

      type commandsPlot = {
        [key: string]: CommandPlot;
      };

      const commandsMap: commandsPlot = {
        highlight: {
          char: 34,
          line: 0,
          prefix:
            this.settings.highlighterMethods === "css-classes"
              ? `<mark class="hltr-${highlighterKey.toLowerCase()}">`
              : `<mark style="background: ${this.settings.highlighters[highlighterKey]};">`,
          suffix: "</mark>",
        },
      };

      Object.keys(commandsMap).forEach((type) => {
        let highlighterpen = `highlightr-pen-${highlighterKey}`.toLowerCase();
        this.addCommand({
          id: highlighterKey,
          name: highlighterKey,
          icon: highlighterpen,
          editorCallback: async (editor: Editor) => {
            new NoteModal(this.app, (note) => {
              applyCommand(commandsMap[type], editor, note);
            }).open();
          },
        });
      });

      this.addCommand({
        id: "unhighlight",
        name: "Remove highlight",
        icon: "highlightr-eraser",
        editorCallback: async (editor: Editor) => {
          this.eraseHighlight(editor);
          editor.focus();
        },
      });
    });
  }

  refresh = () => {
    this.updateStyle();
  };

  updateStyle = () => {
    document.body.classList.toggle(
      "highlightr-lowlight",
      this.settings.highlighterStyle === "lowlight"
    );
    document.body.classList.toggle(
      "highlightr-floating",
      this.settings.highlighterStyle === "floating"
    );
    document.body.classList.toggle(
      "highlightr-rounded",
      this.settings.highlighterStyle === "rounded"
    );
    document.body.classList.toggle(
      "highlightr-realistic",
      this.settings.highlighterStyle === "realistic"
    );
  };

  displayNoteBubble(note: string, event: MouseEvent) {
    const bubble = document.createElement("div");
    bubble.className = "note-bubble";
    bubble.textContent = note;
    bubble.style.position = "absolute";
    bubble.style.left = `${event.pageX}px`;
    bubble.style.top = `${event.pageY}px`;
    bubble.style.backgroundColor = "#ccc";
    bubble.style.border = "1px solid #aaa";
    bubble.style.padding = "5px";
    bubble.style.zIndex = "1000";
    bubble.style.maxWidth = "300px"; // Ensure the width does not exceed 300px
    bubble.style.height = "auto"; // Automatically adjust height to fit content
    bubble.style.overflowWrap = "break-word"; // Ensure long words break to fit within the width
    bubble.style.borderRadius = "8px"; // Rounded corners
    document.body.appendChild(bubble);

    const removeBubble = () => {
      document.body.removeChild(bubble);
      target.removeEventListener("mouseout", removeBubble);
      target.removeEventListener("click", removeBubble);
    };

    const target = event.target as HTMLElement;
    target.addEventListener("mouseout", removeBubble);
    target.addEventListener("click", removeBubble);
  }

  attachEventListeners() {
    // Handle editing mode
    const editorContainers = document.querySelectorAll('.cm-html-embed');
    editorContainers.forEach((editorContainer) => {
      this.attachMouseEvents(editorContainer);
    });

    // Handle reading mode
    const readingViews = document.querySelectorAll('.markdown-preview-view');
    readingViews.forEach((readingView) => {
      this.attachMouseEvents(readingView);
    });

    // Clean up any duplicate text nodes
    this.cleanupNotes();
  }

  private attachMouseEvents(container: Element) {
    container.addEventListener("mouseover", (event) => {
      const target = event.target as HTMLElement;

      // Handle mark elements with notes
      if (target.tagName.toLowerCase() === "mark" && target.hasAttribute("data-note")) {
        const note = target.getAttribute("data-note");
        if (note && event instanceof MouseEvent) {
          this.displayNoteBubble(note, event);
        }
      }
      // Handle note icons
      else if (target.classList.contains("note-icon")) {
        const prevElement = target.previousElementSibling;
        if (prevElement?.tagName.toLowerCase() === "mark" && prevElement.hasAttribute("data-note")) {
          const note = prevElement.getAttribute("data-note");
          if (note && event instanceof MouseEvent) {
            this.displayNoteBubble(note, event);
          }
        }
      }
    });
  }

  cleanupNotes() {
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view?.editor) return;

      const content = view.editor.getValue();
      if (!content) return;

      const cursorPos = view.editor.getCursor();

      // Single regex to handle cleanup and icon addition
      const cleanContent = content.replace(
        /<mark.*?data-note="(.*?)".*?>.*?<\/mark>(?:<span class="note-icon">:LiStickyNote:<\/span>)?/g,
        (match, note) => {
          if (!note) return match;
          return match.replace(/:LiStickyNote:/g, '')
            .replace(/<span class="note-icon">.*?<\/span>/g, '')
            + '<span class="note-icon">:LiStickyNote:</span>';
        }
      );

      if (content !== cleanContent) {
        view.editor.setValue(cleanContent);
        view.editor.setCursor(cursorPos);
      }
    } catch (error) {
      console.error('Error in cleanupNotes:', error);
    }
  }
}
