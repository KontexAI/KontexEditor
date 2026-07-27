import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export interface SlashItem {
  title: string;
  description?: string;
  /** Icon as an HTML string (SVG markup or short text like "H1"). */
  icon?: string;
  /** Extra terms to match against the query. */
  keywords?: string[];
  /** Runs when chosen. Delete the trigger range, then perform the insertion. */
  command: (props: { editor: Editor; range: Range }) => void;
}

export interface SlashCommandOptions {
  items: SlashItem[];
}

interface Trigger {
  query: string;
  from: number;
  to: number;
}

// "/" at the start of a block or after whitespace, followed by a word (the query).
const TRIGGER_RE = /(^|[\s ])\/([\w-]*)$/;

/** Notion-style slash menu: type `/` to insert blocks / formatting at the caret. */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { items: [] };
  },

  addProseMirrorPlugins() {
    const menu = new SlashMenu(this.editor, this.options.items);
    return [
      new Plugin({
        key: new PluginKey('kontexSlash'),
        props: {
          handleKeyDown: (_view, event) => menu.onKeyDown(event),
        },
        view: () => ({
          update: (view) => menu.update(view),
          destroy: () => menu.destroy(),
        }),
      }),
    ];
  },
});

class SlashMenu {
  private readonly el: HTMLElement;
  private open = false;
  private range: Range | null = null;
  private filtered: SlashItem[] = [];
  private index = 0;
  private lastQuery = '';
  private readonly onDocDown: (e: MouseEvent) => void;

  constructor(
    private readonly editor: Editor,
    private readonly allItems: SlashItem[],
  ) {
    this.el = document.createElement('div');
    this.el.className = 'kontex-slash';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    this.onDocDown = (e) => { if (!this.el.contains(e.target as Node)) this.hide(); };
    document.addEventListener('mousedown', this.onDocDown);
  }

  update(view: EditorView): void {
    const trigger = this.editor.isEditable ? this.computeTrigger(view) : null;
    if (!trigger) {
      this.hide();
      return;
    }
    const q = trigger.query.toLowerCase();
    if (q !== this.lastQuery) {
      this.index = 0;
      this.lastQuery = q;
    }
    this.filtered = this.allItems.filter((it) => this.matches(it, q));
    if (!this.filtered.length) {
      this.hide();
      return;
    }
    this.range = { from: trigger.from, to: trigger.to };
    if (this.index >= this.filtered.length) this.index = 0;
    this.open = true;
    this.render();
    this.position(view, trigger.from);
  }

  private computeTrigger(view: EditorView): Trigger | null {
    const { selection } = view.state;
    if (!selection.empty) return null;
    const $from = selection.$from;
    if ($from.parent.type.spec.code) return null; // skip code blocks
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
    const m = TRIGGER_RE.exec(textBefore);
    if (!m) return null;
    const query = m[2];
    const slashLen = query.length + 1; // "/" + query
    return { query, from: selection.from - slashLen, to: selection.from };
  }

  private matches(item: SlashItem, q: string): boolean {
    if (!q) return true;
    if (item.title.toLowerCase().includes(q)) return true;
    return (item.keywords ?? []).some((k) => k.toLowerCase().includes(q));
  }

  private render(): void {
    this.el.innerHTML = '';
    this.filtered.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kontex-slash__item' + (i === this.index ? ' is-active' : '');
      btn.innerHTML =
        `<span class="kontex-slash__ico">${item.icon ?? ''}</span>` +
        `<span class="kontex-slash__text"><span class="kontex-slash__title">${escapeHtml(item.title)}</span>` +
        (item.description ? `<span class="kontex-slash__desc">${escapeHtml(item.description)}</span>` : '') +
        '</span>';
      btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep selection/range
      btn.addEventListener('click', () => this.select(i));
      btn.addEventListener('mousemove', () => { if (this.index !== i) { this.index = i; this.render(); } });
      this.el.appendChild(btn);
    });
  }

  private position(view: EditorView, pos: number): void {
    let coords;
    try {
      coords = view.coordsAtPos(pos);
    } catch {
      this.hide();
      return;
    }
    this.el.style.display = 'block';
    const rect = this.el.getBoundingClientRect();
    let top = coords.bottom + 4;
    if (top + rect.height > window.innerHeight - 8) {
      const above = coords.top - rect.height - 4;
      top = above < 8 ? window.innerHeight - rect.height - 8 : above;
    }
    let left = coords.left;
    if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
    this.el.style.top = `${Math.round(Math.max(8, top))}px`;
    this.el.style.left = `${Math.round(Math.max(8, left))}px`;
  }

  onKeyDown(event: KeyboardEvent): boolean {
    if (!this.open || !this.filtered.length) return false;
    switch (event.key) {
      case 'ArrowDown':
        this.index = (this.index + 1) % this.filtered.length;
        this.render();
        this.scrollActiveIntoView();
        return true;
      case 'ArrowUp':
        this.index = (this.index - 1 + this.filtered.length) % this.filtered.length;
        this.render();
        this.scrollActiveIntoView();
        return true;
      case 'Enter':
      case 'Tab':
        this.select(this.index);
        return true;
      case 'Escape':
        this.hide();
        return true;
      default:
        return false;
    }
  }

  private scrollActiveIntoView(): void {
    this.el.children[this.index]?.scrollIntoView({ block: 'nearest' });
  }

  private select(i: number): void {
    const item = this.filtered[i];
    const range = this.range;
    this.hide();
    if (item && range) item.command({ editor: this.editor, range });
  }

  private hide(): void {
    this.open = false;
    this.el.style.display = 'none';
    this.index = 0;
    this.lastQuery = '';
  }

  destroy(): void {
    document.removeEventListener('mousedown', this.onDocDown);
    this.el.remove();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
