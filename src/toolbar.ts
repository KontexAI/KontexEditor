import type { Editor } from '@tiptap/core';
import type { ToolbarItem, TemplateDef } from './types';
import { icon, type IconName } from './icons';
import { searchInfo } from './extensions/search-replace';

export interface ToolbarContext {
  editor: Editor;
  setLink: () => void;
  insertImage: () => void;
  insertTable: () => void;
  insertMedia: () => void;
  toggleSource: () => void;
  isSourceMode: () => boolean;
  toggleSpellcheck: () => void;
  spellcheckEnabled: () => boolean;
  spellcheckLoading: () => boolean;
  startFormatPainter: () => void;
  formatPainterActive: () => boolean;
  toggleFullscreen: () => void;
  fullscreenActive: () => boolean;
  templates: TemplateDef[];
}

const SPECIAL_SYMBOLS = ['©', '®', '™', '°', '±', '×', '÷', '≈', '≠', '≤', '≥', '€', '£', '¥', '¢', '§', '¶', '•', '–', '—', '…', '«', '»', '“', '”', '‘', '’', '→', '←', '↑', '↓', '★', '☆', '♥', '✓', '✗', 'µ', 'π', 'Ω', '∞'];
const SPECIAL_EMOJI = ['😀', '😃', '😉', '😊', '😍', '😎', '🤔', '👍', '👎', '👏', '🙌', '🙏', '💪', '🔥', '✨', '🎉', '❤️', '💡', '✅', '❌', '⚠️', '📌', '📝', '📅', '⭐', '🚀', '💯'];

interface ButtonDef {
  icon: IconName;
  title: string;
  active?: (e: Editor) => boolean;
  enabled?: (e: Editor) => boolean;
  run: (ctx: ToolbarContext) => void;
}

// Simple icon buttons. (heading / font-size / colour / menu controls handled separately.)
const BUTTONS: Record<string, ButtonDef> = {
  bold: { icon: 'bold', title: 'Bold', active: (e) => e.isActive('bold'), run: ({ editor }) => editor.chain().focus().toggleBold().run() },
  italic: { icon: 'italic', title: 'Italic', active: (e) => e.isActive('italic'), run: ({ editor }) => editor.chain().focus().toggleItalic().run() },
  underline: { icon: 'underline', title: 'Underline', active: (e) => e.isActive('underline'), run: ({ editor }) => editor.chain().focus().toggleUnderline().run() },
  strike: { icon: 'strike', title: 'Strikethrough', active: (e) => e.isActive('strike'), run: ({ editor }) => editor.chain().focus().toggleStrike().run() },
  subscript: { icon: 'subscript', title: 'Subscript', active: (e) => e.isActive('subscript'), run: ({ editor }) => editor.chain().focus().toggleSubscript().run() },
  superscript: { icon: 'superscript', title: 'Superscript', active: (e) => e.isActive('superscript'), run: ({ editor }) => editor.chain().focus().toggleSuperscript().run() },
  bulletList: { icon: 'bulletList', title: 'Bullet list', active: (e) => e.isActive('bulletList'), run: ({ editor }) => editor.chain().focus().toggleBulletList().run() },
  orderedList: { icon: 'orderedList', title: 'Numbered list', active: (e) => e.isActive('orderedList'), run: ({ editor }) => editor.chain().focus().toggleOrderedList().run() },
  blockquote: { icon: 'blockquote', title: 'Blockquote', active: (e) => e.isActive('blockquote'), run: ({ editor }) => editor.chain().focus().toggleBlockquote().run() },
  clearFormat: { icon: 'clearFormat', title: 'Clear formatting', run: ({ editor }) => editor.chain().focus().unsetAllMarks().run() },
  formatPainter: { icon: 'formatPainter', title: 'Format painter — select source text, click here, then click the target word', run: (ctx) => ctx.startFormatPainter() },
  image: { icon: 'image', title: 'Insert image', run: (ctx) => ctx.insertImage() },
  table: { icon: 'table', title: 'Insert table', run: (ctx) => ctx.insertTable() },
  media: { icon: 'media', title: 'Embed media (video / iframe)', run: (ctx) => ctx.insertMedia() },
  horizontalRule: { icon: 'horizontalRule', title: 'Horizontal line', run: ({ editor }) => editor.chain().focus().setHorizontalRule().run() },
  undo: { icon: 'undo', title: 'Undo', enabled: (e) => e.can().undo(), run: ({ editor }) => editor.chain().focus().undo().run() },
  redo: { icon: 'redo', title: 'Redo', enabled: (e) => e.can().redo(), run: ({ editor }) => editor.chain().focus().redo().run() },
  source: { icon: 'source', title: 'Source / HTML', run: (ctx) => ctx.toggleSource() },
  spellcheck: { icon: 'spellcheck', title: 'Check spelling', run: (ctx) => ctx.toggleSpellcheck() },
  fullscreen: { icon: 'fullscreen', title: 'Full screen', run: (ctx) => ctx.toggleFullscreen() },
  alignLeft: { icon: 'alignLeft', title: 'Align left', active: (e) => e.isActive({ textAlign: 'left' }), run: ({ editor }) => editor.chain().focus().setTextAlign('left').run() },
  alignCenter: { icon: 'alignCenter', title: 'Align center', active: (e) => e.isActive({ textAlign: 'center' }), run: ({ editor }) => editor.chain().focus().setTextAlign('center').run() },
  alignRight: { icon: 'alignRight', title: 'Align right', active: (e) => e.isActive({ textAlign: 'right' }), run: ({ editor }) => editor.chain().focus().setTextAlign('right').run() },
  alignJustify: { icon: 'alignJustify', title: 'Justify', active: (e) => e.isActive({ textAlign: 'justify' }), run: ({ editor }) => editor.chain().focus().setTextAlign('justify').run() },
  indent: { icon: 'indent', title: 'Increase indent', run: ({ editor }) => editor.chain().focus().indent().run() },
  outdent: { icon: 'outdent', title: 'Decrease indent', run: ({ editor }) => editor.chain().focus().outdent().run() },
};

