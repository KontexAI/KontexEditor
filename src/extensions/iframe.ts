import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      setIframe: (options: { src: string }) => ReturnType;
    };
  }
}

/** Convert common share URLs into embeddable player URLs (YouTube, Vimeo). */
export function normalizeEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

/** Block-level responsive iframe embed (video / map / generic embeddable URL). */
export const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      frameborder: { default: '0' },
      allowfullscreen: { default: 'true' },
    };
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'kontex-embed' },
      ['iframe', mergeAttributes(HTMLAttributes, { allow: 'fullscreen', loading: 'lazy' })],
    ];
  },

  addCommands() {
    return {
      setIframe:
        (options) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { src: normalizeEmbedUrl(options.src) } }),
    };
  },
});
