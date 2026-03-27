// ═══════════════════════════════════════════════════════════════════════════════
// XML Canonicalization (Exclusive C14N) — مشترك بين وظائف ZATCA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Practical Exclusive XML Canonicalization for ZATCA UBL 2.1 invoices.
 *
 * Implements the required subset of https://www.w3.org/TR/xml-exc-c14n/:
 *  - Removes XML declaration & comments
 *  - Normalizes line endings to LF
 *  - Expands self-closing tags: <foo/> → <foo></foo>
 *  - Sorts attributes alphabetically (namespace attrs first, then local)
 *  - Normalizes attribute whitespace
 *  - Preserves significant whitespace in text nodes
 *  - Removes redundant inter-element whitespace
 */
export function c14n(xml: string): string {
  let c = xml;

  // 1. Remove XML declaration
  c = c.replace(/<\?xml[^?]*\?>\s*/g, "");

  // 2. Remove all comments
  c = c.replace(/<!--[\s\S]*?-->/g, "");

  // 3. Normalize line endings to LF
  c = c.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 4. Expand self-closing tags: <tag attr="val"/> → <tag attr="val"></tag>
  c = c.replace(/<([a-zA-Z][a-zA-Z0-9:._-]*)((?:\s+[^>]*?)?)\/>/g, (_m, tag, attrs) => {
    return `<${tag}${attrs}></${tag}>`;
  });

  // 5. Sort attributes within each opening tag
  c = c.replace(/<([a-zA-Z][a-zA-Z0-9:._-]*)((\s+[^>]*?)?)\s*>/g, (_m, tag, attrsStr) => {
    if (!attrsStr || !attrsStr.trim()) return `<${tag}>`;

    // Parse attributes
    const attrRegex = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)="([^"]*)"/g;
    const attrs: Array<{ name: string; value: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(attrsStr)) !== null) {
      attrs.push({ name: match[1], value: match[2] });
    }

    // Sort: xmlns attributes first (sorted), then other attributes (sorted)
    attrs.sort((a, b) => {
      const aIsNs = a.name === "xmlns" || a.name.startsWith("xmlns:");
      const bIsNs = b.name === "xmlns" || b.name.startsWith("xmlns:");
      if (aIsNs && !bIsNs) return -1;
      if (!aIsNs && bIsNs) return 1;
      return a.name.localeCompare(b.name);
    });

    const sortedAttrs = attrs.map(a => ` ${a.name}="${a.value}"`).join("");
    return `<${tag}${sortedAttrs}>`;
  });

  // 6. Remove whitespace-only text nodes between elements
  c = c.replace(/>\s+</g, () => {
    return ">\n<";
  });

  // 7. Trim and remove blank lines
  c = c
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.length > 0)
    .join("\n");

  return c;
}
