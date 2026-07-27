import type { Editor } from '@tiptap/core';

/** Identifiers for the built-in toolbar buttons / groups. */
export type ToolbarItem =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'link'
  | 'image'
  | 'table'
  | 'horizontalRule'
  | 'undo'
  | 'redo'
  | 'source'
  | 'align'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'indent'
  | 'outdent'
  | 'subscript'
  | 'superscript'
  | 'fontSize'
  | 'fontFamily'
  | 'formatPainter'
  | 'fontColor'
  | 'bgColor'
  | 'highlight'
  | 'lineSpacing'
  | 'paragraphSpacing'
  | 'media'
  | 'findReplace'
  | 'template'
  | 'specialChar'
  | 'clearFormat'
  | 'spellcheck'
  | 'fullscreen'
  | '|'; // visual separator

/** A reusable content block insertable from the Templates menu. */
export interface TemplateDef {
  title: string;
  html: string;
  description?: string;
}

/** Image upload handler: either an endpoint URL (POSTed as multipart) or a custom fn. */
export type UploadOption =
  | { url: string; fieldName?: string }
  | ((file: File) => Promise<string>);

export interface KontexOptions {
  /** Initial HTML. Falls back to the bound textarea's value, then empty. */
  content?: string;
  /** Placeholder shown when empty. */
  placeholder?: string;
  /** Start editable (true) or read-only (false). Default true. */
  editable?: boolean;
  /** Keep the toolbar pinned to the top while scrolling long content. Default false.
   *  Uses `position: sticky`; for a page with a fixed header, set the CSS variable
   *  `--kontex-sticky-top` on the editor element to offset it. */
  stickyToolbar?: boolean;
  /** Enable the "/" slash command menu for inserting blocks at the caret. Default true. */
  slashMenu?: boolean;
  /** Start with the (dictionary-backed) spell checker enabled. Default false — users
   *  toggle it from the toolbar, which lazy-loads the dictionary on first use. */
  spellcheck?: boolean;
  /** Override the dictionary source (defaults to a CORS-enabled en_US on jsDelivr). */
  dictionary?: { affixUrl: string; dictionaryUrl: string };
  /** Toolbar layout. Defaults to a CKEditor-like set. Pass [] to hide the toolbar. */
  toolbar?: ToolbarItem[];
  /** Image upload handling. Omit to disable image uploads (URL embed still works). */
  upload?: UploadOption;
  /** Content blocks available from the Templates menu. Falls back to a built-in set. */
  templates?: TemplateDef[];
  /** Persist content to localStorage as the user types (with a "Saved" footer indicator). */
  autosave?: { key: string; debounceMs?: number; restore?: boolean };
  /** Fired on every content change with the current HTML. */
  onChange?: (html: string, editor: KontexEditorInstance) => void;
  /** Fired once the editor is mounted and ready. */
  onReady?: (editor: KontexEditorInstance) => void;
  onFocus?: (editor: KontexEditorInstance) => void;
  onBlur?: (editor: KontexEditorInstance) => void;
}

/** Public instance surface returned by `KontexEditor.create()`. */
export interface KontexEditorInstance {
  /** The underlying TipTap editor, for advanced use. */
  readonly tiptap: Editor;
  getHTML(): string;
  setHTML(html: string): void;
  getJSON(): Record<string, unknown>;
  getText(): string;
  isEmpty(): boolean;
  characters(): number;
  words(): number;
  focus(): void;
  blur(): void;
  setEditable(value: boolean): void;
  /** Unmount the editor and restore the original textarea/element. */
  destroy(): void;
}
