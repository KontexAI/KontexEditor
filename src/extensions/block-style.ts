import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface BlockStyleOptions {
  /** Node types these block attributes apply to. */
  types: string[];
  /** Maximum indent level reachable via the indent command. */
  maxIndent: number;
  /** Indent step size, in em, per level. */
  indentStep: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockStyle: {
      /** Increase indent of selected blocks by one level. */
      indent: () => ReturnType;
      /** Decrease indent of selected blocks by one level. */
      outdent: () => ReturnType;
      /** Set bottom margin (paragraph spacing) on selected blocks, or null to clear. */
      setBlockSpacing: (value: string | null) => ReturnType;
      /** Set line-height (line spacing) on selected blocks, or null to clear. */
      setLineSpacing: (value: string | null) => ReturnType;
    };
  }
}

/**
 * Block-level formatting that TipTap doesn't ship: indent, paragraph spacing
 * (margin-bottom) and line spacing (line-height). Implemented as global
 * attributes on paragraph/heading so they render to inline `style` and round-trip
 * through HTML — the correct home for these properties (vs. an inline text span).
 */
export const BlockStyle = Extension.create<BlockStyleOptions>({
  name: 'blockStyle',

  addOptions() {
    return { types: ['paragraph', 'heading'], maxIndent: 8, indentStep: 2 };
  },

  addGlobalAttributes() {
    const step = this.options.indentStep;
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => {
              const ml = parseFloat((el as HTMLElement).style.marginLeft);
              return ml ? Math.round(ml / step) : 0;
            },
            renderHTML: (attrs) =>
              attrs.indent ? { style: `margin-left: ${attrs.indent * step}em` } : {},
          },
          lineSpacing: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineSpacing ? { style: `line-height: ${attrs.lineSpacing}` } : {},
          },
          blockSpacing: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.marginBottom || null,
            renderHTML: (attrs) =>
              attrs.blockSpacing ? { style: `margin-bottom: ${attrs.blockSpacing}` } : {},
          },
        },
      },
    ];
  },

  addKeyboardShortcuts() {
    // Tab indents paragraphs/headings; defers to list & table Tab behaviour.
    const defer = () =>
      this.editor.isActive('listItem') || this.editor.isActive('taskItem') || this.editor.isActive('table');
    return {
      Tab: () => (defer() ? false : this.editor.commands.indent()),
      'Shift-Tab': () => (defer() ? false : this.editor.commands.outdent()),
    };
  },

  addCommands() {
    const { types, maxIndent } = this.options;

    const updateBlocks =
      (compute: (attrs: Record<string, unknown>) => Record<string, unknown> | null) =>
      ({ state, tr, dispatch }: { state: any; tr: any; dispatch?: (tr: any) => void }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node: PMNode, pos: number) => {
          if (!types.includes(node.type.name)) return;
          const patch = compute(node.attrs);
          if (patch) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...patch });
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };

    return {
      indent: () =>
        updateBlocks((attrs) => {
          const cur = (attrs.indent as number) || 0;
          const next = Math.min(maxIndent, cur + 1);
          return next !== cur ? { indent: next } : null;
        }),
      outdent: () =>
        updateBlocks((attrs) => {
          const cur = (attrs.indent as number) || 0;
          const next = Math.max(0, cur - 1);
          return next !== cur ? { indent: next } : null;
        }),
      setBlockSpacing: (value) =>
        updateBlocks((attrs) => (attrs.blockSpacing === value ? null : { blockSpacing: value })),
      setLineSpacing: (value) =>
        updateBlocks((attrs) => (attrs.lineSpacing === value ? null : { lineSpacing: value })),
    };
  },
});
