import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { SpellEngine } from './engine';

export interface SpellcheckStorage {
  engine: SpellEngine | null;
  enabled: boolean;
  ignored: Set<string>;
  /** Set by the plugin view; call to re-scan the document (debounced). */
  requestRecompute: (() => void) | null;
}

const key = new PluginKey<DecorationSet>('kontexSpellcheck');
const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const DEBOUNCE_MS = 350;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spellcheck: {
      /** Re-scan the document for misspellings. */
      refreshSpellcheck: () => ReturnType;
    };
  }
}

function computeDecorations(doc: PMNode, engine: SpellEngine, ignored: Set<string>): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    // Skip code and links (URLs / identifiers shouldn't be flagged).
    if (node.marks.some((m) => m.type.name === 'code' || m.type.name === 'link')) return;
    let m: RegExpExecArray | null;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(node.text))) {
      const word = m[0];
      if (word.length < 2) continue;
      if (ignored.has(word.toLowerCase())) continue;
      if (engine.correct(word)) continue;
      const from = pos + m.index;
      decos.push(Decoration.inline(from, from + word.length, { class: 'kontex-misspelled' }));
    }
  });
  return DecorationSet.create(doc, decos);
}

// --- Custom suggestion context menu -----------------------------------------

let openMenu: { el: HTMLElement; cleanup: () => void } | null = null;

function closeSpellMenu(): void {
  if (!openMenu) return;
  openMenu.cleanup();
  openMenu.el.remove();
  openMenu = null;
}

interface MenuArgs {
  view: EditorView;
  x: number;
  y: number;
  word: string;
  from: number;
  to: number;
  engine: SpellEngine;
  storage: SpellcheckStorage;
}

function openSpellMenu({ view, x, y, word, from, to, engine, storage }: MenuArgs): void {
  closeSpellMenu();
  const menu = document.createElement('div');
  menu.className = 'kontex-spellmenu';

  const item = (label: string, onClick: () => void, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `kontex-spellmenu__item ${cls}`.trim();
    b.textContent = label;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => { onClick(); closeSpellMenu(); });
    menu.appendChild(b);
    return b;
  };

  const suggestions = engine.suggest(word);
  if (suggestions.length) {
    for (const s of suggestions) {
      item(s, () => {
        view.dispatch(view.state.tr.insertText(s, from, to));
        view.focus();
        storage.requestRecompute?.();
      }, 'kontex-spellmenu__suggest');
    }
  } else {
    const none = document.createElement('div');
    none.className = 'kontex-spellmenu__none';
    none.textContent = 'No suggestions';
    menu.appendChild(none);
  }

  const sep = document.createElement('div');
  sep.className = 'kontex-spellmenu__sep';
  menu.appendChild(sep);

  item('Add to dictionary', () => {
    engine.add(word);
    storage.requestRecompute?.();
  });
  item('Ignore', () => {
    storage.ignored.add(word.toLowerCase());
    storage.requestRecompute?.();
  });

  document.body.appendChild(menu);
  // Clamp to viewport.
  const rect = menu.getBoundingClientRect();
  const left = Math.min(x, window.innerWidth - rect.width - 8);
  const top = Math.min(y, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;

  const onDown = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) closeSpellMenu(); };
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') closeSpellMenu(); };
  // Defer so the opening right-click doesn't immediately close it.
  setTimeout(() => {
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
  });
  openMenu = {
    el: menu,
    cleanup: () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    },
  };
}

// --- Extension ---------------------------------------------------------------

export const Spellcheck = Extension.create<unknown, SpellcheckStorage>({
  name: 'spellcheck',

  addStorage() {
    return { engine: null, enabled: false, ignored: new Set<string>(), requestRecompute: null };
  },

  addCommands() {
    return {
      refreshSpellcheck:
        () =>
        ({ editor }) => {
          (editor.storage as unknown as Record<string, SpellcheckStorage>).spellcheck.requestRecompute?.();
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const getStorage = () => this.storage;

    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, value) {
            const meta = tr.getMeta(key) as { decorations?: DecorationSet; clear?: boolean } | undefined;
            if (meta?.clear) return DecorationSet.empty;
            if (meta?.decorations) return meta.decorations;
            return tr.docChanged ? value.map(tr.mapping, tr.doc) : value;
          },
        },
        props: {
          decorations(state) {
            return key.getState(state);
          },
          handleDOMEvents: {
            contextmenu(view, event) {
              const { engine, enabled } = getStorage();
              if (!enabled || !engine) return false;
              const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!at) return false;
              const found = key.getState(view.state)?.find(at.pos, at.pos) ?? [];
              if (!found.length) return false;
              const { from, to } = found[0];
              const word = view.state.doc.textBetween(from, to);
              event.preventDefault();
              openSpellMenu({ view, x: event.clientX, y: event.clientY, word, from, to, engine, storage: getStorage() });
              return true;
            },
          },
        },
        view(view) {
          let timer: ReturnType<typeof setTimeout> | null = null;

          const recompute = () => {
            const { engine, enabled, ignored } = getStorage();
            const current = key.getState(view.state);
            if (!enabled || !engine) {
              if (current && current !== DecorationSet.empty) {
                view.dispatch(view.state.tr.setMeta(key, { clear: true }));
              }
              return;
            }
            const decorations = computeDecorations(view.state.doc, engine, ignored);
            view.dispatch(view.state.tr.setMeta(key, { decorations }));
          };

          const schedule = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(recompute, DEBOUNCE_MS);
          };

          getStorage().requestRecompute = schedule;

          return {
            update(updatedView, prevState) {
              if (prevState.doc !== updatedView.state.doc) schedule();
            },
            destroy() {
              if (timer) clearTimeout(timer);
              closeSpellMenu();
              getStorage().requestRecompute = null;
            },
          };
        },
      }),
    ];
  },
});