const TEXT_PALETTE = ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#ffffff', '#e60000', '#ff9900', '#ffeb00', '#008a00', '#0066cc', '#9933ff', '#ff66cc'];
const HIGHLIGHT_PALETTE = ['#fff3a3', '#c8f7c5', '#bde4ff', '#ffc9de', '#e6ccff', '#ffd8a8', '#d9d9d9'];

interface ColorSpec {
  icon: IconName;
  title: string;
  palette: string[];
  current: (e: Editor) => string | undefined;
  apply: (e: Editor, color: string) => void;
  clear: (e: Editor) => void;
}

const COLOR_SPECS: Record<string, ColorSpec> = {
  fontColor: {
    icon: 'fontColor', title: 'Text color', palette: TEXT_PALETTE,
    current: (e) => e.getAttributes('textStyle').color as string | undefined,
    apply: (e, c) => e.chain().focus().setColor(c).run(),
    clear: (e) => e.chain().focus().unsetColor().run(),
  },
  bgColor: {
    icon: 'bgColor', title: 'Background color', palette: TEXT_PALETTE,
    current: (e) => e.getAttributes('textStyle').backgroundColor as string | undefined,
    apply: (e, c) => e.chain().focus().setBackgroundColor(c).run(),
    clear: (e) => e.chain().focus().unsetBackgroundColor().run(),
  },
  highlight: {
    icon: 'highlight', title: 'Highlight', palette: HIGHLIGHT_PALETTE,
    current: (e) => e.getAttributes('highlight').color as string | undefined,
    apply: (e, c) => e.chain().focus().setHighlight({ color: c }).run(),
    clear: (e) => e.chain().focus().unsetHighlight().run(),
  },
};

interface SelectSpec {
  title: string;
  options: Array<[label: string, value: string]>;
  current: (e: Editor) => string;
  apply: (e: Editor, value: string) => void;
}

/** Read a block-level global attribute from the node at the selection head. */
function blockAttr(e: Editor, name: string): string {
  const v = e.state.selection.$head.parent.attrs[name];
  return v == null ? '' : String(v);
}

