import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/** Pixels from a row's bottom edge that count as the resize zone. */
const HANDLE = 5;
/** Minimum row height in px. */
const MIN_ROW = 24;

interface DragState {
  dom: HTMLTableRowElement;
  startY: number;
  startHeight: number;
  rowPos: number;
  rowAttrs: Record<string, unknown>;
}

/** Resolve the document position + node of the tableRow that owns a DOM `<tr>`. */
function rowFromDom(view: EditorView, tr: HTMLTableRowElement) {
  let pos: number;
  try {
    pos = view.posAtDOM(tr, 0);
  } catch {
    return null;
  }
  const $pos = view.state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === 'tableRow') {
      return { pos: $pos.before(d), node: $pos.node(d) };
    }
  }
  return null;
}

function rowAtEvent(view: EditorView, event: MouseEvent): HTMLTableRowElement | null {
  const target = event.target as HTMLElement | null;
  const cell = target?.closest?.('td, th');
  if (!cell || !view.dom.contains(cell)) return null;
  return cell.parentElement as HTMLTableRowElement | null;
}

/**
 * Adds drag-to-resize for table rows: a `height` attribute on tableRow plus a
 * plugin that detects dragging on a row's bottom border. Complements the built-in
 * column resizing (which handles column + overall table width).
 */
export const TableRowResize = Extension.create({
  name: 'tableRowResize',

  addGlobalAttributes() {
    return [
      {
        types: ['tableRow'],
        attributes: {
          height: {
            default: null,
            parseHTML: (el) => {
              const h = parseInt((el as HTMLElement).style.height, 10);
              return h || null;
            },
            renderHTML: (attrs) => (attrs.height ? { style: `height: ${attrs.height}px` } : {}),
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    let drag: DragState | null = null;
    let hoverRow: HTMLTableRowElement | null = null;

    return [
      new Plugin({
        key: new PluginKey('kontexTableRowResize'),
        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              if (drag) {
                const next = Math.max(MIN_ROW, drag.startHeight + (event.clientY - drag.startY));
                drag.dom.style.height = `${Math.round(next)}px`;
                return false;
              }
              const row = rowAtEvent(view, event);
              const near = row && Math.abs(event.clientY - row.getBoundingClientRect().bottom) <= HANDLE;
              hoverRow = near ? row : null;
              view.dom.classList.toggle('kontex-row-resize', !!near);
              return false;
            },
            mousedown(view, event) {
              if (!hoverRow || !view.editable) return false;
              const rect = hoverRow.getBoundingClientRect();
              if (Math.abs(event.clientY - rect.bottom) > HANDLE) return false;
              const info = rowFromDom(view, hoverRow);
              if (!info) return false;
              event.preventDefault();
              const active: DragState = {
                dom: hoverRow,
                startY: event.clientY,
                startHeight: rect.height,
                rowPos: info.pos,
                rowAttrs: info.node.attrs,
              };
              drag = active;

              const onUp = () => {
                window.removeEventListener('mouseup', onUp);
                const finalHeight = Math.round(active.dom.getBoundingClientRect().height);
                view.dispatch(
                  view.state.tr.setNodeMarkup(active.rowPos, undefined, { ...active.rowAttrs, height: finalHeight }),
                );
                drag = null;
              };
              window.addEventListener('mouseup', onUp);
              return true;
            },
          },
        },
      }),
    ];
  },
});
