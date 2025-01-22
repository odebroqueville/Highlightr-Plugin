import { ItemView, WorkspaceLeaf, MarkdownView, Editor } from "obsidian";
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

            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView?.file) {
                console.log("No active file");
                return;
            }

            console.log("Active file:", activeView.file.path);
            const content = await this.app.vault.read(activeView.file);
            console.log("File content loaded:", content.length);

            // Separate regexes for matching
            const noteRegex = /data-note="([^"]*)"/;
            const colorRegex = /background(?:-color)?:\s*((?:rgb\([^)]+\)|#[A-Fa-f0-9]+))/;
            const highlightRegex = /<mark[^>]*>(.*?)<\/mark>/g;

            const highlights: Array<{ text: string; note: string | null; color: string | null }> = [];

            let match;
            while ((match = highlightRegex.exec(content)) !== null) {
                const fullMatch = match[0];
                console.log("Processing mark:", fullMatch);

                // Extract note
                const noteMatch = fullMatch.match(noteRegex);
                const note = noteMatch ? noteMatch[1] : null;
                console.log("Found note:", note);

                // Extract color
                const colorMatch = fullMatch.match(colorRegex);
                const color = colorMatch ? colorMatch[1] : null;
                console.log("Found color:", color);

                // Extract text
                const text = match[1];
                console.log("Found text:", text);

                highlights.push({ text, note, color });
                console.log("Added highlight:", { text, note: note || "no note", color: color || "no color" });
            }

            this.displayHighlights(container, highlights);

        } catch (error) {
            console.error("Error in updateNotesList:", error);
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
                text: "Failed to load Highlightr Notes",
                cls: "highlightr-error-message"
            });
        }
    }

    // Update display method
    private displayHighlights(container: HTMLDivElement, highlights: Array<{ text: string; note: string | null; color: string | null }>): void {
        if (highlights.length === 0) {
            container.createDiv({ text: "No highlights found" });
            return;
        }

        const formattedContent = container.createDiv({ cls: "highlightr-formatted-content" });
        formattedContent.createEl("h3", { text: "Highlights & Notes" });

        highlights.forEach(({ text, note, color }) => {
            const highlightEl = formattedContent.createDiv({ cls: "highlight-item" });
            const textEl = highlightEl.createDiv({ cls: "highlight-text" });

            if (color) {
                textEl.style.background = color;
            }

            textEl.createSpan({ text: `"${text}"` });

            if (note) {
                highlightEl.createDiv({
                    cls: "highlight-note",
                    text: note
                });
            }
        });
    }
}
