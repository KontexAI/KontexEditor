import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { Transaction, EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface SearchState {
  term: string;
  caseSensitive: boolean;
  matches: Array<{ from: number; to: number }>;
  index: number;
}

interface SearchMeta {
  term: string;
  caseSensitive: boolean;
  resetIndex?: boolean;
  keepIndex?: boolean;
  index?: number;
}

const key = new PluginKey<SearchState>('kontexSearch');

/** Current match count + active index, for UI display. */
export function searchInfo(state: EditorState): { count: number; index: number } {
  const s = key.getState(state);
  return s ? { count: s.matches.length, index: s.index } : { count: 0, index: 0 };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchTerm: (term: string, caseSensitive?: boolean) => ReturnType;
      findNext: () => ReturnType;
      findPrevious: () => ReturnType;
      replaceCurrent: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

function findMatches(doc: PMNode, term: string, caseSensitive: boolean): SearchState['matches'] {
  const matches: SearchState['matches'] = [];
  if (!term) return matches;
  const needle = caseSensitive ? term : term.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const hay = caseSensitive ? node.text : node.text.toLowerCase();
    let i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) {
      matches.push({ from: pos + i, to: pos + i + needle.length });
      i += needle.length;
    }
  });
  return matches;
}

/** Set the active match index, move the selection there and scroll it into view. */
function moveToMatch(tr: Transaction, s: SearchState, index: number): Transaction {
  const m = s.matches[index];
  tr.setMeta(key, { term: s.term, caseSensitive: s.caseSensitive, index } satisfies SearchMeta);
  tr.setSelection(TextSelection.create(tr.doc, m.from, m.to));
  return tr.scrollIntoView();
}

/** Find & replace: match highlighting + navigation + replace, driven by commands. */
export const SearchReplace = Extension.create({
  name: 'searchReplace',

  addCommands() {
    return {
      setSearchTerm:
        (term, caseSensitive = false) =>
        ({ state, dispatch }) => {
          if (dispatch) dispatch(state.tr.setMeta(key, { term, caseSensitive, resetIndex: true } satisfies SearchMeta));
          return true;
        },

      clearSearch:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) dispatch(state.tr.setMeta(key, { term: '', caseSensitive: false, resetIndex: true } satisfies SearchMeta));
          return true;
        },

      findNext:
        () =>
        ({ state, dispatch, tr }) => {
          const s = key.getState(state);
          if (!s || !s.matches.length) return false;
          if (dispatch) dispatch(moveToMatch(tr, s, (s.index + 1) % s.matches.length));
          return true;
        },

      findPrevious:
        () =>
        ({ state, dispatch, tr }) => {
          const s = key.getState(state);
          if (!s || !s.matches.length) return false;
          if (dispatch) dispatch(moveToMatch(tr, s, (s.index - 1 + s.matches.length) % s.matches.length));
          return true;
        },

      replaceCurrent:
        (replacement) =>
        ({ state, dispatch, tr }) => {
          const s = key.getState(state);
          if (!s || !s.matches.length) return false;
          const m = s.matches[s.index];
          if (!m) return false;
          tr.insertText(replacement, m.from, m.to);
          tr.setMeta(key, { term: s.term, caseSensitive: s.caseSensitive, keepIndex: true } satisfies SearchMeta);
          if (dispatch) dispatch(tr);
          return true;
        },

      replaceAll:
        (replacement) =>
        ({ state, dispatch, tr }) => {
          const s = key.getState(state);
          if (!s || !s.matches.length) return false;
          // Replace from the end backwards so earlier match positions stay valid.
          for (let i = s.matches.length - 1; i >= 0; i--) {
            const m = s.matches[i];
            tr.insertText(replacement, m.from, m.to);
          }
          tr.setMeta(key, { term: s.term, caseSensitive: s.caseSensitive, resetIndex: true } satisfies SearchMeta);
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key,
        state: {
          init: () => ({ term: '', caseSensitive: false, matches: [], index: 0 }),
          apply(tr, value, _old, newState) {
            const meta = tr.getMeta(key) as SearchMeta | undefined;

            if (meta) {
              const matches = findMatches(newState.doc, meta.term, meta.caseSensitive);
              let index = meta.index ?? (meta.keepIndex ? value.index : 0);
              if (index >= matches.length) index = 0;
              return { term: meta.term, caseSensitive: meta.caseSensitive, matches, index };
            }

            if (tr.docChanged && value.term) {
              const matches = findMatches(newState.doc, value.term, value.caseSensitive);
              const index = value.index >= matches.length ? 0 : value.index;
              return { ...value, matches, index };
            }

            return value;
          },
        },
        props: {
          decorations(state) {
            const s = key.getState(state);
            if (!s || !s.matches.length) return null;
            const decos = s.matches.map((m, i) =>
              Decoration.inline(m.from, m.to, {
                class: i === s.index ? 'kontex-search kontex-search--current' : 'kontex-search',
              }),
            );
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
