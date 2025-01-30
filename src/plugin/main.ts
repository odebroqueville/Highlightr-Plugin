import { Editor, Menu, Plugin, PluginManifest, MarkdownView, setIcon, WorkspaceLeaf } from "obsidian";
import { wait } from "src/utils/util";
import addIcons from "src/icons/customIcons";
import { HighlightrSettingTab } from "../settings/settingsTab";
import { HighlightrSettings } from "../settings/settingsData";
import DEFAULT_SETTINGS from "../settings/settingsData";
import contextMenu from "src/plugin/contextMenu";
import highlighterMenu from "src/ui/highlighterMenu";
import { createHighlighterIcons } from "src/icons/customIcons";
import { createStyles } from "src/utils/createStyles";
import { EnhancedApp, EnhancedEditor } from "src/settings/types";
import { NotesTab, NOTES_VIEW_TYPE } from "../ui/NotesTab";

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
            this.processMarkTags();
            this.attachEventListeners();
            this.openNotesTab();
        });

        this.registerEvent(
            this.app.workspace.on("editor-menu", this.handleHighlighterInContextMenu)
        );

        // Register for view changes
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", () => {
                this.removeExistingBubbles();
                this.processMarkTags();
                this.attachEventListeners();
            })
        );

        this.registerEvent(
            this.app.workspace.on("editor-change", () => {
                this.cleanupNotes();
                this.triggerNotesTabUpdate();
            })
        );

        // Register NotesTab view type
        this.registerView(
            NOTES_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new NotesTab(leaf, this)
        );

        this.addSettingTab(new HighlightrSettingTab(this.app, this));

        this.addCommand({
            id: "highlighter-plugin-menu",
            name: "Open Highlightr",
            icon: "highlightr-pen",
            editorCallback: (editor: EnhancedEditor) => {
                !document.querySelector(".menu.highlighterContainer")
                    ? highlighterMenu(this.app, this.settings, editor)
                    : true;
            },
        });

        addEventListener("Highlightr-NewCommand", () => {
            this.reloadStyles(this.settings);
            this.generateCommands(this.editor);
            createHighlighterIcons(this.settings, this);
        });

        this.generateCommands(this.editor);
        this.refresh();
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
            const applyCommand = (command: CommandPlot, editor: Editor) => {
                const selectedText = editor.getSelection();
                const curserStart = editor.getCursor("from");
                const curserEnd = editor.getCursor("to");
                const prefix = command.prefix;
                const suffix = command.suffix || prefix;
                const setCursor = (mode: number) => {
                    editor.setCursor(
                        curserStart.line + command.line * mode,
                        curserEnd.ch + cursorPos * mode
                    );
                };
                const cursorPos =
                    selectedText.length > 0
                        ? prefix.length + suffix.length + 1
                        : prefix.length;
                const preStart = {
                    line: curserStart.line - command.line,
                    ch: curserStart.ch - prefix.length,
                };
                const pre = editor.getRange(preStart, curserStart);

                const sufEnd = {
                    line: curserStart.line + command.line,
                    ch: curserEnd.ch + suffix.length,
                };

                const suf = editor.getRange(curserEnd, sufEnd);

                const preLast = pre.slice(-1);
                const prefixLast = prefix.trimStart().slice(-1);
                const sufFirst = suf[0];

                if (suf === suffix.trimEnd()) {
                    if (preLast === prefixLast && selectedText) {
                        editor.replaceRange(selectedText, preStart, sufEnd);
                        const changeCursor = (mode: number) => {
                            editor.setCursor(
                                curserStart.line + command.line * mode,
                                curserEnd.ch + (cursorPos * mode + 8)
                            );
                        };
                        return changeCursor(-1);
                    }
                }

                editor.replaceSelection(`${prefix}${selectedText}${suffix}`);

                return setCursor(1);
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
                        applyCommand(commandsMap[type], editor);
                        await wait(10);
                        editor.focus();
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

    displayNoteBubble(note: string, event: MouseEvent) {
        // Remove any existing bubbles first
        this.removeExistingBubbles();

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
        bubble.style.maxWidth = "300px";
        bubble.style.height = "auto";
        bubble.style.overflowWrap = "break-word";
        bubble.style.borderRadius = "8px";
        document.body.appendChild(bubble);

        // Get the mark element (highlight)
        const target = event.target as HTMLElement;
        const markElement = target.tagName.toLowerCase() === "mark" ?
            target :
            target.previousElementSibling as HTMLElement;

        const removeBubble = (e: Event) => {
            if (bubble.parentNode) {
                document.body.removeChild(bubble);
                markElement.removeEventListener("mouseout", removeBubble);
                markElement.removeEventListener("click", removeBubble);
            }
        };

        // Add listeners to mark element instead of bubble
        markElement.addEventListener("mouseout", removeBubble);
        markElement.addEventListener("click", removeBubble);
    }

    private removeExistingBubbles() {
        const existingBubbles = document.querySelectorAll('.note-bubble');
        existingBubbles.forEach(bubble => {
            if (bubble.parentNode) {
                bubble.parentNode.removeChild(bubble);
            }
        });
    }

    // Attach mouse event listener to each container (editor and reading view)
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

    // Define mouse over event handler to display note bubble
    private attachMouseEvents(container: Element) {
        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.tagName.toLowerCase() === "mark" && target.hasAttribute("data-note")) {
                const note = target.getAttribute("data-note");
                if (note && event instanceof MouseEvent) {
                    this.displayNoteBubble(note, event);
                }
            } else if (target.classList.contains("note-icon")) {
                const prevElement = target.previousElementSibling;
                if (prevElement?.tagName.toLowerCase() === "mark" && prevElement.hasAttribute("data-note")) {
                    const note = prevElement.getAttribute("data-note");
                    if (note && event instanceof MouseEvent) {
                        this.displayNoteBubble(note, event);
                    }
                }
            }
        };

        // Clean up and reattach
        container.removeEventListener("mouseover", handleMouseOver);
        container.addEventListener("mouseover", handleMouseOver);
    }

    // Ensure that note icons are correctly added to highlights with a note
    cleanupNotes() {
        try {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view?.editor) return;

            const content = view.editor.getValue();
            if (!content) return;

            const cursorPos = view.editor.getCursor();

            // Create icon once
            const iconSpan = document.createElement('span');
            iconSpan.className = 'note-icon';
            setIcon(iconSpan, 'sticky-note');
            const noteIconHtml = `<span class="note-icon">${iconSpan.innerHTML}</span>`;

            // Single pass replacement with better patterns
            const cleanContent = content.replace(
                /<mark((?![^>]*data-note)[^>]*|.*?data-note="([^"]*)".*?)>([^<]*)<\/mark>(?:\s*<span class="note-icon">.*?<\/span>)*/g,
                (match, attrs, note, text) => {
                    // Remove any existing note icons
                    const cleanMatch = match.replace(/<span class="note-icon">.*?<\/span>/g, '');
                    // Only add icon if there's a note
                    return note ? cleanMatch + noteIconHtml : cleanMatch;
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

    private async openNotesTab(): Promise<void> {
        try {
            // Check if the view is already open
            const existingLeaves = this.app.workspace.getLeavesOfType(NOTES_VIEW_TYPE);
            if (existingLeaves.length > 0) {
                this.app.workspace.revealLeaf(existingLeaves[0]);
                return;
            }

            // Activate right sidebar
            const rightSidebar = this.app.workspace.getRightLeaf(false);

            if (rightSidebar) {
                await rightSidebar.setViewState({
                    type: NOTES_VIEW_TYPE,
                    active: true
                });
                this.app.workspace.revealLeaf(rightSidebar);
            } else {
                // Fallback: create a new leaf
                const leaf = this.app.workspace.getLeaf(true);
                await leaf.setViewState({
                    type: NOTES_VIEW_TYPE,
                    active: true
                });
                this.app.workspace.revealLeaf(leaf);
            }
        } catch (error) {
            console.error("Error opening NotesTab:", error);
        }
    }

    private triggerNotesTabUpdate(): void {
        try {
            const notesLeaves = this.app.workspace.getLeavesOfType(NOTES_VIEW_TYPE);
            notesLeaves.forEach(leaf => {
                const view = leaf.view;
                if (view instanceof NotesTab) {
                    view.forceUpdate();
                }
            });
        } catch (error) {
            console.error("Error triggering NotesTab update:", error);
        }
    }

    private processMarkTags(): void {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view?.editor) return;

        const content = view.editor.getValue();
        if (!content) return;

        const updatedContent = content.replace(
            /<mark style="background-color: rgb\(\d+,\d+,\d+\);" data-note="([^"]*)" data-tags="([^"]*)">([^<]*)<\/mark>/g,
            (match, note, tags) => {
                let result = match;

                // Process note
                if (note) {
                    // Create span element for icon
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'note-icon';
                    setIcon(iconSpan, 'sticky-note');
                    const noteIcon = `<span class="note-icon">${iconSpan.innerHTML}</span>`;

                    result = match + noteIcon;
                }

                // Process tags
                if (tags) {
                    const tagArray = tags.split(',').map((tag: string) => '#' + tag.trim().replace(/\s+/g, '-'));
                    const formattedTags = `(${tagArray.join(', ')})`;
                    result += formattedTags;
                }

                return result;
            }
        );

        if (content !== updatedContent) {
            view.editor.setValue(updatedContent);
        }
    }
}
