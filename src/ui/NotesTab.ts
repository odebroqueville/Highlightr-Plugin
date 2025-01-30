import { ItemView, WorkspaceLeaf, MarkdownView } from "obsidian";
import HighlightrPlugin from "../plugin/main";

export const NOTES_VIEW_TYPE = "highlightr-notes-view";

export class NotesTab extends ItemView {
    plugin: HighlightrPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: HighlightrPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return NOTES_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Highlights & Notes";
    }

    getIcon(): string {
        return "sticky-note"; // Uses a sticky-note icon
    }

    private async updateNotesList(container: HTMLDivElement): Promise<void> {
        try {
            console.log("Starting updateNotesList");
            container.empty();

            // Get all markdown leaves
            const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
            console.log("Markdown leaves found:", markdownLeaves.length);

            if (markdownLeaves.length === 0) {
                container.createEl('div', {
                    cls: 'highlightr-message',
                    text: 'No markdown files open'
                });
                return;
            }

            // Process each markdown leaf
            for (const leaf of markdownLeaves) {
                const view = leaf.view;
                if (view instanceof MarkdownView && view.file) {
                    console.log("Processing file:", view.file.path);
                    const content = await this.app.vault.read(view.file);
                    console.log("File content loaded:", content.length);

                    // Separate regexes for matching
                    const noteRegex = /data-note="([^"]*)"/;
                    const tagsRegex = /data-tags="([^"]*)"/;
                    const colorRegex = /background(?:-color)?:\s*((?:rgb\([^)]+\)|#[A-Fa-f0-9]+))/;
                    const highlightRegex = /<mark[^>]*>(.*?)<\/mark>/g;

                    const highlights: Array<{ text: string; note: string | null; color: string | null; tags: string[] }> = [];

                    let match;
                    while ((match = highlightRegex.exec(content)) !== null) {
                        const fullMatch = match[0];
                        const text = match[1];
                        console.log("Processing mark:", fullMatch);

                        // Extract note
                        const noteMatch = fullMatch.match(noteRegex);
                        const note = noteMatch ? noteMatch[1] : null;
                        console.log("Found note:", note);

                        // Extract tags
                        const tagsMatch = fullMatch.match(tagsRegex);
                        const tags = tagsMatch ? tagsMatch[1].split(',').map(tag => `#${tag.trim().replace(/\s+/g, '-')}`) : [];
                        console.log("Found tags:", tags);

                        // Extract color
                        const colorMatch = fullMatch.match(colorRegex);
                        const color = colorMatch ? colorMatch[1] : null;
                        console.log("Found color:", color);

                        highlights.push({ text, note, color, tags });
                    }

                    this.displayHighlights(container, highlights);
                    return; // Process only the first valid markdown file
                }
            }

            // If no valid markdown file is found
            container.createEl('div', {
                cls: 'highlightr-message',
                text: 'No valid markdown files found'
            });

        } catch (error) {
            console.error("Error in updateNotesList:", error);
            container.createEl('div', {
                cls: 'highlightr-error',
                text: 'Error processing markdown content'
            });
        }
    }

    // Enhanced force update method
    public forceUpdate(): void {
        try {
            const container = this.containerEl.querySelector('.highlightr-notes-container');
            if (container instanceof HTMLDivElement) {
                this.updateNotesList(container);
            } else {
                // If container doesn't exist, create it
                const newContainer = this.containerEl.createDiv({
                    cls: "highlightr-notes-container"
                });
                this.updateNotesList(newContainer);
            }
        } catch (error) {
            console.error("Error in forceUpdate:", error);
        }
    }

    async onClose(): Promise<void> {
        // Cleanup logic
    }

    async onOpen(): Promise<void> {
        try {
            const container = this.containerEl.createDiv({ cls: "highlightr-notes-container" });

            // Register for workspace events
            this.registerEvent(
                this.app.workspace.on("file-open", () => {
                    this.updateNotesList(container);
                })
            );

            this.registerEvent(
                this.app.workspace.on("editor-change", () => {
                    this.updateNotesList(container);
                })
            );

            // Initial update
            await this.updateNotesList(container);
        } catch (error) {
            console.error("Error in onOpen:", error);
            this.containerEl.createDiv({
                text: "Failed to load Highlights & Notes side view",
                cls: "highlightr-error-message"
            });
        }
    }

    // Update display method
    private displayHighlights(container: HTMLDivElement, highlights: Array<{ text: string; note: string | null; color: string | null; tags: string[] }>): void {
        if (highlights.length === 0) {
            container.createDiv({ text: "No highlights found" });
            return;
        }

        const formattedContent = container.createDiv({ cls: "highlightr-formatted-content" });
        formattedContent.createEl("h3", { text: "Highlights & Notes" });

        highlights.forEach(({ text, note, color, tags }) => {
            const highlightEl = formattedContent.createDiv({ cls: "highlight-item" });
            const textEl = highlightEl.createDiv({ cls: "highlight-text" });

            if (color) {
                textEl.style.background = color;
            }

            textEl.createSpan({ text: `"${text}"` });

            if (note) {
                highlightEl.createDiv({
                    cls: "highlight-note",
                    text: `Note: ${note}`
                });
            }

            if (tags.length > 0) {
                const tagsContainer = highlightEl.createDiv({
                    cls: "highlight-tags",
                    text: "Tags: "
                });
                tags.forEach(tag => {
                    tagsContainer.createDiv({
                        cls: "highlight-tag",
                        text: tag
                    });
                });
            }
        });
    }
}
