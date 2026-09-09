/**
 * Minimal bilingual i18n module (English / 简体中文).
 *
 * - `Language`   : user setting value ("auto" follows the Obsidian UI language).
 * - `ResolvedLang`: the language actually used for lookups ("en" | "zh").
 *
 * The active resolved language is module-level state, updated through
 * `setLanguage()` whenever the plugin loads its settings or the user changes
 * the language dropdown. `t(key, params?)` returns the message for the current
 * resolved language; an unknown key is returned verbatim instead of throwing.
 */

export type Language = "auto" | "en" | "zh";
export type ResolvedLang = "en" | "zh";

const en = {
  settings: {
    title: "Highlightr+ Plugin",
    credits: {
      createdBy: "Created by ",
      and: " and ",
    },
    language: {
      name: "Language",
      desc: "Choose the language used by this plugin's interface (English or 中文). The choice is saved and the settings page refreshes immediately.",
      optionAuto: "Auto (follow Obsidian)",
      optionEn: "English",
      optionZh: "中文",
    },
    method: {
      name: "Choose highlight method",
      desc:
        "Choose between highlighting with inline CSS or CSS classes. Please note that there are pros and cons to both choices. Inline CSS will keep you from being reliant on external CSS files if you choose to export your notes. CSS classes are more flexible and easier to customize.",
    },
    style: {
      name: "Choose highlight style",
      desc:
        "Depending on your design aesthetic, you may want to customize the style of your highlights. Choose from an assortment of different highlighter styles by using the dropdown. Depending on your theme, this plugin's CSS may be overriden.",
    },
    focus: {
      name: "Focus Highlights & Notes",
      desc:
        "Automatically open and focus the Highlights & Notes tab when a file with highlights is opened.",
    },
    scope: {
      name: "Vault scan scope for conflict checks",
      desc:
        "Controls which files are scanned when checking and migrating class conflicts. Narrower scope reduces path exposure.",
      optionActiveFile: "Active file only",
      optionFolder: "Specific folder",
      optionVault: "Entire vault",
      labelActiveFile: "active file",
      labelFolder: "folder",
      labelFolderWith: "folder: {folder}",
      labelVault: "entire vault",
      infoMarkdown: `Think of this setting like a **digital security guard** for your Obsidian notes.

When you install a plugin that alters how things look or work (like changing styles or managing "classes"), it needs to look through your files to make sure its instructions don't smash into another plugin's instructions. That's a **conflict check**.

Here is exactly what that setting means, broken down into plain English:

## 1. Vault Scan Scope

* **The Vault:** This is your entire Obsidian project—the main folder where all your notes, images, and folders live.
* **The Scope:** This just means the boundary line. Changing the scope tells the plugin: "You are only allowed to look inside this specific folder," instead of letting it wander through your whole vault.

## 2. Class Conflicts

In web development and plugins, a **class** is like a label you put on a note or a piece of text to give it special powers or styles (for example, a class called important-note might make the background glowing red).

If two different plugins try to use the exact same class name for completely different things, Obsidian gets confused. This setting controls how far the plugin searches to find and fix (migrate) those identical, conflicting labels.

## 3. Path Exposure (The Privacy Part)

This is the most important part of the sentence. Every file on your computer has a "path" (like Documents/School/ObsidianVault/SecretDiary.md).

If you give a plugin a wide scope (letting it scan everything), it has to read the file paths of every single note you own to do its job. If you give it a narrower scope (restricting it to just one folder), it never sees the names or paths of your other private files. It keeps your vault's structure private.

---

### Summary Table

| Scope Setting | What it does | Pros | Cons |
| --- | --- | --- | --- |
| **Wide / Full Vault** | Scans every single note you have. | Catches 100% of conflicts everywhere. | The plugin sees all your file names/paths. |
| **Narrow / Restricted** | Only scans a specific folder. | High privacy; super fast scanning. | Might miss a conflict hidden in an un-scanned folder. |`,
    },
    scopeFolder: {
      name: "Conflict scan folder",
      desc: "Folder path relative to vault root used for conflict scan/migration.",
    },
    privacy: {
      name: "Privacy note",
      desc:
        "Conflict checks can scan note paths in the selected scope. Highlightr+ performs scans only on explicit save/migrate action and does not persist or transmit scanned file path lists.",
    },
    colors: {
      name: "Choose highlight colors",
      desc:
        "Create new highlight colors by providing a color name and using the color picker to set the hex code value. Don't forget to save the color before exiting the color picker. Drag and drop the highlight color to change the order for your highlighter component.",
      placeholderName: "Color name",
      placeholderClass: "Class name (optional)",
      placeholderHex: "Color hex code",
    },
    buttons: {
      save: "Save",
      remove: "Remove",
      reactivate: "Reactivate",
    },
    section: {
      active: "Active highlight colors",
      inactive: "Inactive highlight colors",
    },
    activeInfoBubble: "Appear in the context menu and the command palette.",
    deleteModal: {
      message:
        "This action will permanently remove the highlight color. In the future, using the same color name for a new highlight color may create a conflict.",
    },
    conflict: {
      heading: "Potential highlight class conflict",
      summary: "A highlight class conflict was found for {name}: {token}.",
      found:
        "Found {marks} matching mark(s) in {files} file(s). New color value: {hex}.",
      topFiles: "Top impacted files:",
      prompt:
        "Do you wish to overwrite highlight colors using the same name or choose a different highlight color name to keep both colors?",
      buttonRename: "Choose different name",
      buttonReuseNoMigrate: "Reuse without migration",
      buttonReuseMigrate: "Reuse and migrate",
    },
    donate: {
      text:
        "If you like this Plugin and are considering donating to support continued development, use the buttons below!",
      chetachi: "Donate to Chetachi",
      olivier: "Donate to Olivier",
    },
    notice: {
      movedToInactive: "{name} highlight moved to inactive",
      permanentlyDeleted: "{name} highlight permanently deleted",
      reactivated: "{name} highlight reactivated",
      scope: "Conflict scan scope: {scope}",
      renameColor:
        "Choose a different highlight name or class to keep both colors.",
      migrated:
        "Updated {marks} highlight(s) across {files} file(s).",
      colorExists: "This color already exists",
      missingHex: "Highlighter hex code missing",
      missingName: "Highlighter name missing",
      missingValues: "Highlighter values missing",
    },
  },
  menu: {
    highlight: "Highlight",
    unhighlight: "Unhighlight",
    changeColor: "Change highlight color",
    annotate: "Annotate",
    eraseAnnotation: "Erase annotation",
    eraseHighlightAndAnnotation: "Erase highlight & annotation",
    editAnnotation: "Edit annotation",
  },
  toolbar: {
    erase: "Unhighlight",
    annotate: "Annotate",
    style: "Highlight style",
  },
  sidebar: {
    deleteHighlight: "Delete highlight",
    notFound: "Highlight not found",
    unfocused: "Please open this note first",
  },
  styleItems: {
    none: "None",
    lowlight: "Lowlight",
    floating: "Floating",
    rounded: "Rounded",
    realistic: "Realistic",
  },
  modal: {
    annotation: "Annotation:",
    tags: "Tags:",
    cancel: "Cancel",
    ok: "OK",
  },
  command: {
    openHighlighter: "Open Highlightr",
    removeHighlight: "Remove highlight",
  },
  notice: {
    focusInEditor: "Focus must be in editor",
  },
} as const;