const FONT_FAMILIES: Array<[label: string, value: string]> = [
  ['Font', ''],
  ['Arial', 'Arial, Helvetica, sans-serif'],
  ['Georgia', 'Georgia, serif'],
  ['Times New Roman', '"Times New Roman", Times, serif'],
  ['Courier New', '"Courier New", Courier, monospace'],
  ['Verdana', 'Verdana, Geneva, sans-serif'],
  ['Tahoma', 'Tahoma, sans-serif'],
  ['Comic Sans', '"Comic Sans MS", cursive'],
];

const SELECT_SPECS: Record<string, SelectSpec> = {
  fontFamily: {
    title: 'Font family',
    options: FONT_FAMILIES,
    current: (e) => (e.getAttributes('textStyle').fontFamily as string) ?? '',
    apply: (e, v) => (v ? e.chain().focus().setFontFamily(v).run() : e.chain().focus().unsetFontFamily().run()),
  },
  fontSize: {
    title: 'Font size',
    options: [['Size', ''], ['Small', '12px'], ['Normal', '14px'], ['Medium', '16px'], ['Large', '18px'], ['X-Large', '24px'], ['Huge', '32px']],
    current: (e) => (e.getAttributes('textStyle').fontSize as string) ?? '',
    apply: (e, v) => (v ? e.chain().focus().setFontSize(v).run() : e.chain().focus().unsetFontSize().run()),
  },
};

interface MenuOption { label: string; value: string; icon?: IconName }

interface MenuSpec {
  title: string;
  /** Button icon — static, or derived from the current value (e.g. alignment). */
  buttonIcon: IconName | ((e: Editor) => IconName);
  options: MenuOption[];
  current: (e: Editor) => string;
  apply: (e: Editor, value: string) => void;
}

const ALIGN_ICON: Record<string, IconName> = { left: 'alignLeft', center: 'alignCenter', right: 'alignRight', justify: 'alignJustify' };

function currentAlign(e: Editor): string {
  for (const a of ['center', 'right', 'justify']) if (e.isActive({ textAlign: a })) return a;
  return 'left';
}

const MENU_SPECS: Record<string, MenuSpec> = {
  align: {
    title: 'Text alignment',
    buttonIcon: (e) => ALIGN_ICON[currentAlign(e)],
    options: [
      { label: 'Align left', value: 'left', icon: 'alignLeft' },
      { label: 'Align center', value: 'center', icon: 'alignCenter' },
      { label: 'Align right', value: 'right', icon: 'alignRight' },
      { label: 'Justify', value: 'justify', icon: 'alignJustify' },
    ],
    current: currentAlign,
    apply: (e, v) => e.chain().focus().setTextAlign(v).run(),
  },
  lineSpacing: {
    title: 'Line spacing',
    buttonIcon: 'lineSpacing',
    options: [
      { label: 'Default', value: '' }, { label: 'Single', value: '1' }, { label: '1.15', value: '1.15' },
      { label: '1.5', value: '1.5' }, { label: 'Double', value: '2' }, { label: '2.5', value: '2.5' },
    ],
    current: (e) => blockAttr(e, 'lineSpacing'),
    apply: (e, v) => e.chain().focus().setLineSpacing(v || null).run(),
  },
  paragraphSpacing: {
    title: 'Paragraph spacing',
    buttonIcon: 'paragraphSpacing',
    options: [
      { label: 'Default', value: '' }, { label: 'None', value: '0' }, { label: 'Small', value: '0.5em' },
      { label: 'Medium', value: '1em' }, { label: 'Large', value: '1.5em' },
    ],
    current: (e) => blockAttr(e, 'blockSpacing'),
    apply: (e, v) => e.chain().focus().setBlockSpacing(v || null).run(),
  },
};

export interface BuiltToolbar {
  el: HTMLElement;
  update: () => void;
  destroy: () => void;
}

