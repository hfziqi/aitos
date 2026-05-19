import { Atom, Context, Result } from '@aitos/core';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

  result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return result;
}

function processCodeBlocks(lines: string[]): { html: string[]; remaining: number[] } {
  const html: string[] = [];
  const skipIndices: number[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const codeBlockMatch = line.match(/^```(\w*)/);

    if (codeBlockMatch) {
      const lang = codeBlockMatch[1];
      const codeLines: string[] = [];
      let j = i + 1;

      while (j < lines.length && !lines[j].startsWith('```')) {
        codeLines.push(lines[j]);
        j++;
      }

      const code = codeLines.join('\n');
      const escapedCode = escapeHtml(code);
      const displayLang = lang || 'text';

      html.push(`<pre class="md-code-block"><div class="md-code-header">${displayLang}</div><code class="language-${lang}">${escapedCode}</code></pre>`);

      for (let k = i; k <= j && k < lines.length; k++) {
        skipIndices.push(k);
      }
      i = j + 1;
    } else {
      i++;
    }
  }

  return { html, remaining: skipIndices };
}

function processBlockQuote(line: string): string | null {
  const match = line.match(/^>\s?(.*)/);
  if (match) {
    return `<blockquote>${renderInline(match[1])}</blockquote>`;
  }
  return null;
}

function processHeading(line: string): string | null {
  const match = line.match(/^(#{1,6})\s+(.+)/);
  if (match) {
    const level = match[1].length;
    const content = renderInline(match[2]);
    return `<h${level}>${content}</h${level}>`;
  }
  return null;
}

function processUnorderedListItem(line: string): { content: string; indent: number } | null {
  const match = line.match(/^(\s*)[-*+]\s+(.+)/);
  if (match) {
    return { content: renderInline(match[2]), indent: match[1].length };
  }
  return null;
}

function processOrderedListItem(line: string): { content: string; indent: number } | null {
  const match = line.match(/^(\s*)\d+\.\s+(.+)/);
  if (match) {
    return { content: renderInline(match[2]), indent: match[1].length };
  }
  return null;
}

function processTable(lines: string[], startIndex: number): { html: string; endIndex: number } | null {
  if (startIndex >= lines.length) return null;

  // Check if this line looks like a table header: | ... | ... |
  const headerMatch = lines[startIndex].match(/^\|(.+)\|$/);
  if (!headerMatch) return null;

  // Next line must be a separator: | --- | --- |
  if (startIndex + 1 >= lines.length) return null;
  const sepLine = lines[startIndex + 1].trim();
  if (!/^\|[-:\s|]+\|$/.test(sepLine)) return null;

  // Parse header cells
  const headerCells = headerMatch[1].split('|').map(c => renderInline(c.trim()));

  // Parse body rows
  const bodyRows: string[][] = [];
  let i = startIndex + 2;
  while (i < lines.length) {
    const rowMatch = lines[i].match(/^\|(.+)\|$/);
    if (!rowMatch) break;

    const cells = rowMatch[1].split('|').map(c => renderInline(c.trim()));
    bodyRows.push(cells);
    i++;
  }

  // Build HTML table
  let html = '<table class="md-table">';
  html += '<thead><tr>';
  for (const cell of headerCells) {
    html += `<th>${cell}</th>`;
  }
  html += '</tr></thead>';
  html += '<tbody>';
  for (const row of bodyRows) {
    html += '<tr>';
    for (const cell of row) {
      html += `<td>${cell}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  return { html, endIndex: i };
}

function processHorizontalRule(line: string): boolean {
  return /^[-*_]{3,}\s*$/.test(line);
}

function processParagraph(lines: string[], startIndex: number): { html: string; endIndex: number } | null {
  if (startIndex >= lines.length) return null;

  const paragraphLines: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '' ||
        /^#{1,6}\s/.test(line) ||
        /^```/.test(line) ||
        /^>\s?/.test(line) ||
        /^[-*_]{3,}\s*$/.test(line) ||
        /^\s*[-*+]\s/.test(line) ||
        /^\s*\d+\.\s/.test(line)) {
      break;
    }

    paragraphLines.push(line);
    i++;
  }

  if (paragraphLines.length === 0) return null;

  const content = paragraphLines
    .map(line => line.trim() === '' ? '<br>' : renderInline(line))
    .join(' ');

  return { html: `<p>${content}</p>`, endIndex: i };
}

export const markdownToHtmlAtom: Atom = {
  name: 'markdownToHtml',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'Markdown text to convert to HTML' }
    ],
    output: { type: 'string', description: 'HTML string' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string }, context: Context): Promise<Result> => {
    if (typeof input.text !== 'string') {
      return { success: true, data: '' };
    }

    const lines = input.text.split('\n');
    const htmlParts: string[] = [];
    const { html: codeBlocks, remaining: skipIndices } = processCodeBlocks(lines);
    const codeBlockSet = new Set(skipIndices);

    let codeBlockIndex = 0;
    let i = 0;

    while (i < lines.length) {
      if (codeBlockSet.has(i)) {
        if (lines[i].startsWith('```')) {
          htmlParts.push(codeBlocks[codeBlockIndex]);
          codeBlockIndex++;
          while (i < lines.length && codeBlockSet.has(i)) {
            i++;
          }
        } else {
          i++;
        }
        continue;
      }

      const line = lines[i];

      if (line.trim() === '') {
        i++;
        continue;
      }

      if (processHorizontalRule(line)) {
        htmlParts.push('<hr>');
        i++;
        continue;
      }

      const heading = processHeading(line);
      if (heading) {
        htmlParts.push(heading);
        i++;
        continue;
      }

      const blockquote = processBlockQuote(line);
      if (blockquote) {
        htmlParts.push(blockquote);
        i++;
        continue;
      }

      const ulItem = processUnorderedListItem(line);
      if (ulItem) {
        htmlParts.push('<ul>');
        htmlParts.push(`<li>${ulItem.content}</li>`);
        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          if (nextLine.trim() === '' || /^```/.test(nextLine)) break;
          const nextUl = processUnorderedListItem(nextLine);
          const nextOl = processOrderedListItem(nextLine);
          if (nextUl) {
            htmlParts.push(`<li>${nextUl.content}</li>`);
            i++;
          } else if (nextOl) {
            htmlParts.push(`<li>${nextOl.content}</li>`);
            i++;
          } else {
            break;
          }
        }
        htmlParts.push('</ul>');
        continue;
      }

      const olItem = processOrderedListItem(line);
      if (olItem) {
        htmlParts.push('<ol>');
        htmlParts.push(`<li>${olItem.content}</li>`);
        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          if (nextLine.trim() === '' || /^```/.test(nextLine)) break;
          const nextUl = processUnorderedListItem(nextLine);
          const nextOl = processOrderedListItem(nextLine);
          if (nextOl) {
            htmlParts.push(`<li>${nextOl.content}</li>`);
            i++;
          } else if (nextUl) {
            htmlParts.push(`<li>${nextUl.content}</li>`);
            i++;
          } else {
            break;
          }
        }
        htmlParts.push('</ol>');
        continue;
      }

      const table = processTable(lines, i);
      if (table) {
        htmlParts.push(table.html);
        i = table.endIndex;
        continue;
      }

      const paragraph = processParagraph(lines, i);
      if (paragraph) {
        htmlParts.push(paragraph.html);
        i = paragraph.endIndex;
        continue;
      }

      htmlParts.push(`<p>${renderInline(line)}</p>`);
      i++;
    }

    return { success: true, data: htmlParts.join('\n') };
  },
};