/** Recursively mirrors the key structure of `T`, widening leaf strings. */
type Mirror<T> = {
  [K in keyof T]: T[K] extends string ? string : Mirror<T[K]>;
};

const zh: Mirror<typeof en> = {
  settings: {
    title: "Highlightr+ 插件",
    credits: {
      createdBy: "作者: ",
      and: " 和 ",
    },
    language: {
      name: "语言",
      desc: "选择本插件的界面语言。“自动”将跟随 Obsidian 的界面语言。",
      optionAuto: "自动(跟随 Obsidian)",
      optionEn: "English",
      optionZh: "中文",
    },
    method: {
      name: "选择高亮方式",
      desc:
        "选择使用内联 CSS 还是 CSS 类来进行高亮。请注意,两种方式各有利弊:如果导出笔记,内联 CSS 可以让你不依赖外部 CSS 文件;而 CSS 类更灵活、更容易定制。",
    },
    style: {
      name: "选择高亮样式",
      desc:
        "根据你的设计偏好,你也许想自定义高亮的样式。使用下拉菜单,可以从多种不同的高亮样式中进行选择。取决于你使用的主题,本插件的 CSS 可能会被覆盖。",
    },
    focus: {
      name: "聚焦高亮与笔记",
      desc: "当打开含有高亮的文件时,自动打开并聚焦“高亮与笔记”侧栏。",
    },
    scope: {
      name: "冲突检查的扫描范围",
      desc: "控制检查与迁移类冲突时扫描哪些文件。范围越小,暴露的路径信息越少。",
      optionActiveFile: "仅当前文件",
      optionFolder: "指定文件夹",
      optionVault: "整个仓库",
      labelActiveFile: "当前文件",
      labelFolder: "文件夹",
      labelFolderWith: "文件夹:{folder}",
      labelVault: "整个仓库",
      infoMarkdown: `你可以把这个设置想象成你 Obsidian 笔记的一位**数字安保员**。

当某个插件会改变外观或工作方式(比如修改样式或管理“类名/classes”)时,它需要检查你的文件,确保自己的指令不会与其他插件的指令冲突,这就是**冲突检查**。

下面用通俗的语言解释这个设置的含义:

## 1. Vault 扫描范围

* **仓库(Vault):** 你的整个 Obsidian 项目——存放所有笔记、图片和文件夹的主目录。
* **范围(Scope):** 指扫描的边界。更改范围等于告诉插件:“你只允许查看这个特定文件夹”,而不是让它在你整个仓库中游走。

## 2. 类冲突(Class Conflicts)

在网页开发和插件中,**class(类)** 就像贴在一篇笔记或一段文字上的标签,赋予它特殊的功能或样式(例如,一个名为 important-note 的类可能让背景变为醒目的红色)。

如果两个不同插件为完全不同的用途使用了完全相同的类名,Obsidian 就会混淆。此设置控制插件搜索多远,以查找并修复(迁移)这些重复、冲突的标签。

## 3. 路径暴露(隐私部分)

这是整段说明中最重要的一点。电脑上的每个文件都有一个“路径”(如 Documents/School/ObsidianVault/SecretDiary.md)。

如果你给插件一个很大的范围(允许它扫描一切),为了完成工作,它就必须读取你每一篇笔记的文件路径。如果给它更小的范围(只限于一个文件夹),它就永远不会看到你其他私人文件的名称或路径,从而保护你仓库的结构隐私。

---

### 汇总表

| 范围设置 | 作用 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **宽 / 整个仓库** | 扫描你的每一篇笔记 | 各处的冲突 100% 都能被发现 | 插件会看到你所有文件名/路径 |
| **窄 / 指定文件夹** | 只扫描特定文件夹 | 隐私性高;扫描极快 | 可能漏掉未扫描文件夹中隐藏的冲突 |`,
    },
    scopeFolder: {
      name: "冲突扫描文件夹",
      desc: "用于冲突扫描/迁移的文件夹路径,相对于仓库根目录。",
    },
    privacy: {
      name: "隐私说明",
      desc:
        "冲突检查可能会扫描所选范围内的笔记路径。Highlightr+ 仅在显式的保存/迁移操作时执行扫描,不会持久保存或传输扫描到的文件路径列表。",
    },
    colors: {
      name: "选择高亮颜色",
      desc:
        "通过输入颜色名称并使用取色器设置十六进制色值,即可创建新的高亮颜色。离开取色器前请记得保存颜色。拖放高亮颜色可调整高亮组件中的排列顺序。",
      placeholderName: "颜色名称",
      placeholderClass: "类名(可选)",
      placeholderHex: "颜色十六进制代码",
    },
    buttons: {
      save: "保存",
      remove: "删除",
      reactivate: "重新启用",
    },
    section: {
      active: "已启用的高亮颜色",
      inactive: "未启用的高亮颜色",
    },
    activeInfoBubble: "会出现在右键菜单和命令面板中。",
    deleteModal: {
      message:
        "此操作将永久删除该高亮颜色。今后若使用相同的颜色名称新建高亮颜色,可能会产生冲突。",
    },
    conflict: {
      heading: "检测到潜在的高亮类冲突",
      summary: "颜色“{name}”存在高亮类冲突:{token}。",
      found: "在 {files} 个文件中找到 {marks} 处匹配的高亮标记。新颜色值:{hex}。",
      topFiles: "受影响最大的文件:",
      prompt:
        "你希望覆盖使用同一名称的高亮颜色,还是另选一个高亮颜色名称,以便同时保留这两种颜色?",
      buttonRename: "另选名称",
      buttonReuseNoMigrate: "直接复用(不迁移)",
      buttonReuseMigrate: "复用并迁移",
    },
    donate: {
      text: "如果你喜欢这个插件,并考虑通过捐赠来支持它的持续开发,请使用下方的按钮!",
      chetachi: "捐赠给 Chetachi",
      olivier: "捐赠给 Olivier",
    },
    notice: {
      movedToInactive: "高亮颜色 {name} 已移至未启用列表",
      permanentlyDeleted: "高亮颜色 {name} 已被永久删除",
      reactivated: "高亮颜色 {name} 已重新启用",
      scope: "冲突扫描范围:{scope}",
      renameColor: "请选择不同的高亮名称或类名,以便同时保留两种颜色。",
      migrated: "已在 {files} 个文件中更新 {marks} 处高亮。",
      colorExists: "该颜色已存在",
      missingHex: "缺少高亮颜色的十六进制代码",
      missingName: "缺少高亮颜色名称",
      missingValues: "缺少高亮颜色名称或颜色值",
    },
  },
  menu: {
    highlight: "高亮",
    unhighlight: "清除高亮",
    changeColor: "更换高亮颜色",
    annotate: "添加批注",
    eraseAnnotation: "删除批注",
    eraseHighlightAndAnnotation: "删除高亮与批注",
    editAnnotation: "编辑批注",
  },
  toolbar: {
    erase: "清除高亮",
    annotate: "添加批注",
    style: "高亮样式",
  },
  sidebar: {
    deleteHighlight: "删除高亮",
    notFound: "未找到对应高亮",
    unfocused: "请先打开该笔记",
  },
  styleItems: {
    none: "无",
    lowlight: "淡色",
    floating: "浮动",
    rounded: "圆角",
    realistic: "仿真",
  },
  modal: {
    annotation: "批注:",
    tags: "标签:",
    cancel: "取消",
    ok: "确定",
  },
  command: {
    openHighlighter: "打开 Highlightr",
    removeHighlight: "清除高亮",
  },
  notice: {
    focusInEditor: "焦点必须位于编辑器中",
  },
};