export function buildToolbar(items: ToolbarItem[], ctx: ToolbarContext): BuiltToolbar {
  const el = document.createElement('div');
  el.className = 'kontex__toolbar';
  el.setAttribute('role', 'toolbar');

  const updaters: Array<() => void> = [];
  const popups: HTMLElement[] = [];
  const closeAll = (except?: HTMLElement) => popups.forEach((p) => { if (p !== except) p.style.display = 'none'; });

  const onDocDown = (ev: MouseEvent) => { if (!el.contains(ev.target as Node)) closeAll(); };
  document.addEventListener('mousedown', onDocDown);

  for (const item of items) {
    if (item === '|') {
      const sep = document.createElement('span');
      sep.className = 'kontex__sep';
      el.appendChild(sep);
    } else if (item === 'heading') {
      buildHeading(el, ctx, updaters);
    } else if (item === 'link') {
      buildLink(el, ctx, updaters, popups, closeAll);
    } else if (item === 'findReplace') {
      buildFindReplace(el, ctx, updaters, popups, closeAll);
    } else if (item === 'template') {
      buildTemplate(el, ctx, popups, closeAll);
    } else if (item === 'specialChar') {
      buildSpecialChars(el, ctx, popups, closeAll);
    } else if (item in MENU_SPECS) {
      buildMenu(el, ctx, MENU_SPECS[item], updaters, popups, closeAll);
    } else if (item in COLOR_SPECS) {
      buildColor(el, ctx, COLOR_SPECS[item], updaters, popups, closeAll);
    } else if (item in SELECT_SPECS) {
      buildSelect(el, ctx, SELECT_SPECS[item], updaters);
    } else if (item in BUTTONS) {
      buildButton(el, ctx, item, BUTTONS[item], updaters);
    }
  }

  return {
    el,
    update: () => updaters.forEach((u) => u()),
    destroy: () => document.removeEventListener('mousedown', onDocDown),
  };
}

function iconButton(iconName: IconName, title: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kontex__btn';
  btn.innerHTML = icon(iconName);
  btn.setAttribute('data-tooltip', title); // custom fast tooltip (see styles)
  btn.setAttribute('aria-label', title);
  btn.addEventListener('mousedown', (ev) => ev.preventDefault()); // keep selection
  return btn;
}

function buildButton(el: HTMLElement, ctx: ToolbarContext, item: string, def: ButtonDef, updaters: Array<() => void>): void {
  const btn = iconButton(def.icon, def.title);
  if (item === 'source') btn.classList.add('kontex__btn--source');
  btn.addEventListener('click', () => def.run(ctx));
  el.appendChild(btn);
  updaters.push(() => {
    const e = ctx.editor;
    const sourceMode = ctx.isSourceMode();
    if (item === 'source') {
      btn.classList.toggle('is-active', sourceMode);
      return;
    }
    if (item === 'spellcheck') {
      const loading = ctx.spellcheckLoading();
      btn.disabled = sourceMode || loading;
      btn.classList.toggle('is-active', !sourceMode && ctx.spellcheckEnabled());
      btn.classList.toggle('kontex__btn--loading', loading);
      return;
    }
    if (item === 'formatPainter') {
      btn.disabled = sourceMode;
      btn.classList.toggle('is-active', !sourceMode && ctx.formatPainterActive());
      return;
    }
    if (item === 'fullscreen') {
      const active = ctx.fullscreenActive();
      btn.classList.toggle('is-active', active);
      btn.innerHTML = icon(active ? 'fullscreenExit' : 'fullscreen');
      btn.setAttribute('data-tooltip', active ? 'Exit full screen' : 'Full screen');
      btn.setAttribute('aria-label', active ? 'Exit full screen' : 'Full screen');
      return;
    }
    btn.disabled = sourceMode || (def.enabled ? !def.enabled(e) : false);
    btn.classList.toggle('is-active', !sourceMode && (def.active ? def.active(e) : false));
  });
}

function buildHeading(el: HTMLElement, ctx: ToolbarContext, updaters: Array<() => void>): void {
  const select = document.createElement('select');
  select.className = 'kontex__select';
  select.title = 'Paragraph style';
  for (const [val, text] of [['p', 'Paragraph'], ['1', 'Heading 1'], ['2', 'Heading 2'], ['3', 'Heading 3']] as const) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = text;
    select.appendChild(o);
  }
  select.addEventListener('change', () => {
    const v = select.value;
    if (v === 'p') ctx.editor.chain().focus().setParagraph().run();
    else ctx.editor.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
  });
  el.appendChild(select);
  updaters.push(() => {
    const e = ctx.editor;
    select.value = e.isActive('heading', { level: 1 }) ? '1'
      : e.isActive('heading', { level: 2 }) ? '2'
        : e.isActive('heading', { level: 3 }) ? '3'
          : 'p';
  });
}

