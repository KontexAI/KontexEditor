import { Editor } from '@tiptap/core';
import type { Mark } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle, Color, BackgroundColor, FontSize, FontFamily } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { BlockStyle } from './extensions/block-style';
import { ResizableImage } from './extensions/resizable-image';
import { TableRowResize } from './extensions/table-row-resize';
import { SearchReplace } from './extensions/search-replace';
import { Iframe, normalizeEmbedUrl } from './extensions/iframe';
import { SlashCommand, type SlashItem } from './extensions/slash-command';
import { icon } from './icons';
import { cleanPastedHTML } from './paste-cleanup';
import { Spellcheck, type SpellcheckStorage } from './spellcheck/spellcheck';
import { loadSpellEngine, DEFAULT_DICTIONARY, type DictionarySource } from './spellcheck/engine';
import { createBalloon, type Balloon } from './balloon';
import { createLinkHover, type LinkHover } from './link-hover';
import { injectStyles } from './styles';
import { buildToolbar, type BuiltToolbar } from './toolbar';
import type { KontexEditorInstance, KontexOptions, ToolbarItem, UploadOption, TemplateDef } from './types';

const DEFAULT_TOOLBAR: ToolbarItem[] = [
  'heading', 'fontFamily', 'fontSize', '|',
  'bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'clearFormat', 'formatPainter', '|',
  'fontColor', 'bgColor', 'highlight', '|',
  'align', 'bulletList', 'orderedList', 'outdent', 'indent', '|',
  'lineSpacing', 'paragraphSpacing', '|',
  'blockquote', 'link', 'image', 'media', 'table', 'horizontalRule', 'specialChar', '|',
  'template', 'findReplace', 'spellcheck', 'undo', 'redo', '|',
  'fullscreen', 'source',
];

const DEFAULT_TEMPLATES: TemplateDef[] = [
  { title: 'Call to action', description: 'Heading + button link', html: '<h2>Ready to get started?</h2><p>Tell us what you need and we\'ll help.</p><p><a href="#">Contact us →</a></p>' },
  { title: 'Two-column table', description: 'Simple labelled table', html: '<table><tbody><tr><th>Field</th><th>Value</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>' },
  { title: 'Note callout', description: 'Highlighted note block', html: '<blockquote><p><strong>Note:</strong> Add your important note here.</p></blockquote>' },
  { title: 'Signature', description: 'Closing signature', html: '<p>Best regards,<br>Your Name</p>' },
];

