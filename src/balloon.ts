import type { Editor } from '@tiptap/core';
import { icon } from './icons';

export interface Balloon {
  update: () => void;
  destroy: () => void;
}

interface BtnDef {
  label: string;
  title: string;
  run: (editor: Editor) => void;
}

const TABLE_BUTTONS: BtnDef[] = [
  { label: '+Col ◂', title: 'Insert column left', run: (e) => e.chain().focus().addColumnBefore().run() },
  { label: '+Col ▸', title: 'Insert column right', run: (e) => e.chain().focus().addColumnAfter().run() },
  { label: '✕Col', title: 'Delete column', run: (e) => e.chain().focus().deleteColumn().run() },
  { label: '+Row ▴', title: 'Insert row above', run: (e) => e.chain().focus().addRowBefore().run() },
  { label: '+Row ▾', title: 'Insert row below', run: (e) => e.chain().focus().addRowAfter().run() },
  { label: '✕Row', title: 'Delete row', run: (e) => e.chain().focus().deleteRow().run() },
  { label: 'Merge', title: 'Merge cells', run: (e) => e.chain().focus().mergeCells().run() },
  { label: 'Split', title: 'Split cell', run: (e) => e.chain().focus().splitCell().run() },
  { label: 'Header', title: 'Toggle header row', run: (e) => e.chain().focus().toggleHeaderRow().run() },
  { label: '✕ Table', title: 'Delete table', run: (e) => e.chain().focus().deleteTable().run() },
];

const IMAGE_BUTTONS: BtnDef[] = [
  { label: icon('alignLeft'), title: 'Align left', run: (e) => e.chain().focus().updateAttributes('image', { align: 'left' }).run() },
  { label: icon('alignCenter'), title: 'Align center', run: (e) => e.chain().focus().updateAttributes('image', { align: 'center' }).run() },
  { label: icon('alignRight'), title: 'Align right', run: (e) => e.chain().focus().updateAttributes('image', { align: 'right' }).run() },
  { label: 'Caption', title: 'Add / edit caption', run: focusCaption },
  { label: 'Alt', title: 'Edit alt text', run: editAlt },
  { label: icon('close'), title: 'Delete image', run: (e) => e.chain().focus().deleteSelection().run() },
];

function focusCaption(editor: Editor): void {
  const dom = editor.view.nodeDOM(editor.state.selection.from) as HTMLElement | null;
  const cap = dom?.querySelector?.('.kontex-img__caption') as HTMLElement | null;
  if (cap) {
    cap.focus();
    const range = document.createRange();
    range.selectNodeContents(cap);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}

function editAlt(editor: Editor): void {
  const current = (editor.getAttributes('image').alt as string) ?? '';
  const alt = window.prompt('Alt text (description)', current);
  if (alt !== null) editor.chain().focus().updateAttributes('image', { alt }).run();
}

function makeGroup(editor: Editor, defs: BtnDef[]): HTMLElement {
  const group = document.createElement('div');
  group.className = 'kontex-balloon__group';
  for (const def of defs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kontex-balloon__btn';
    b.innerHTML = def.label;
    b.setAttribute('data-tooltip', def.title);
    b.setAttribute('aria-label', def.title);
    b.addEventListener('mousedown', (ev) => ev.preventDefault()); // keep editor selection
    b.addEventListener('click', () => def.run(editor));
    group.appendChild(b);
  }
  return group;
}

/** Floating context toolbar: table controls when inside a table, image controls when one is selected. */
export function createBalloon(editor: Editor): Balloon {
  const root = document.createElement('div');
  root.className = 'kontex-balloon';
  root.style.display = 'none';

  const tableGroup = makeGroup(editor, TABLE_BUTTONS);
  const imageGroup = makeGroup(editor, IMAGE_BUTTONS);
  root.append(tableGroup, imageGroup);
  document.body.appendChild(root);

  const hide = () => { root.style.display = 'none'; };

  const update = () => {
    if (!editor.isEditable) return hide();
    const { state, view } = editor;
    const sel = state.selection;

    let mode: 'image' | 'table' | null = null;
    let rect: DOMRect | undefined;

    if (editor.isActive('image')) {
      mode = 'image';
      const dom = view.nodeDOM(sel.from) as HTMLElement | null;
      rect = dom?.getBoundingClientRect();
    } else if (editor.isActive('table')) {
      mode = 'table';
      const node = view.domAtPos(sel.from).node as Node;
      const elNode = (node.nodeType === 1 ? node : node.parentElement) as HTMLElement | null;
      const tableEl = elNode?.closest('.tableWrapper') ?? elNode?.closest('table');
      rect = tableEl?.getBoundingClientRect();
    }

    if (!mode || !rect) return hide();

    tableGroup.style.display = mode === 'table' ? 'flex' : 'none';
    imageGroup.style.display = mode === 'image' ? 'flex' : 'none';

    root.style.display = 'flex';
    const b = root.getBoundingClientRect();
    let top = rect.top - b.height - 8;
    if (top < 8) top = rect.bottom + 8;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - b.width - 8));
    root.style.top = `${Math.round(top)}px`;
    root.style.left = `${Math.round(left)}px`;
  };

  return {
    update,
    destroy: () => root.remove(),
  };
}