function buildSelect(el: HTMLElement, ctx: ToolbarContext, spec: SelectSpec, updaters: Array<() => void>): void {
  const select = document.createElement('select');
  select.className = 'kontex__select';
  select.title = spec.title;
  for (const [label, value] of spec.options) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    select.appendChild(o);
  }
  select.addEventListener('change', () => spec.apply(ctx.editor, select.value));
  el.appendChild(select);
  updaters.push(() => { select.value = spec.current(ctx.editor); });
}

function buildMenu(
  el: HTMLElement,
  ctx: ToolbarContext,
  spec: MenuSpec,
  updaters: Array<() => void>,
  popups: HTMLElement[],
  closeAll: (except?: HTMLElement) => void,
): void {
  const group = document.createElement('div');
  group.className = 'kontex__group';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kontex__btn kontex__menu-btn';
  btn.setAttribute('data-tooltip', spec.title);
  btn.setAttribute('aria-label', spec.title);
  btn.addEventListener('mousedown', (ev) => ev.preventDefault());
  const iconSpan = document.createElement('span');
  iconSpan.className = 'kontex__menu-icon';
  const caret = document.createElement('span');
  caret.className = 'kontex__caret';
  caret.innerHTML = icon('chevronDown');
  btn.append(iconSpan, caret);

  const popup = document.createElement('div');
  popup.className = 'kontex__popup kontex__menu';
  popup.style.display = 'none';
  popups.push(popup);

  const itemEls: Array<{ el: HTMLButtonElement; value: string }> = [];
  for (const opt of spec.options) {
    const itemBtn = document.createElement('button');
    itemBtn.type = 'button';
    itemBtn.className = 'kontex__menu-item';
    itemBtn.innerHTML = (opt.icon ? icon(opt.icon) : '') + `<span>${opt.label}</span>`;
    itemBtn.addEventListener('mousedown', (ev) => ev.preventDefault());
    itemBtn.addEventListener('click', () => { spec.apply(ctx.editor, opt.value); popup.style.display = 'none'; });
    popup.appendChild(itemBtn);
    itemEls.push({ el: itemBtn, value: opt.value });
  }

  btn.addEventListener('click', () => {
    const open = popup.style.display === 'none';
    closeAll();
    popup.style.display = open ? 'block' : 'none';
  });

  group.append(btn, popup);
  el.appendChild(group);

  updaters.push(() => {
    const e = ctx.editor;
    const iconName = typeof spec.buttonIcon === 'function' ? spec.buttonIcon(e) : spec.buttonIcon;
    iconSpan.innerHTML = icon(iconName);
    btn.disabled = ctx.isSourceMode();
    const cur = spec.current(e);
    for (const { el: ie, value } of itemEls) ie.classList.toggle('is-active', value === cur);
  });
}

