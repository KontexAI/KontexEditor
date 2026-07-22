// Strip the markup bloat that Word / Office / Google Docs inject when pasting,
// keeping the meaningful structure (headings, lists, tables, bold/italic, links).
// Used via TipTap's editorProps.transformPastedHTML.

function isOfficeHtml(html: string): boolean {
  return /<\w+:|class="?Mso|mso-|urn:schemas-microsoft-com|<o:p|docs-internal-guid/i.test(html);
}

export function cleanPastedHTML(html: string): string {
  if (!isOfficeHtml(html)) return html;

  let out = html;

  // Drop Word's conditional comments and their contents, then any comments.
  out = out.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
  out = out.replace(/<!--[\s\S]*?-->/g, '');

  // Remove whole <style>, <xml>, <o:p>, <w:...> and meta/link blocks.
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<xml[\s\S]*?<\/xml>/gi, '');
  out = out.replace(/<\/?o:p[^>]*>/gi, '');
  out = out.replace(/<\/?(?:w|o|m|v|x):[^>]*>/gi, '');
  out = out.replace(/<\/?(?:meta|link|head|html|body)[^>]*>/gi, '');

  // Parse what's left and scrub attributes the DOM way.
  const doc = new DOMParser().parseFromString(out, 'text/html');
  scrubElement(doc.body);
  return doc.body.innerHTML.trim();
}

const KEEP_ATTRS = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan']);

function scrubElement(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const toUnwrap: HTMLElement[] = [];

  let node = walker.nextNode() as HTMLElement | null;
  while (node) {
    // Remove Office-only classes and mso- styles; keep a minimal style whitelist.
    node.removeAttribute('class');
    node.removeAttribute('lang');

    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (KEEP_ATTRS.has(name)) continue;
      if (name === 'style') {
        const cleaned = filterStyle(attr.value);
        if (cleaned) node.setAttribute('style', cleaned);
        else node.removeAttribute('style');
        continue;
      }
      node.removeAttribute(attr.name);
    }

    // Mark Word's empty <span>/<font> wrappers for unwrapping.
    const tag = node.tagName.toLowerCase();
    if ((tag === 'span' || tag === 'font') && !node.getAttribute('style')) {
      toUnwrap.push(node);
    }

    node = walker.nextNode() as HTMLElement | null;
  }

  for (const el of toUnwrap) {
    while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
    el.remove();
  }
}

// Keep only genuinely useful inline styles; drop mso- and layout cruft.
const STYLE_WHITELIST = /^(text-align|font-weight|font-style|text-decoration|color|background-color)$/;

function filterStyle(value: string): string {
  return value
    .split(';')
    .map((d) => d.trim())
    .filter((d) => {
      const prop = d.split(':')[0]?.trim().toLowerCase();
      return prop && STYLE_WHITELIST.test(prop) && !d.toLowerCase().includes('mso');
    })
    .join('; ');
}
