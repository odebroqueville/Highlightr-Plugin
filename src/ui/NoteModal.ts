import { App, Modal, TextComponent, ButtonComponent } from "obsidian";

export class NoteModal extends Modal {
    note: string;
    onSubmit: (note: string) => void;

    constructor(app: App, onSubmit: (note: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Enter a note for this highlight" });

        const input = new TextComponent(contentEl);
        input.inputEl.style.width = "100%";
        input.onChange(value => {
            this.note = value;
        });

        new ButtonComponent(contentEl)
            .setButtonText("Submit")
            .setCta()
            .onClick(() => {
                this.close();
                this.onSubmit(this.note);
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}