function buildColor(
  el: HTMLElement,
  ctx: ToolbarContext,
  spec: ColorSpec,
  updaters: Array<() => void>,
  popups: HTMLElement[],
  closeAll: (except?: HTMLElement) => void,
): void {
  const group = document.createElement('div');
  group.className = 'kontex__group';

  const btn = iconButton(spec.icon, spec.title);
  btn.classList.add('kontex__color');
  const bar = document.createElement('span');
  bar.className = 'kontex__colorbar';
  btn.appendChild(bar);

  const popup = document.createElement('div');
  popup.className = 'kontex__popup';
  popup.style.display = 'none';
  popups.push(popup);

  const swatches = document.createElement('div');
  swatches.className = 'kontex__swatches';
  for (const color of spec.palette) {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'kontex__swatch';
    s.style.background = color;
    s.title = color;
    s.addEventListener('mousedown', (ev) => ev.preventDefault());
    s.addEventListener('click', () => { spec.apply(ctx.editor, color); popup.style.display = 'none'; });
    swatches.appendChild(s);
  }

  const row = document.createElement('div');
  row.className = 'kontex__popup-row';
  const custom = document.createElement('input');
  custom.type = 'color';
  custom.className = 'kontex__custom-color';
  custom.title = 'Custom color';
  custom.addEventListener('input', () => spec.apply(ctx.editor, custom.value));
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'kontex__popup-clear';
  clear.textContent = 'Remove';
  clear.addEventListener('mousedown', (ev) => ev.preventDefault());
  clear.addEventListener('click', () => { spec.clear(ctx.editor); popup.style.display = 'none'; });
  row.append(custom, clear);

  popup.append(swatches, row);
  btn.addEventListener('click', () => {
    const open = popup.style.display === 'none';
    closeAll();
    popup.style.display = open ? 'block' : 'none';
  });

  group.append(btn, popup);
  el.appendChild(group);

  updaters.push(() => {
    const c = spec.current(ctx.editor);
    bar.style.background = c ?? 'transparent';
    btn.disabled = ctx.isSourceMode();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Wrap a trigger button + popup in a positioned group and wire open/close. */
function attachPopup(
  el: HTMLElement,
  btn: HTMLElement,
  popup: HTMLElement,
  popups: HTMLElement[],
  closeAll: (except?: HTMLElement) => void,
  onOpen?: () => void,
): void {
  popup.style.display = 'none';
  popups.push(popup);
  const group = document.createElement('div');
  group.className = 'kontex__group';
  group.append(btn, popup);
  el.appendChild(group);
  btn.addEventListener('click', () => {
    const open = popup.style.display === 'none';
    closeAll();
    popup.style.display = open ? 'block' : 'none';
    if (open) onOpen?.();
  });
}

function buildSpecialChars(el: HTMLElement, ctx: ToolbarContext, popups: HTMLElement[], closeAll: (e?: HTMLElement) => void): void {
  const btn = iconButton('specialChar', 'Special character / emoji');
  const popup = document.createElement('div');
  popup.className = 'kontex__popup kontex__charpopup';

  const section = (label: string, chars: string[]) => {
    const heading = document.createElement('div');
    heading.className = 'kontex__popup-label';
    heading.textContent = label;
    popup.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'kontex__chargrid';
    for (const ch of chars) {
      const cb = document.createElement('button');
      cb.type = 'button';
      cb.className = 'kontex__char';
      cb.textContent = ch;
      cb.addEventListener('mousedown', (ev) => ev.preventDefault());
      cb.addEventListener('click', () => { ctx.editor.chain().focus().insertContent(ch).run(); popup.style.display = 'none'; });
      grid.appendChild(cb);
    }
    popup.appendChild(grid);
  };

  section('Symbols', SPECIAL_SYMBOLS);
  section('Emoji', SPECIAL_EMOJI);
  attachPopup(el, btn, popup, popups, closeAll);
}

function buildTemplate(el: HTMLElement, ctx: ToolbarContext, popups: HTMLElement[], closeAll: (e?: HTMLElement) => void): void {
  const btn = iconButton('template', 'Insert template');
  const popup = document.createElement('div');
  popup.className = 'kontex__popup kontex__menu kontex__templatemenu';

  if (!ctx.templates.length) {
    const empty = document.createElement('div');
    empty.className = 'kontex__popup-label';
    empty.textContent = 'No templates configured';
    popup.appendChild(empty);
  }
  for (const t of ctx.templates) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'kontex__menu-item kontex__template-item';
    item.innerHTML =
      `<span class="kontex__template-title">${escapeHtml(t.title)}</span>` +
      (t.description ? `<span class="kontex__template-desc">${escapeHtml(t.description)}</span>` : '');
    item.addEventListener('mousedown', (ev) => ev.preventDefault());
    item.addEventListener('click', () => { ctx.editor.chain().focus().insertContent(t.html).run(); popup.style.display = 'none'; });
    popup.appendChild(item);
  }
  attachPopup(el, btn, popup, popups, closeAll);
}

function buildFindReplace(
  el: HTMLElement,
  ctx: ToolbarContext,
  updaters: Array<() => void>,
  popups: HTMLElement[],
  closeAll: (e?: HTMLElement) => void,
): void {
  const btn = iconButton('findReplace', 'Find & replace');
  const popup = document.createElement('div');
  popup.className = 'kontex__popup kontex__find';

  const mkInput = (placeholder: string) => {
    const i = document.createElement('input');
    i.type = 'text';
    i.className = 'kontex__find-input';
    i.placeholder = placeholder;
    return i;
  };
  const findInput = mkInput('Find');
  const replaceInput = mkInput('Replace with');

  const count = document.createElement('span');
  count.className = 'kontex__find-count';

  const mkBtn = (label: string, title: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kontex__find-btn';
    b.textContent = label;
    b.title = title;
    return b;
  };
  const prev = mkBtn('‹', 'Previous match');
  const next = mkBtn('›', 'Next match');
  const replaceBtn = mkBtn('Replace', 'Replace current');
  const replaceAllBtn = mkBtn('All', 'Replace all');

  const refresh = () => {
    const { count: c, index } = searchInfo(ctx.editor.state);
    count.textContent = c ? `${index + 1} / ${c}` : findInput.value ? '0 / 0' : '';
  };

  findInput.addEventListener('input', () => { ctx.editor.commands.setSearchTerm(findInput.value); refresh(); });
  findInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ctx.editor.commands.findNext(); refresh(); } });
  prev.addEventListener('click', () => { ctx.editor.commands.findPrevious(); refresh(); });
  next.addEventListener('click', () => { ctx.editor.commands.findNext(); refresh(); });
  replaceBtn.addEventListener('click', () => { ctx.editor.commands.replaceCurrent(replaceInput.value); refresh(); });
  replaceAllBtn.addEventListener('click', () => { ctx.editor.commands.replaceAll(replaceInput.value); refresh(); });

  const row1 = document.createElement('div');
  row1.className = 'kontex__find-row';
  row1.append(findInput, prev, next, count);
  const row2 = document.createElement('div');
  row2.className = 'kontex__find-row';
  row2.append(replaceInput, replaceBtn, replaceAllBtn);
  popup.append(row1, row2);

  attachPopup(el, btn, popup, popups, closeAll, () => { findInput.focus(); findInput.select(); refresh(); });
  updaters.push(() => { if (popup.style.display !== 'none') refresh(); });
}