export const messages: { en: typeof en; zh: Mirror<typeof en> } = { en, zh };

// ---------------------------------------------------------------------------
// Runtime state & lookup helpers
// ---------------------------------------------------------------------------

let languageSetting: Language = "auto";
let currentLang: ResolvedLang = "en";

/**
 * Resolve a language setting to the actually-used language.
 * "auto" reads Obsidian's UI language from localStorage ("language" key,
 * e.g. "en", "zh", "zh-CN", "zh-TW"; anything starting with "zh" is Chinese).
 */
export function resolveLang(setting: Language): ResolvedLang {
  if (setting === "en") {
    return "en";
  }
  if (setting === "zh") {
    return "zh";
  }
  // auto -> follow Obsidian interface language
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem("language");
      if (stored && /^zh/i.test(stored)) {
        return "zh";
      }
    }
  } catch (err) {
    // ignore localStorage failures and fall back to English
  }
  return "en";
}

/** Apply a language setting (called on settings load and on user change). */
export function setLanguage(setting: Language): void {
  languageSetting = setting;
  currentLang = resolveLang(setting);
}

/** The language setting currently in effect (may be "auto"). */
export function getLanguage(): Language {
  return languageSetting;
}

/** The resolved language currently used for lookups. */
export function getResolvedLang(): ResolvedLang {
  return currentLang;
}

function lookupPath(node: unknown, segments: string[]): string | undefined {
  let cursor: unknown = node;
  for (let i = 0; i < segments.length; i += 1) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segments[i]];
  }
  return typeof cursor === "string" ? cursor : undefined;
}

/**
 * Translate a dotted message key (e.g. "settings.title") for the current
 * language. Placeholders written as `{name}` inside the message are replaced
 * from `params` when provided. Unknown keys are returned verbatim.
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const segments = key.split(".");
  let text = lookupPath(messages[currentLang], segments);
  if (text === undefined) {
    text = lookupPath(messages.en, segments);
  }
  if (text === undefined) {
    return key;
  }
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(params, name)
        ? String(params[name])
        : match,
    );
  }
  return text;
}
