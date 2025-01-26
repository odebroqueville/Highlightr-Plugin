import { Editor, Menu, Plugin, PluginManifest, MarkdownView, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import { wait } from "src/utils/util";
import addIcons from "src/icons/customIcons";
import { HighlightrSettingTab } from "../settings/settingsTab";
import { HighlightrSettings } from "../settings/settingsData";
import DEFAULT_SETTINGS from "../settings/settingsData";
import contextMenu from "src/plugin/contextMenu";
import highlighterMenu from "src/ui/highlighterMenu";
import { createHighlighterIcons } from "src/icons/customIcons";
import { NoteModal } from "src/ui/NoteModal";
import { ConfirmationModal } from "src/ui/ConfirmationModal";
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
            this.attachEventListeners();
            this.openNotesTab();
        });

        // Register for view changes
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", () => {
                this.removeExistingBubbles();
                this.attachEventListeners();
            })
        );

        // Add command to open highlights and notes in a new tab
        this.addCommand({
            id: "open-highlights-and-notes",
            name: "Open highlights and notes in a new tab",
            icon: "sticky-note",
            editorCallback: async (editor: Editor) => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!view) return;

                const content = view.editor.getValue();
                // Updated regex to match both mark tags and custom tags with style, note and tags attributes
                const highlightRegex = /<(?:mark|@@)[^>]*(?:style="background-color:[^;]+;)(?:\s*data-note="[^"]*")?(?:\s*data-tags="[^"]*")?[^>]*>.*?<\/(?:mark|@@)>/g;
                const highlightsAndNotes: Array<{ fullMarkTag: string, note: string, tags: string[] }> = [];

                let match;
                while ((match = highlightRegex.exec(content)) !== null) {
                    // Extract the full mark tag
                    const fullMarkTag = match[0];

                    // Extract note from data-note attribute if it exists
                    const noteMatch = fullMarkTag.match(/data-note="([^"]*)"/);
                    const note = noteMatch ? noteMatch[1] : '';

                    // Extract tags from data-tags attribute if it exists and process them
                    const tagsMatch = fullMarkTag.match(/data-tags="([^"]*)"/);
                    const tags = tagsMatch
                        ? tagsMatch[1]
                            .split(',')
                            .map(tag => '#' + tag.trim().replace(/\s+/g, '-'))
                        : [];

                    // Remove data-note and data-tags attributes from the mark tag
                    const cleanMarkTag = fullMarkTag
                        .replace(/\s*data-note="[^"]*"/, '')
                        .replace(/\s*data-tags="[^"]*"/, '');

                    highlightsAndNotes.push({
                        fullMarkTag: cleanMarkTag,
                        note: note,
                        tags: tags
                    });
                }

                // Create a new markdown tab with highlights, notes and tags
                const highlightsMarkdown = highlightsAndNotes.map((item, index) => {
                    const tagsList = item.tags.length > 0 ? `\nTags: ${item.tags.join(', ')}` : '';
                    return `${item.fullMarkTag}${item.note ? `\nNote: ${item.note}` : ''}${tagsList}\n`;
                }).join('\n---\n');

                // Check if file already exists
                const existingFile = this.app.vault.getAbstractFileByPath(`${view.file.parent.path}/Highlights from ${view.file.name}`);

                if (existingFile) {
                    // Use ConfirmationModal to ask user about overwriting
                    new ConfirmationModal(
                        this.app,
                        `A file named "Highlights from ${view.file.name}" already exists. Do you want to overwrite it?`,
                        async () => {
                            // User confirmed, proceed with file creation
                            const leaf = this.app.workspace.getLeaf(true);
                            const filePath = `${view.file.parent.path}/Highlights from ${view.file.name}`;
                            const fileContent = `# Highlights from ${view.file.name}\n\n${highlightsMarkdown}`;
                            const existingFile = this.app.vault.getAbstractFileByPath(filePath);

                            if (existingFile && existingFile instanceof TFile) {
                                await this.app.vault.modify(existingFile, fileContent);
                                await leaf.openFile(existingFile);
                            } else {
                                await this.app.vault.create(filePath, fileContent);
                                const newFile = this.app.vault.getAbstractFileByPath(filePath);
                                if (newFile instanceof TFile) {
                                    await leaf.openFile(newFile);
                                }
                            }
                        },
                        () => {
                            // User cancelled, do nothing
                            return;
                        }
                    ).open();
                } else {
                    // No existing file, proceed normally
                    const leaf = this.app.workspace.getLeaf(true);
                    const filePath = `${view.file.parent.path}/Highlights from ${view.file.name}`;
                    const fileContent = `# Highlights from ${view.file.name}\n\n${highlightsMarkdown}`;
                    const existingFile = this.app.vault.getAbstractFileByPath(filePath);

                    if (existingFile && existingFile instanceof TFile) {
                        await this.app.vault.modify(existingFile, fileContent);
                        await leaf.openFile(existingFile);
                    } else {
                        await this.app.vault.create(filePath, fileContent);
                        const newFile = this.app.vault.getAbstractFileByPath(filePath);
                        if (newFile instanceof TFile) {
                            await leaf.openFile(newFile);
                        }
                    }
                }
            }
        });

        this.registerEvent(
            this.app.workspace.on("editor-change", () => {
                this.cleanupNotes();
                this.triggerNotesTabUpdate();
            })
        );

        // Generate commands for different highlighter colors
        this.generateCommands(this.editor);

        // Register NotesTab view type
        this.registerView(
            NOTES_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new NotesTab(leaf, this)
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
            const applyCommand = (command: CommandPlot, editor: Editor, note: string, tags: string[] = []) => {
                const selectedText = editor.getSelection();
                const noteAttribute = note ? ` data-note="${note}"` : "";
                const tagsAttribute = tags.length > 0 ? ` data-tags="${tags.join(',')}"` : "";

                const prefix =
                    this.settings.highlighterMethods === "css-classes"
                        ? `<mark class="hltr-${highlighterKey.toLowerCase()}"${noteAttribute}${tagsAttribute}>`
                        : `<mark style="background: ${this.settings.highlighters[highlighterKey]};"${noteAttribute}${tagsAttribute}>`;
                const suffix = "</mark>";

                console.log("Applying highlight with note:", note, "and tags:", tags);

                // Create span element for icon
                const iconSpan = document.createElement('span');
                iconSpan.className = 'note-icon';
                setIcon(iconSpan, 'sticky-note');
                const noteIcon = note ? `<span class="note-icon">${iconSpan.innerHTML}</span>` : "";

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
}
