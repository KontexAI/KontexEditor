import { Image } from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';

/** Minimum rendered width while dragging, in px. */
const MIN_WIDTH = 40;

/** Reflect the image's alignment on its NodeView wrapper. */
function applyAlign(wrapper: HTMLElement, align: string | null): void {
  wrapper.style.float = '';
  wrapper.style.margin = '';
  wrapper.style.display = '';
  if (align === 'left') wrapper.style.float = 'left';
  else if (align === 'right') wrapper.style.float = 'right';
  else if (align === 'center') {
    wrapper.style.display = 'block';
    wrapper.style.margin = '0 auto';
  }
}

function parseWidth(img: HTMLImageElement): number | null {
  const w = img.getAttribute('width') || img.style.width;
  return w ? parseInt(w, 10) || null : null;
}

/**
 * The official Image extension with: a drag-resize handle (numeric `width`),
 * alignment (`align`), and an editable caption (`caption`) rendered as a
 * semantic <figure><figcaption>. The caption is edited inside the NodeView and
 * isolated from ProseMirror via stopEvent so typing in it doesn't move the
 * document selection.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute('width') || (el as HTMLElement).style.width;
          return w ? parseInt(w, 10) || null : null;
        },
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
      align: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-align'),
        renderHTML: (attrs) => (attrs.align ? { 'data-align': attrs.align } : {}),
      },
      caption: {
        default: '',
        // Rendered via the node's figure/figcaption below, not as an img attribute.
        renderHTML: () => ({}),
        parseHTML: () => '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure.kontex-figure',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          const img = el.querySelector('img');
          if (!img) return false;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: parseWidth(img),
            align: img.getAttribute('data-align'),
            caption: el.querySelector('figcaption')?.textContent ?? '',
          };
        },
      },
      ...(this.parent?.() ?? []),
    ];
  },

  renderHTML({ HTMLAttributes, node }): DOMOutputSpec {
    const img: DOMOutputSpec = ['img', mergeAttributes(HTMLAttributes)];
    if (node.attrs.caption) {
      return ['figure', { class: 'kontex-figure' }, img, ['figcaption', {}, node.attrs.caption]];
    }
    return img;
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'kontex-img';
      applyAlign(wrapper, node.attrs.align);

      const img = document.createElement('img');
      img.src = node.attrs.src;
      if (node.attrs.alt) img.alt = node.attrs.alt;
      if (node.attrs.title) img.title = node.attrs.title;
      if (node.attrs.width) img.style.width = `${node.attrs.width}px`;
      wrapper.appendChild(img);

      const handle = document.createElement('span');
      handle.className = 'kontex-img__handle';
      handle.title = 'Drag to resize';
      wrapper.appendChild(handle);

      const caption = document.createElement('figcaption');
      caption.className = 'kontex-img__caption';
      caption.setAttribute('data-placeholder', 'Add a caption…');
      caption.contentEditable = String(editor.isEditable);
      caption.textContent = node.attrs.caption;
      wrapper.appendChild(caption);
      wrapper.classList.toggle('has-caption', !!node.attrs.caption);

      caption.addEventListener('blur', () => {
        const text = caption.textContent ?? '';
        if (typeof getPos !== 'function') return;
        const pos = getPos();
        if (pos == null) return;
        const current = editor.state.doc.nodeAt(pos);
        if (!current || current.attrs.caption === text) return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, caption: text }));
      });

      // --- resize ---
      let startX = 0;
      let startWidth = 0;
      const onMove = (e: MouseEvent) => {
        const next = Math.max(MIN_WIDTH, startWidth + (e.clientX - startX));
        img.style.width = `${Math.round(next)}px`;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const width = Math.round(img.getBoundingClientRect().width);
        if (typeof getPos === 'function') {
          const pos = getPos();
          if (pos != null) {
            editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, width }));
          }
        }
      };
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startWidth = img.getBoundingClientRect().width;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      return {
        dom: wrapper,
        // Let the caption be edited natively without ProseMirror grabbing events.
        stopEvent: (event) => caption.contains(event.target as Node),
        ignoreMutation: () => true,
        selectNode: () => wrapper.classList.add('kontex-img--selected'),
        deselectNode: () => wrapper.classList.remove('kontex-img--selected'),
        update: (updated) => {
          if (updated.type.name !== node.type.name) return false;
          if (updated.attrs.src !== img.getAttribute('src')) img.src = updated.attrs.src;
          if (updated.attrs.alt != null) img.alt = updated.attrs.alt;
          img.style.width = updated.attrs.width ? `${updated.attrs.width}px` : '';
          applyAlign(wrapper, updated.attrs.align);
          if (document.activeElement !== caption && caption.textContent !== updated.attrs.caption) {
            caption.textContent = updated.attrs.caption;
          }
          wrapper.classList.toggle('has-caption', !!updated.attrs.caption);
          return true;
        },
      };
    };
  },
});