function buildLink(
  el: HTMLElement,
  ctx: ToolbarContext,
  updaters: Array<() => void>,
  popups: HTMLElement[],
  closeAll: (e?: HTMLElement) => void,
): void {
  const btn = iconButton('link', 'Insert/edit link');
  const popup = document.createElement('div');
  popup.className = 'kontex__popup kontex__linkpopup';

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.className = 'kontex__find-input';
  urlInput.placeholder = 'https://example.com';

  const tabLabel = document.createElement('label');
  tabLabel.className = 'kontex__link-check';
  const newTab = document.createElement('input');
  newTab.type = 'checkbox';
  tabLabel.append(newTab, document.createTextNode(' Open in new tab'));

  const apply = document.createElement('button');
  apply.type = 'button';
  apply.className = 'kontex__find-btn';
  apply.textContent = 'Apply';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'kontex__find-btn';
  remove.textContent = 'Remove';

  const applyLink = () => {
    const href = urlInput.value.trim();
    if (!href) return;
    const attrs = newTab.checked
      ? { href, target: '_blank', rel: 'noopener noreferrer' }
      : { href, target: null, rel: null };
    ctx.editor.chain().focus().extendMarkRange('link').setLink(attrs).run();
    popup.style.display = 'none';
  };
  apply.addEventListener('click', applyLink);
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } });
  remove.addEventListener('click', () => {
    ctx.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    popup.style.display = 'none';
  });

  const row1 = document.createElement('div');
  row1.className = 'kontex__find-row';
  row1.appendChild(urlInput);
  const row2 = document.createElement('div');
  row2.className = 'kontex__find-row';
  row2.appendChild(tabLabel);
  const row3 = document.createElement('div');
  row3.className = 'kontex__find-row';
  row3.append(apply, remove);
  popup.append(row1, row2, row3);

  attachPopup(el, btn, popup, popups, closeAll, () => {
    const a = ctx.editor.getAttributes('link');
    urlInput.value = (a.href as string) || '';
    newTab.checked = a.target === '_blank';
    urlInput.focus();
    urlInput.select();
  });

  updaters.push(() => {
    btn.classList.toggle('is-active', ctx.editor.isActive('link'));
    btn.disabled = ctx.isSourceMode();
  });
}