async function uploadFile(upload: UploadOption, file: File): Promise<string> {
  if (typeof upload === 'function') return upload(file);
  const form = new FormData();
  form.append(upload.fieldName ?? 'file', file);
  const res = await fetch(upload.url, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json();
  // Accept common response shapes: { url }, { location }, or a bare string.
  return data.url ?? data.location ?? data;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

class KontexEditor implements KontexEditorInstance {
  readonly tiptap: Editor;

  private readonly root: HTMLElement;
  private readonly contentEl: HTMLElement;
  private readonly footerEl: HTMLElement;
  private readonly toolbar: BuiltToolbar | null;
  private readonly boundTextarea: HTMLTextAreaElement | null;
  private readonly originalDisplay: string;
  private readonly opts: KontexOptions;
  private readonly balloon: Balloon;
  private readonly linkHover: LinkHover;

  private sourceTextarea: HTMLTextAreaElement | null = null;
  private spellcheckEnabled = false;
  private spellcheckLoading = false;
  private readonly dictSource: DictionarySource;
  private painter: { marks: readonly Mark[]; blockType: string; blockAttrs: Record<string, unknown> } | null = null;
  private painterUp: ((e: MouseEvent) => void) | null = null;
  private painterKey: ((e: KeyboardEvent) => void) | null = null;
  private readonly autosaveKey: string | null;
  private readonly autosaveDebounce: number;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly footerStatusEl: HTMLElement;
  private readonly footerCountEl: HTMLElement;
  private fullscreen = false;
  private fullscreenKey: ((e: KeyboardEvent) => void) | null = null;

  constructor(target: HTMLElement, opts: KontexOptions) {
    injectStyles();
    this.opts = opts;
    this.dictSource = opts.dictionary ?? DEFAULT_DICTIONARY;
    this.autosaveKey = opts.autosave?.key ?? null;
    this.autosaveDebounce = opts.autosave?.debounceMs ?? 800;

    const isTextarea = target instanceof HTMLTextAreaElement;
    this.boundTextarea = isTextarea ? target : null;
    this.originalDisplay = target.style.display;

    let initialContent = opts.content ?? (isTextarea ? target.value : target.innerHTML) ?? '';
    if (opts.autosave?.restore && this.autosaveKey) {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(this.autosaveKey) : null;
      if (saved != null) initialContent = saved;
    }

    // Build the editor chrome and place it right after the target element.
    this.root = document.createElement('div');
    this.root.className = 'kontex';

    this.contentEl = document.createElement('div');
    this.contentEl.className = 'kontex__content';

    this.footerEl = document.createElement('div');
    this.footerEl.className = 'kontex__footer';
    this.footerStatusEl = document.createElement('span');
    this.footerStatusEl.className = 'kontex__footer-status';
    this.footerCountEl = document.createElement('span');
    this.footerEl.append(this.footerStatusEl, this.footerCountEl);

    if (isTextarea) {
      target.style.display = 'none';
      target.insertAdjacentElement('afterend', this.root);
    } else {
      target.innerHTML = '';
      target.appendChild(this.root);
    }

    this.tiptap = new Editor({
      element: this.contentEl,
      // Note: initial content is applied via setContent() below, NOT the
      // constructor `content` option — the constructor's parse mishandles
      // pretty-printed/indented HTML (wraps the leading block in a list).
      content: '',
      editable: opts.editable ?? true,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: opts.placeholder ?? '' }),
        CharacterCount,
        ResizableImage.configure({ inline: false, allowBase64: true }),
        TableKit.configure({ table: { resizable: true } }),
        TableRowResize,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
        Color,
        BackgroundColor,
        FontSize,
        FontFamily,
        Highlight.configure({ multicolor: true }),
        Subscript,
        Superscript,
        BlockStyle,
        SearchReplace,
        Iframe,
        Spellcheck,
        ...(opts.slashMenu === false ? [] : [SlashCommand.configure({ items: this.slashItems() })]),
      ],
      editorProps: {
        // Native spellcheck off — the custom dictionary-backed checker provides
        // the underlines and (right-click) suggestion menu instead.
        attributes: { spellcheck: 'false' },
        transformPastedHTML: (html) => cleanPastedHTML(html),
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;
          const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
          if (!files.some((f) => f.type.startsWith('image/'))) return false;
          event.preventDefault();
          const at = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY });
          void this.insertImageFiles(files, at?.pos ?? null);
          return true;
        },
        handlePaste: (_view, event) => {
          const files = Array.from((event as ClipboardEvent).clipboardData?.files ?? []);
          if (!files.some((f) => f.type.startsWith('image/'))) return false;
          event.preventDefault();
          void this.insertImageFiles(files, null);
          return true;
        },
      },
      onUpdate: () => this.handleChange(),
      onFocus: () => opts.onFocus?.(this),
      onBlur: () => opts.onBlur?.(this),
      onSelectionUpdate: () => {
        this.toolbar?.update();
        this.balloon.update();
      },
    });

    this.balloon = createBalloon(this.tiptap);
    this.linkHover = createLinkHover(this.tiptap);

    if (initialContent.trim()) {
      this.tiptap.commands.setContent(initialContent, { emitUpdate: false });
    }

    const items = opts.toolbar ?? DEFAULT_TOOLBAR;
    this.toolbar = items.length
      ? buildToolbar(items, {
          editor: this.tiptap,
          setLink: () => this.setLink(),
          insertImage: () => this.insertImage(),
          insertTable: () => this.tiptap.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
          insertMedia: () => this.insertMedia(),
          toggleSource: () => this.toggleSource(),
          isSourceMode: () => this.sourceTextarea !== null,
          toggleSpellcheck: () => void this.setSpellcheck(!this.spellcheckEnabled),
          spellcheckEnabled: () => this.spellcheckEnabled,
          spellcheckLoading: () => this.spellcheckLoading,
          startFormatPainter: () => this.startFormatPainter(),
          formatPainterActive: () => this.painter !== null,
          toggleFullscreen: () => this.toggleFullscreen(),
          fullscreenActive: () => this.fullscreen,
          templates: opts.templates ?? DEFAULT_TEMPLATES,
        })
      : null;

    if (this.toolbar) {
      if (opts.stickyToolbar) this.toolbar.el.classList.add('kontex__toolbar--sticky');
      this.root.appendChild(this.toolbar.el);
    }
    this.root.appendChild(this.contentEl);
    this.root.appendChild(this.footerEl);

    this.syncTextarea();
    this.updateFooter();
    this.toolbar?.update();
    opts.onReady?.(this);

    if (opts.spellcheck) void this.setSpellcheck(true);
  }

  private handleChange(): void {
    this.syncTextarea();
    this.updateFooter();
    this.scheduleAutosave();
    this.toolbar?.update();
    this.balloon.update();
    this.opts.onChange?.(this.getHTML(), this);
  }

  private syncTextarea(): void {
    if (this.boundTextarea) this.boundTextarea.value = this.getHTML();
  }

  private updateFooter(): void {
    this.footerCountEl.textContent = `${this.words()} words · ${this.characters()} characters`;
  }

  private scheduleAutosave(): void {
    if (!this.autosaveKey) return;
    this.footerStatusEl.textContent = 'Saving…';
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(this.autosaveKey as string, this.getHTML());
        this.footerStatusEl.textContent = 'Saved ✓';
      } catch {
        this.footerStatusEl.textContent = 'Save failed';
      }
    }, this.autosaveDebounce);
  }

  private setLink(): void {
    const prev = this.tiptap.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return; // cancelled
    const chain = this.tiptap.chain().focus().extendMarkRange('link');
    if (url === '') chain.unsetLink().run();
    else chain.setLink({ href: url }).run();
  }

  private insertImage(): void {
    const { upload } = this.opts;
    if (!upload) {
      const url = window.prompt('Image URL', 'https://');
      if (url) this.tiptap.chain().focus().setImage({ src: url }).run();
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const src = await uploadFile(upload, file);
        this.tiptap.chain().focus().setImage({ src }).run();
      } catch (err) {
        window.alert((err as Error).message);
      }
    });
    input.click();
  }

  private async setSpellcheck(enabled: boolean): Promise<void> {
    if (this.spellcheckLoading) return;
    const storage = (this.tiptap.storage as unknown as Record<string, SpellcheckStorage>).spellcheck;

    if (enabled && !storage.engine) {
      this.spellcheckLoading = true;
      this.toolbar?.update();
      try {
        storage.engine = await loadSpellEngine(this.dictSource);
      } catch (err) {
        this.spellcheckLoading = false;
        this.toolbar?.update();
        window.alert(`Spell check failed to load: ${(err as Error).message}`);
        return;
      }
      this.spellcheckLoading = false;
    }

    storage.enabled = enabled;
    this.spellcheckEnabled = enabled;
    storage.requestRecompute?.();
    this.toolbar?.update();
  }

  private toggleFullscreen(): void {
    this.fullscreen = !this.fullscreen;
    this.root.classList.toggle('kontex--fullscreen', this.fullscreen);
    document.body.classList.toggle('kontex-fullscreen-lock', this.fullscreen);
    if (this.fullscreen) {
      this.fullscreenKey = (e) => { if (e.key === 'Escape') this.toggleFullscreen(); };
      document.addEventListener('keydown', this.fullscreenKey);
    } else if (this.fullscreenKey) {
      document.removeEventListener('keydown', this.fullscreenKey);
      this.fullscreenKey = null;
    }
    this.toolbar?.update();
  }

  private startFormatPainter(): void {
    if (this.painter) {
      this.stopFormatPainter();
      return; // clicking again cancels
    }
    const { selection } = this.tiptap.state;
    const marks = selection.empty
      ? this.tiptap.state.storedMarks ?? selection.$from.marks()
      : selection.$from.marksAcross(selection.$to) ?? [];
    const parent = selection.$from.parent;
    this.painter = {
      // Character formatting (not links) + paragraph formatting (heading level,
      // alignment, indent, spacing) — like Word's format painter.
      marks: marks.filter((m) => m.type.name !== 'link'),
      blockType: parent.isTextblock ? parent.type.name : 'paragraph',
      blockAttrs: parent.isTextblock ? { ...parent.attrs } : {},
    };
    this.contentEl.classList.add('kontex--painting');

    this.painterUp = (event: MouseEvent) => {
      if (!this.painter) return;
      const view = this.tiptap.view;
      let range: { from: number; to: number } | null = null;

      // Derive the target from the DOM selection / click coords directly —
      // ProseMirror hasn't synced its own selection from this click yet.
      const domSel = window.getSelection();
      if (domSel && !domSel.isCollapsed && domSel.anchorNode && domSel.focusNode && this.contentEl.contains(domSel.anchorNode)) {
        try {
          const a = view.posAtDOM(domSel.anchorNode, domSel.anchorOffset);
          const b = view.posAtDOM(domSel.focusNode, domSel.focusOffset);
          range = { from: Math.min(a, b), to: Math.max(a, b) };
        } catch {
          range = null;
        }
      }
      if (!range) {
        // Collapsed click → paint the whole word under the pointer (Word-style).
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (at) range = this.wordRangeAt(at.pos);
      }
      if (!range || range.from === range.to) return; // empty space — stay armed
      this.applyPainter(range.from, range.to);
      this.stopFormatPainter();
    };
    this.painterKey = (e) => { if (e.key === 'Escape') this.stopFormatPainter(); };
    this.contentEl.addEventListener('mouseup', this.painterUp);
    document.addEventListener('keydown', this.painterKey);
    this.toolbar?.update();
  }

  /** Word boundaries around a document position, or null if not on a word. */
  private wordRangeAt(pos: number): { from: number; to: number } | null {
    const $pos = this.tiptap.state.doc.resolve(pos);
    if (!$pos.parent.isTextblock) return null;
    const text = $pos.parent.textContent;
    const offset = $pos.parentOffset;
    const before = text.slice(0, offset).match(/[\p{L}\p{N}'’-]+$/u)?.[0] ?? '';
    const after = text.slice(offset).match(/^[\p{L}\p{N}'’-]+/u)?.[0] ?? '';
    if (!before && !after) return null;
    return { from: pos - before.length, to: pos + after.length };
  }

  private applyPainter(from: number, to: number): void {
    if (!this.painter) return;
    let chain = this.tiptap.chain().focus().setTextSelection({ from, to });
    // Copy the block type + paragraph attributes (heading level, align, indent…).
    chain = chain.setNode(this.painter.blockType, this.painter.blockAttrs);
    chain = chain.unsetAllMarks();
    for (const m of this.painter.marks) chain = chain.setMark(m.type.name, m.attrs);
    chain.run();
  }

  private stopFormatPainter(): void {
    this.painter = null;
    this.contentEl.classList.remove('kontex--painting');
    if (this.painterUp) this.contentEl.removeEventListener('mouseup', this.painterUp);
    if (this.painterKey) document.removeEventListener('keydown', this.painterKey);
    this.painterUp = null;
    this.painterKey = null;
    this.toolbar?.update();
  }

  private async insertImageFiles(files: File[], pos: number | null): Promise<void> {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    if (pos != null) this.tiptap.chain().focus().setTextSelection(pos).run();
    for (const file of images) {
      let src: string;
      try {
        src = this.opts.upload ? await uploadFile(this.opts.upload, file) : await readAsDataURL(file);
      } catch (err) {
        window.alert((err as Error).message);
        continue;
      }
      this.tiptap.chain().focus().setImage({ src }).run();
    }
  }

  /** Default command set for the "/" slash menu. */
  private slashItems(): SlashItem[] {
    const H = (n: string) => `<b>${n}</b>`;
    return [
      { title: 'Heading 1', description: 'Large section heading', icon: H('H1'), keywords: ['h1', 'title'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() },
      { title: 'Heading 2', description: 'Medium section heading', icon: H('H2'), keywords: ['h2'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() },
      { title: 'Heading 3', description: 'Small section heading', icon: H('H3'), keywords: ['h3'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run() },
      { title: 'Bullet list', description: 'Simple bulleted list', icon: icon('bulletList'), keywords: ['ul', 'unordered', 'bullet'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
      { title: 'Numbered list', description: 'Ordered list', icon: icon('orderedList'), keywords: ['ol', 'ordered', 'number'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
      { title: 'Quote', description: 'Blockquote', icon: icon('blockquote'), keywords: ['blockquote', 'citation'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
      { title: 'Code block', description: 'Preformatted code', icon: icon('source'), keywords: ['code', 'pre'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
      { title: 'Divider', description: 'Horizontal rule', icon: icon('horizontalRule'), keywords: ['hr', 'separator', 'line'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
      { title: 'Table', description: 'Insert a 3×3 table', icon: icon('table'), keywords: ['grid'], command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { title: 'Image', description: 'Upload or embed an image', icon: icon('image'), keywords: ['picture', 'photo'], command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); this.insertImage(); } },
      { title: 'Media embed', description: 'YouTube, Vimeo, or iframe', icon: icon('media'), keywords: ['video', 'youtube', 'iframe'], command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); this.insertMedia(); } },
    ];
  }

  private insertMedia(): void {
    const url = window.prompt('Embed URL (YouTube, Vimeo, or any iframe URL)', 'https://');
    if (url && url !== 'https://') {
      this.tiptap.chain().focus().setIframe({ src: normalizeEmbedUrl(url) }).run();
    }
  }

  private toggleSource(): void {
    if (this.sourceTextarea) {
      // Leaving source view: push edited HTML back into the editor.
      const html = this.sourceTextarea.value;
      this.sourceTextarea.remove();
      this.sourceTextarea = null;
      this.contentEl.style.display = '';
      this.tiptap.commands.setContent(html, { emitUpdate: true });
      this.tiptap.commands.focus();
    } else {
      // Entering source view: show raw HTML in a textarea.
      const ta = document.createElement('textarea');
      ta.className = 'kontex__source';
      ta.value = this.getHTML();
      ta.spellcheck = false;
      this.contentEl.style.display = 'none';
      this.contentEl.insertAdjacentElement('afterend', ta);
      this.sourceTextarea = ta;
      ta.focus();
    }
    this.toolbar?.update();
  }

  // --- Public API ---------------------------------------------------------

  getHTML(): string {
    if (this.sourceTextarea) return this.sourceTextarea.value;
    return this.tiptap.getHTML();
  }

  setHTML(html: string): void {
    if (this.sourceTextarea) this.sourceTextarea.value = html;
    this.tiptap.commands.setContent(html, { emitUpdate: true });
  }

  getJSON(): Record<string, unknown> {
    return this.tiptap.getJSON() as Record<string, unknown>;
  }

  getText(): string {
    return this.tiptap.getText();
  }

  isEmpty(): boolean {
    return this.tiptap.isEmpty;
  }

  characters(): number {
    return this.tiptap.storage.characterCount?.characters() ?? this.getText().length;
  }

  words(): number {
    return this.tiptap.storage.characterCount?.words() ?? 0;
  }

  focus(): void {
    this.tiptap.commands.focus();
  }

  blur(): void {
    this.tiptap.commands.blur();
  }

  setEditable(value: boolean): void {
    this.tiptap.setEditable(value);
    this.toolbar?.update();
  }

  destroy(): void {
    if (this.sourceTextarea) {
      this.sourceTextarea.remove();
      this.sourceTextarea = null;
    }
    this.stopFormatPainter();
    if (this.fullscreen) {
      document.body.classList.remove('kontex-fullscreen-lock');
      if (this.fullscreenKey) document.removeEventListener('keydown', this.fullscreenKey);
    }
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.toolbar?.destroy();
    this.balloon.destroy();
    this.linkHover.destroy();
    this.tiptap.destroy();
    this.root.remove();
    if (this.boundTextarea) this.boundTextarea.style.display = this.originalDisplay;
  }
}

/** Resolve a selector or element to an HTMLElement, or throw. */
function resolveTarget(target: string | HTMLElement): HTMLElement {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) throw new Error(`KontexEditor: target not found: ${String(target)}`);
  return el;
}

/**
 * Create a KontexEditor on a `<textarea>` (CKEditor-style form binding) or any
 * element. Returns the editor instance. Awaitable for API symmetry.
 */
export async function create(
  target: string | HTMLElement,
  options: KontexOptions = {},
): Promise<KontexEditorInstance> {
  return new KontexEditor(resolveTarget(target), options);
}
