import { Modal, Setting } from "obsidian";
import type { EnhancedApp } from "../settings/types";
import { t } from "../i18n";

export interface AnnotationResult {
  note: string;
  tags: string;
}

class AnnotationModal extends Modal {
  private readonly initialNote: string;
  private readonly initialTags: string;
  private readonly onSubmit: (result: AnnotationResult | null) => void;
  private resolved = false;

  constructor(
    app: EnhancedApp,
    initialNote: string,
    initialTags: string,
    onSubmit: (result: AnnotationResult | null) => void,
  ) {
    super(app);
    this.initialNote = initialNote;
    this.initialTags = initialTags;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    this.modalEl.classList.add("highlightr-annotation-modal");

    const { contentEl } = this;
    contentEl.empty();
    contentEl.classList.add("highlightr-annotation-content");

    const noteLabel = contentEl.createEl("label", { text: t("modal.annotation") });
    noteLabel.classList.add("highlightr-annotation-label");

    const noteArea = contentEl.createEl("textarea");
    noteArea.value = this.initialNote;
    noteArea.classList.add("highlightr-annotation-textarea");

    const tagsLabel = contentEl.createEl("label", { text: t("modal.tags") });
    tagsLabel.classList.add("highlightr-annotation-label");

    const tagsInput = contentEl.createEl("input", { type: "text" });
    tagsInput.value = this.initialTags;
    tagsInput.classList.add("highlightr-annotation-input");

    const controls = contentEl.createDiv();
    controls.classList.add("highlightr-annotation-controls");

    new Setting(controls)
      .addButton((button) => {
        button.setButtonText(t("modal.cancel")).onClick(() => {
          this.resolved = true;
          this.onSubmit(null);
          this.close();
        });
      })
      .addButton((button) => {
        button.setButtonText(t("modal.ok")).setCta().onClick(() => {
          this.resolved = true;
          this.onSubmit({
            note: noteArea.value,
            tags: tagsInput.value,
          });
          this.close();
        });
      });
  }

  onClose() {
    this.contentEl.empty();
    if (!this.resolved) {
      this.onSubmit(null);
    }
  }
}

export function annotateWithModal(
  app: EnhancedApp,
  note: string,
  tags: string,
): Promise<AnnotationResult | null> {
  return new Promise((resolve) => {
    const modal = new AnnotationModal(app, note, tags, (result) => resolve(result));
    modal.open();
  });
}
