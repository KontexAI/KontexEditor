# KontexEditor — Integration Guide

How to embed KontexEditor into your application. It's a lightweight, framework-agnostic
rich-text editor built on TipTap/ProseMirror. CSS is injected automatically, so a single
script is fully self-contained.

- [1. Install](#1-install)
- [2. Quick start](#2-quick-start)
- [3. Framework integration](#3-framework-integration)
  - [Server-rendered forms (PHP / Rails / Django / plain HTML)](#server-rendered-forms)
- [4. Configuration options](#4-configuration-options)
- [5. Reading & writing content](#5-reading--writing-content)
- [6. Image uploads](#6-image-uploads)
- [7. Spell check](#7-spell-check)
- [8. Autosave & draft restore](#8-autosave--draft-restore)
- [9. Templates](#9-templates)
- [10. Custom toolbar](#10-custom-toolbar)
- [11. Read-only mode](#11-read-only-mode)
- [12. Styling & theming](#12-styling--theming)
- [13. Security: sanitize on the server](#13-security-sanitize-on-the-server)
- [14. TypeScript](#14-typescript)
- [15. Cleanup & lifecycle](#15-cleanup--lifecycle)
- [16. Browser support](#16-browser-support)
- [17. Troubleshooting](#17-troubleshooting)

---

## 1. Install

### Option A — `<script>` tag (UMD, no build step)

Use the prebuilt UMD bundle. It exposes a global `KontexEditor`.

```html
<script src="/path/to/kontex-editor.umd.cjs"></script>
<script>
  KontexEditor.create('#editor', { /* options */ });
</script>
```

### Option B — npm / bundler (ESM)

```bash
npm install kontex-editor
```

```js
import { create } from 'kontex-editor';
```

The package ships ESM (`dist/kontex-editor.js`), UMD (`dist/kontex-editor.umd.cjs`), and
type declarations (`dist/index.d.ts`), wired through the `exports` field — your bundler
picks the right one automatically.

### Building from source

```bash
git clone <repo> && cd KontexEditor
npm install
npm run build      # → dist/ (ESM + UMD + .d.ts)
```

---

## 2. Quick start

`KontexEditor.create(target, options?)` returns a `Promise` that resolves to the editor
instance. `target` is a CSS selector or an element.

```js
const editor = await KontexEditor.create('#editor', {
  content: '<p>Hello world</p>',
  placeholder: 'Start typing…',
  onChange: (html) => console.log(html),
});

editor.getHTML();        // current content
editor.setHTML('<p>…');  // replace content
editor.destroy();        // tear down
```

There are two mounting modes:

| Target | Behaviour |
|---|---|
| a `<textarea>` | The textarea is hidden and kept **in sync** — a normal form submit posts the HTML (CKEditor-style). |
| any other element (`<div>`) | The editor mounts inside it; read content via `getHTML()` / `onChange`. |

---

## 3. Framework integration

### Server-rendered forms

The simplest integration. Bind to your existing `<textarea>`; the editor mirrors its
content back on every change, so your normal form `POST` just works — no JS plumbing.

```html
<form method="post" action="/save">
  <textarea name="body"><p>Existing content from the server…</p></textarea>
  <button type="submit">Save</button>
</form>

<script src="/js/kontex-editor.umd.cjs"></script>
<script>
  KontexEditor.create('textarea[name=body]', {
    placeholder: 'Write something…',
    upload: { url: '/api/upload' },
  });
</script>
```

On the server, read `body` as you would any form field. **Sanitize it** before storing or
re-rendering — see [§13](#13-security-sanitize-on-the-server).


---

## 4. Configuration options

Pass as the second argument to `create(target, options)`.

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | `string` | textarea value / element HTML | Initial HTML. |
| `placeholder` | `string` | `''` | Placeholder shown when empty. |
| `editable` | `boolean` | `true` | `false` = read-only. |
| `toolbar` | `ToolbarItem[]` | full set | Custom layout; `[]` hides the toolbar. |
| `upload` | `{ url, fieldName? }` \| `(file) => Promise<string>` | — | Image upload handling. |
| `spellcheck` | `boolean` | `false` | Start with the dictionary spell-checker on. |
| `dictionary` | `{ affixUrl, dictionaryUrl }` | en_US on jsDelivr | Spell-check dictionary source. |
| `templates` | `TemplateDef[]` | built-in set | Content blocks for the Templates menu. |
| `autosave` | `{ key, debounceMs?, restore? }` | — | Persist to `localStorage`. |
| `onChange` | `(html, editor) => void` | — | Fires on every change. |
| `onReady` | `(editor) => void` | — | Fires once mounted. |
| `onFocus` / `onBlur` | `(editor) => void` | — | Focus events. |

---

## 5. Reading & writing content

```js
editor.getHTML();            // string — primary format, what you store/submit
editor.setHTML(html);        // replace content
editor.getJSON();            // ProseMirror/TipTap document (object)
editor.getText();            // plain text
editor.isEmpty();            // boolean
editor.characters();         // number
editor.words();              // number
editor.focus(); editor.blur();
```

- **HTML** is the canonical format — store the output of `getHTML()`, feed it back via
  `content` or `setHTML()`.
- `onChange(html)` gives you the new HTML live, without polling.
- When bound to a `<textarea>`, the textarea's `value` is always the current HTML, so
  form submits need no extra code.

---

## 6. Image uploads

Without an `upload` handler, inserting an image prompts for a URL (and drag/drop or paste
falls back to inline base64). Provide `upload` to send files to your backend.

### Endpoint form

```js
KontexEditor.create('#editor', {
  upload: { url: '/api/upload', fieldName: 'file' }, // fieldName default: 'file'
});
```

The editor `POST`s `multipart/form-data` with the file under `fieldName`. Your endpoint
must respond with JSON containing the hosted URL — any of these shapes is accepted:

```json
{ "url": "https://cdn.example.com/abc.jpg" }
{ "location": "https://cdn.example.com/abc.jpg" }
"https://cdn.example.com/abc.jpg"
```

Example (Express + multer):

```js
app.post('/api/upload', upload.single('file'), (req, res) => {
  const url = saveSomewhere(req.file);
  res.json({ url });
});
```

### Custom function

For signed uploads, S3, progress, auth headers, etc., pass a function returning the URL:

```js
KontexEditor.create('#editor', {
  upload: async (file) => {
    const { uploadUrl, publicUrl } = await getSignedUrl(file.name, file.type);
    await fetch(uploadUrl, { method: 'PUT', body: file });
    return publicUrl;
  },
});
```

Drag-and-drop and clipboard paste both route image files through the same handler.

---

## 7. Spell check

Dictionary-backed (Hunspell via `nspell`) with red underlines and a custom right-click
suggestion menu. **Off by default**; the toolbar toggle lazy-loads the dictionary on first
use, so it costs nothing until enabled.

```js
// Start enabled (loads the dictionary on init):
KontexEditor.create('#editor', { spellcheck: true });
```

### Self-hosting the dictionary (offline / other languages)

By default the en_US dictionary is fetched from jsDelivr. To self-host or use another
language, serve the Hunspell `.aff` / `.dic` files and point to them:

```js
KontexEditor.create('#editor', {
  spellcheck: true,
  dictionary: {
    affixUrl: '/dictionaries/en_US.aff',
    dictionaryUrl: '/dictionaries/en_US.dic',
  },
});
```

> The files must be served with permissive CORS if on another origin. Hunspell
> dictionaries for many languages are published as `dictionary-*` npm packages.

---

## 8. Autosave & draft restore

Persist content to `localStorage` as the user types, with a "Saved ✓" footer indicator.

```js
KontexEditor.create('#editor', {
  autosave: {
    key: 'draft:article-42',  // localStorage key (make it per-document)
    debounceMs: 800,          // optional, default 800
    restore: true,            // optional: reload the saved draft on init
  },
});
```

With `restore: true`, a saved draft (if present) takes precedence over `content` / the
textarea value at startup — useful for recovering unsaved work. Clear it yourself after a
successful server save:

```js
localStorage.removeItem('draft:article-42');
```

---

## 9. Templates

Predefined content blocks insertable from the Templates toolbar menu.

```js
KontexEditor.create('#editor', {
  templates: [
    { title: 'Signature', description: 'Closing block', html: '<p>Best regards,<br>The Team</p>' },
    { title: 'Disclaimer', html: '<blockquote><p>Confidential — do not forward.</p></blockquote>' },
  ],
});
```

Omit `templates` to use the built-in set; pass `[]` plus removing `template` from the
toolbar to disable it.

---

## 10. Custom toolbar

Pass any subset/order of items. `|` is a separator.

```js
KontexEditor.create('#editor', {
  toolbar: [
    'heading', 'fontFamily', 'fontSize', '|',
    'bold', 'italic', 'underline', 'clearFormat', '|',
    'fontColor', 'highlight', '|',
    'align', 'bulletList', 'orderedList', '|',
    'link', 'image', 'table', '|',
    'findReplace', 'spellcheck', 'undo', 'redo', 'source',
  ],
});
```

**Available items:** `heading`, `fontFamily`, `fontSize`, `bold`, `italic`, `underline`,
`strike`, `subscript`, `superscript`, `clearFormat`, `formatPainter`, `fontColor`,
`bgColor`, `highlight`, `align` (or individual `alignLeft`/`alignCenter`/`alignRight`/
`alignJustify`), `bulletList`, `orderedList`, `indent`, `outdent`, `lineSpacing`,
`paragraphSpacing`, `blockquote`, `link`, `image`, `media`, `table`, `horizontalRule`,
`specialChar`, `template`, `findReplace`, `spellcheck`, `formatPainter`, `fullscreen`,
`undo`, `redo`, `source`, `|`.

---

## 11. Read-only mode

```js
const editor = await KontexEditor.create('#editor', { editable: false });
// later…
editor.setEditable(true);
```

In read-only mode the toolbar is disabled and content can't be edited, but links,
resizing handles, etc. are inert. Useful for previews or permission-gated views.

---

## 12. Styling & theming

The editor injects its stylesheet once (id `kontex-editor-styles`). All classes are
namespaced under `.kontex`. Override them in your own CSS (loaded after the editor) to
restyle. Key hooks:

| Class | Element |
|---|---|
| `.kontex` | Root container (border, radius) |
| `.kontex__toolbar` | Toolbar bar |
| `.kontex__btn` | Toolbar buttons (icons inherit `currentColor`) |
| `.kontex__btn.is-active` | Active/toggled button |
| `.kontex__content` | Editable content area |
| `.kontex__footer` | Footer (autosave status + word/char count) |

Example — brand the toolbar and constrain height:

```css
.kontex__toolbar { background: #0f172a; }
.kontex__toolbar .kontex__btn { color: #e2e8f0; }
.kontex__content { min-height: 320px; max-height: 600px; }
```

Toolbar icons use `stroke="currentColor"`, so setting a `color` on `.kontex__toolbar`
recolours them.

---

## 13. Security: sanitize on the server

`getHTML()` returns the raw HTML the user authored. **Never trust it.** Before storing it
or rendering it anywhere (especially outside the editor), sanitize it server-side with an
allowlist sanitizer (e.g. DOMPurify on the server, Bleach in Python, sanitize-html in
Node, Loofah in Rails). The editor's paste-cleanup is a UX nicety, **not** a security
boundary.

When you later render stored HTML on a page, sanitize again on output unless you fully
trust the storage path.

---

## 14. TypeScript

Types ship with the package.

```ts
import { create } from 'kontex-editor';
import type {
  KontexOptions,
  KontexEditorInstance,
  ToolbarItem,
  UploadOption,
  TemplateDef,
} from 'kontex-editor';

const editor: KontexEditorInstance = await create('#editor', {
  content: '<p>Hi</p>',
} satisfies KontexOptions);
```

For advanced use, `editor.tiptap` exposes the underlying TipTap `Editor` (commands,
state, extension storage, etc.).

---

## 15. Cleanup & lifecycle

Always `destroy()` when removing the editor (SPA route changes, component unmount) to
detach listeners and DOM:

```js
editor.destroy();   // removes the editor, restores the original textarea/element
```

Lifecycle callbacks: `onReady` (mounted), `onChange` (content changed), `onFocus`,
`onBlur`.

---

## 16. Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari). Requires standard DOM APIs
(`fetch`, `FileReader`, `localStorage` for autosave). No IE support.

---

## 17. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `KontexEditor is not defined` | UMD script not loaded before your `create()` call. |
| Editor mounts but no styles | The injected `<style>` was removed/overridden; ensure nothing strips `#kontex-editor-styles`. |
| Images insert as huge base64 strings | No `upload` handler configured — add one to host files instead of inlining. |
| Spell check does nothing | It's off until toggled; first toggle fetches the dictionary (needs network/CORS). |
| Content lost on navigation | Call `getHTML()` and persist before unmount, or enable `autosave`. |
| Pasted Word content looks messy | Paste cleanup handles common cases; for the rest, use Source view (`</>`) to inspect/fix. |
| Form submits empty `body` | Ensure you bound to the `<textarea>` itself (not a wrapping div) so it stays synced. |

---

Questions or gaps? See the [README](README.md) for the feature overview, or open the
demo (`npm run dev`) to experiment.
