import type { Editor } from '@tiptap/core';

export interface LinkHover {
  destroy: () => void;
}

/** Resolve the document position just inside a link's <a> element. */
function posInsideLink(editor: Editor, a: HTMLElement): number | null {
  try {
    return editor.view.posAtDOM(a, 0) + 1;
  } catch {
    return null;
  }
}

/**
 * A Google-Docs-style bubble shown when hovering a link: open it, edit the URL
 * inline, or unlink. Appended to <body> and positioned above the hovered link.
 */
export function createLinkHover(editor: Editor): LinkHover {
  const bubble = document.createElement('div');
  bubble.className = 'kontex-linkbubble';
  bubble.style.display = 'none';
  document.body.appendChild(bubble);

  let currentLink: HTMLAnchorElement | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let editing = false;

  const cancelHide = () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } };
  const scheduleHide = () => { cancelHide(); hideTimer = setTimeout(hide, 200); };

  function hide(): void {
    if (editing) return;
    bubble.style.display = 'none';
    currentLink = null;
  }

  function position(a: HTMLElement): void {
    const rect = a.getBoundingClientRect();
    bubble.style.display = 'flex';
    const b = bubble.getBoundingClientRect();
    let top = rect.top - b.height - 6;
    if (top < 6) top = rect.bottom + 6;
    const left = Math.max(6, Math.min(rect.left, window.innerWidth - b.width - 6));
    bubble.style.top = `${Math.round(top)}px`;
    bubble.style.left = `${Math.round(left)}px`;
  }

  function applyHref(a: HTMLAnchorElement, href: string): void {
    const pos = posInsideLink(editor, a);
    if (pos == null) return;
    editor.chain().focus().setTextSelection(pos).extendMarkRange('link').setLink({ href }).run();
  }

  function unlink(a: HTMLAnchorElement): void {
    const pos = posInsideLink(editor, a);
    if (pos == null) return;
    editor.chain().focus().setTextSelection(pos).extendMarkRange('link').unsetLink().run();
  }

  function renderView(a: HTMLAnchorElement): void {
    editing = false;
    bubble.innerHTML = '';
    const href = a.getAttribute('href') ?? '';

    const open = document.createElement('a');
    open.className = 'kontex-linkbubble__url';
    open.href = href;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = href.length > 40 ? `${href.slice(0, 40)}…` : href;
    open.title = href;
    bubble.appendChild(open);

    if (editor.isEditable) {
      bubble.appendChild(action('Edit', () => renderEdit(a)));
      bubble.appendChild(action('Unlink', () => { unlink(a); hide(); }));
    }
  }

  function renderEdit(a: HTMLAnchorElement): void {
    editing = true;
    bubble.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'kontex-linkbubble__input';
    input.value = a.getAttribute('href') ?? '';
    const save = () => {
      const href = input.value.trim();
      editing = false;
      if (href) applyHref(a, href);
      hide();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { editing = false; hide(); }
    });
    bubble.appendChild(input);
    bubble.appendChild(action('Save', save));
    setTimeout(() => { input.focus(); input.select(); });
  }

  function action(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kontex-linkbubble__btn';
    b.textContent = label;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', onClick);
    return b;
  }

  const onOver = (event: MouseEvent) => {
    const a = (event.target as HTMLElement)?.closest('a') as HTMLAnchorElement | null;
    if (!a || !editor.view.dom.contains(a)) return;
    cancelHide();
    if (a === currentLink && bubble.style.display !== 'none') return;
    currentLink = a;
    renderView(a);
    position(a);
  };
  const onOut = (event: MouseEvent) => {
    const to = event.relatedTarget as Node | null;
    if (to && (bubble.contains(to) || currentLink?.contains(to))) return;
    scheduleHide();
  };

  editor.view.dom.addEventListener('mouseover', onOver);
  editor.view.dom.addEventListener('mouseout', onOut);
  bubble.addEventListener('mouseenter', cancelHide);
  bubble.addEventListener('mouseleave', scheduleHide);

  return {
    destroy: () => {
      editor.view.dom.removeEventListener('mouseover', onOver);
      editor.view.dom.removeEventListener('mouseout', onOut);
      cancelHide();
      bubble.remove();
    },
  };
}
