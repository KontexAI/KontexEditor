// Self-injecting stylesheet so a single UMD <script> needs no separate CSS link.
// Styling aims for a familiar CKEditor-like classic look.

const STYLE_ID = 'kontex-editor-styles';

const CSS = /* css */ `
.kontex {
  border: 1px solid #c4c4c4;
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #fff;
  color: #1a1a1a;
  display: flex;
  flex-direction: column;
}
.kontex.kontex--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9000;
  width: 100vw;
  height: 100vh;
  margin: 0;
  max-width: none;
  border: none;
  border-radius: 0;
}
.kontex.kontex--fullscreen .kontex__content { flex: 1 1 auto; max-height: none; }
body.kontex-fullscreen-lock { overflow: hidden; }
.kontex__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  border-radius: 4px 4px 0 0;
}
.kontex__toolbar--sticky {
  position: sticky;
  top: var(--kontex-sticky-top, 0px);
  z-index: 30;
}
.kontex__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #3a3f47;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s ease, color 0.12s ease;
}
.kontex__btn svg { width: 18px; height: 18px; display: block; }
.kontex__btn:hover { background: #eef0f3; color: #1a1a1a; }
.kontex__btn:active { background: #e4e7eb; }
.kontex__btn.is-active { background: #e7efff; border-color: #b9cdff; color: #1d4ed8; }
.kontex__btn:disabled { opacity: 0.35; cursor: default; background: transparent; color: #3a3f47; }
.kontex__select {
  height: 30px;
  padding: 0 24px 0 8px;
  border: 1px solid #d8dce1;
  border-radius: 4px;
  background: #fff;
  color: #1a1a1a;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%233a3f47' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
}
.kontex__select:hover { border-color: #b9c0c9; }
.kontex__sep { width: 1px; align-self: stretch; margin: 4px 4px; background: #e3e6ea; }
.kontex__group { position: relative; display: inline-flex; }
.kontex__color { position: relative; padding-bottom: 3px; }
.kontex__colorbar {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 4px;
  height: 3px;
  border-radius: 1px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
}
.kontex__popup {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  margin-top: 3px;
  padding: 8px;
  background: #fff;
  border: 1px solid #d8dce1;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
}
.kontex__swatches { display: grid; grid-template-columns: repeat(7, 20px); gap: 5px; }
.kontex__swatch {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.1s ease;
}
.kontex__swatch:hover { transform: scale(1.12); }
.kontex__popup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}
.kontex__custom-color {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 1px solid #d8dce1;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.kontex__popup-clear {
  border: none;
  background: none;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
}
.kontex__popup-clear:hover { text-decoration: underline; }
.kontex__content { padding: 10px 14px; min-height: 180px; overflow-y: auto; }
.kontex__content:focus { outline: none; }
.kontex__content .ProseMirror { outline: none; min-height: 160px; }
.kontex__content p { margin: 0 0 0.75em; }
.kontex__content h1 { font-size: 1.7em; margin: 0.6em 0 0.4em; }
.kontex__content h2 { font-size: 1.4em; margin: 0.6em 0 0.4em; }
.kontex__content h3 { font-size: 1.2em; margin: 0.6em 0 0.4em; }
.kontex__content blockquote {
  border-left: 3px solid #d0d0d0;
  margin: 0 0 0.75em;
  padding-left: 1em;
  color: #555;
}
.kontex__content ul, .kontex__content ol { padding-left: 1.5em; margin: 0 0 0.75em; }
.kontex__content a { color: #2563eb; text-decoration: underline; }
.kontex__content img { max-width: 100%; height: auto; }
.kontex__content .tableWrapper { overflow-x: auto; margin: 0 0 0.75em; }
.kontex__content table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0;
}
.kontex__content th, .kontex__content td {
  position: relative;
  min-width: 2em;
  border: 1px solid #c4c4c4;
  padding: 4px 8px;
  vertical-align: top;
  box-sizing: border-box;
}
.kontex__content th { background: #f2f2f2; font-weight: 600; }
/* Built-in column-resize handle (prosemirror-tables) */
.kontex__content .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  z-index: 5;
  background-color: #4a90ff;
  pointer-events: none;
}
.kontex__content .ProseMirror.resize-cursor { cursor: ew-resize; cursor: col-resize; }
/* Row-resize cursor (custom TableRowResize plugin) */
.kontex__content .ProseMirror.kontex-row-resize { cursor: row-resize; }
.kontex__content .selectedCell { background: rgba(74, 144, 255, 0.12); }
.kontex__content hr { border: none; border-top: 1px solid #d0d0d0; margin: 1em 0; }
.kontex__content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: #9a9a9a;
  pointer-events: none;
  height: 0;
  float: left;
}
.kontex__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 10px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  font-size: 11px;
  color: #777;
  border-radius: 0 0 4px 4px;
}
.kontex__source {
  width: 100%;
  min-height: 180px;
  border: none;
  padding: 10px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}
.kontex__btn.is-active.kontex__btn--source { background: #e0eaff; }

/* Dropdown menu buttons (alignment, line/paragraph spacing) */
.kontex__menu-btn { width: auto; min-width: 30px; padding: 0 4px; gap: 1px; }
.kontex__menu-icon { display: inline-flex; }
.kontex__caret svg { width: 11px; height: 11px; display: block; opacity: 0.55; }
.kontex__menu { padding: 4px; min-width: 156px; }
.kontex__menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: none;
  color: #1a1a1a;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.kontex__menu-item svg { width: 16px; height: 16px; flex: none; }
.kontex__menu-item:hover { background: #eef0f3; }
.kontex__menu-item.is-active { background: #e7efff; color: #1d4ed8; }

/* Resizable images */
.kontex-img { position: relative; display: inline-block; line-height: 0; max-width: 100%; }
.kontex-img img { max-width: 100%; height: auto; display: block; border-radius: 2px; }
.kontex-img.ProseMirror-selectednode img { outline: 2px solid #4a90ff; outline-offset: 1px; }
.kontex-img__handle {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 12px;
  height: 12px;
  background: #4a90ff;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  cursor: nwse-resize;
  display: none;
}
.kontex-img:hover .kontex-img__handle,
.kontex-img.ProseMirror-selectednode .kontex-img__handle { display: block; }
.kontex__content .ProseMirror[contenteditable="false"] .kontex-img__handle { display: none !important; }

/* Find & replace highlights */
.kontex-search { background: #fde68a; border-radius: 2px; }
.kontex-search--current { background: #fb923c; color: #1a1a1a; }

/* Spellcheck */
.kontex-misspelled {
  text-decoration: underline wavy #e11d48;
  text-decoration-skip-ink: none;
  text-underline-offset: 2px;
}
.kontex__btn--loading svg { animation: kontex-spin 0.8s linear infinite; opacity: 0.6; }
@keyframes kontex-spin { to { transform: rotate(360deg); } }
.kontex-spellmenu {
  position: fixed;
  z-index: 10000;
  min-width: 170px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  background: #fff;
  border: 1px solid #d8dce1;
  border-radius: 6px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.18);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.kontex-spellmenu__item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  background: none;
  color: #1a1a1a;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.kontex-spellmenu__item:hover { background: #eef0f3; }
.kontex-spellmenu__suggest { font-weight: 600; }
.kontex-spellmenu__none { padding: 6px 10px; color: #999; font-size: 13px; }
.kontex-spellmenu__sep { height: 1px; margin: 4px 2px; background: #e8eaed; }

/* Slash command menu */
.kontex-slash {
  position: fixed;
  z-index: 10000;
  min-width: 260px;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  background: #fff;
  border: 1px solid #d8dce1;
  border-radius: 9px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.kontex-slash__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 9px;
  border: none;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  text-align: left;
}
.kontex-slash__item.is-active { background: #eef0f3; }
.kontex-slash__ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #f1f3f6;
  border: 1px solid #e6eaef;
  color: #3a3f47;
  font-size: 12px;
  font-weight: 700;
}
.kontex-slash__ico svg { width: 17px; height: 17px; }
.kontex-slash__text { display: flex; flex-direction: column; min-width: 0; }
.kontex-slash__title { font-size: 13.5px; font-weight: 600; color: #1a1a1a; }
.kontex-slash__desc { font-size: 11.5px; color: #8a9099; }

/* Footer autosave indicator */
.kontex__footer-status { color: #2f9e5e; }

/* Format painter armed cursor */
.kontex__content.kontex--painting,
.kontex__content.kontex--painting * { cursor: copy !important; }

/* Image captions */
.kontex-img__caption {
  display: none;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.3;
  color: #555;
  text-align: center;
  outline: none;
  min-height: 1.2em;
}
.kontex-img.has-caption .kontex-img__caption,
.kontex-img.kontex-img--selected .kontex-img__caption { display: block; }
.kontex-img__caption:empty::before { content: attr(data-placeholder); color: #9a9a9a; }
.kontex__content figure.kontex-figure { margin: 0 0 0.75em; }
.kontex__content figure.kontex-figure figcaption { font-size: 13px; color: #555; text-align: center; margin-top: 4px; }

/* Link hover bubble */
.kontex-linkbubble {
  position: fixed;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: #2b2f36;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
}
.kontex-linkbubble__url {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #9cc2ff;
  text-decoration: none;
}
.kontex-linkbubble__url:hover { text-decoration: underline; }
.kontex-linkbubble__btn {
  border: none;
  background: none;
  color: #eaecef;
  font-size: 12px;
  padding: 2px 5px;
  border-radius: 3px;
  cursor: pointer;
}
.kontex-linkbubble__btn:hover { background: rgba(255, 255, 255, 0.16); }
.kontex-linkbubble__input {
  width: 220px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid #4a5059;
  border-radius: 4px;
  background: #1f2329;
  color: #fff;
  font: inherit;
  font-size: 12px;
  outline: none;
}

/* Responsive media embed */
.kontex-embed {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  margin: 0 0 0.75em;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
}
.kontex-embed iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.kontex__content .ProseMirror-selectednode .kontex-embed,
.kontex__content .kontex-embed.ProseMirror-selectednode { outline: 2px solid #4a90ff; }

/* Special characters / emoji popup */
.kontex__charpopup { max-width: 280px; }
.kontex__popup-label { font-size: 11px; color: #888; margin: 2px 2px 4px; text-transform: uppercase; letter-spacing: 0.03em; }
.kontex__chargrid { display: grid; grid-template-columns: repeat(8, 28px); gap: 2px; margin-bottom: 6px; }
.kontex__char {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.kontex__char:hover { background: #eef0f3; }

/* Templates menu */
.kontex__templatemenu { min-width: 220px; }
.kontex__template-item { flex-direction: column; align-items: flex-start; gap: 1px; }
.kontex__template-title { font-weight: 600; }
.kontex__template-desc { font-size: 11px; color: #888; }

/* Find & replace panel */
.kontex__find { min-width: 280px; }
.kontex__find-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.kontex__find-row:last-child { margin-bottom: 0; }
.kontex__find-input {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #d8dce1;
  border-radius: 4px;
  font: inherit;
  font-size: 13px;
  outline: none;
}
.kontex__find-input:focus { border-color: #4a90ff; }
.kontex__find-btn {
  height: 28px;
  padding: 0 8px;
  border: 1px solid #d8dce1;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.kontex__find-btn:hover { background: #eef0f3; }
.kontex__find-count { font-size: 12px; color: #777; min-width: 48px; text-align: right; }

/* Link popup */
.kontex__linkpopup { min-width: 260px; }
.kontex__link-check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #444; cursor: pointer; }
.kontex__link-check input { margin: 0; }

/* Floating context balloon (table / image controls) */
.kontex-balloon {
  position: fixed;
  z-index: 10000;
  display: none;
  gap: 2px;
  padding: 4px;
  background: #2b2f36;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
.kontex-balloon__group { display: flex; gap: 2px; flex-wrap: wrap; max-width: 460px; }
.kontex-balloon__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 7px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #eaecef;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.kontex-balloon__btn svg { width: 15px; height: 15px; }
.kontex-balloon__btn:hover { background: rgba(255, 255, 255, 0.16); }

/* Fast, clear custom tooltips for icon buttons */
.kontex__btn[data-tooltip], .kontex-balloon__btn[data-tooltip] { position: relative; }
.kontex__btn[data-tooltip]::after,
.kontex__btn[data-tooltip]::before,
.kontex-balloon__btn[data-tooltip]::after,
.kontex-balloon__btn[data-tooltip]::before {
  position: absolute;
  top: calc(100% + 7px);
  left: 50%;
  opacity: 0;
  pointer-events: none;
  z-index: 100;
  transition: opacity 0.09s ease;
  transition-delay: 0s;
}
.kontex__btn[data-tooltip]::after,
.kontex-balloon__btn[data-tooltip]::after {
  content: attr(data-tooltip);
  transform: translateX(-50%);
  white-space: nowrap;
  background: #2b2f36;
  color: #fff;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 400;
  padding: 5px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
/* little caret pointing up at the button */
.kontex__btn[data-tooltip]::before,
.kontex-balloon__btn[data-tooltip]::before {
  content: "";
  top: calc(100% + 2px);
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: #2b2f36;
}
.kontex__btn[data-tooltip]:hover::after,
.kontex__btn[data-tooltip]:hover::before,
.kontex-balloon__btn[data-tooltip]:hover::after,
.kontex-balloon__btn[data-tooltip]:hover::before {
  opacity: 1;
  transition-delay: 0.12s; /* fast — vs the browser's ~1.5s native title delay */
}
/* Disabled buttons shouldn't show a tooltip */
.kontex__btn[data-tooltip]:disabled::after,
.kontex__btn[data-tooltip]:disabled::before { display: none; }
`;

export function injectStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
