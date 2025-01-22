import { App, Modal, ButtonComponent } from 'obsidian';

export class ConfirmationModal extends Modal {
    constructor(
        app: App,
        private message: string,
        private onConfirm: () => void,
        private onCancel: () => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('p', { text: this.message });

        new ButtonComponent(contentEl)
            .setButtonText('Confirm')
            .setCta()
            .onClick(() => {
                this.onConfirm();
                this.close();
            });

        new ButtonComponent(contentEl)
            .setButtonText('Cancel')
            .onClick(() => {
                this.onCancel();
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}