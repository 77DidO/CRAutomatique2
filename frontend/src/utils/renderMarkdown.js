const LIST_ITEM_REGEX = /^(\s*)([-*+] |\d+\. )(.*)$/;

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text = '') {
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/\[(.+?)\]\((.+?)\)/g, (_, label, href) => {
    const safeHref = escapeHtml(href.trim());
    const safeLabel = escapeHtml(label.trim());
    if (!safeHref) {
      return safeLabel;
    }
    return `<a href="${safeHref}" target="_blank" rel="noreferrer">${safeLabel}</a>`;
  });
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/__(.+?)__/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(^|[^*])\*(?!\s)(.+?)(?!\s)\*(?!\*)/g, '$1<em>$2</em>');
  escaped = escaped.replace(/(^|[^_])_(?!\s)(.+?)(?!\s)_(?!_)/g, '$1<em>$2</em>');
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  return escaped;
}

export function renderMarkdown(markdown = '') {
  if (!markdown || !markdown.trim()) {
    return '';
  }

  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let paragraphBuffer = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let listType = null;
  let listDepth = 0;

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      const text = paragraphBuffer.join(' ').trim();
      if (text) {
        html.push(`<p>${renderInline(text)}</p>`);
      }
      paragraphBuffer = [];
    }
  };

  const closeList = () => {
    while (listDepth > 0) {
      const tagName = listType === 'ol' ? 'ol' : 'ul';
      html.push(`</${tagName}>`);
      listDepth -= 1;
    }
    listType = null;
  };

  const flushCode = () => {
    if (inCodeBlock) {
      html.push(`<pre><code>${codeBuffer.join('\n')}</code></pre>`);
      inCodeBlock = false;
      codeBuffer = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine;
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushParagraph();
        closeList();
        inCodeBlock = true;
        codeBuffer = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(escapeHtml(line));
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = Math.min(6, headingMatch[1].length);
      html.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
      return;
    }

    const listMatch = line.match(LIST_ITEM_REGEX);
    if (listMatch) {
      const isOrdered = /\d+\. /.test(listMatch[2]);
      const desiredListType = isOrdered ? 'ol' : 'ul';
      if (listType !== desiredListType) {
        closeList();
        listType = desiredListType;
        listDepth = 0;
      }
      if (listDepth === 0) {
        html.push(`<${listType}>`);
      }
      listDepth = 1;
      flushParagraph();
      const content = listMatch[3];
      html.push(`<li>${renderInline(content.trim())}</li>`);
      return;
    }

    paragraphBuffer.push(line.trim());
  });

  flushParagraph();
  closeList();
  flushCode();

  return html.join('\n').trim();
}
