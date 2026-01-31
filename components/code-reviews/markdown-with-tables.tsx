import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Small parser to split markdown into plain md segments and table blocks
function splitMarkdownTables(md: string) {
  const lines = md.split(/\r?\n/);
  const segments: Array<{ type: 'md'; text: string } | { type: 'table'; header: string[]; rows: string[][] }> = [];
  let buffer: string[] = [];
  let i = 0;

  function flushBuffer() {
    if (buffer.length > 0) {
      segments.push({ type: 'md', text: buffer.join('\n') });
      buffer = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1] ?? '';
    const isTableHeader = line.includes('|') && /^(\s*\|?\s*[:-]+[-:\s|]*$)/.test(next);

    if (isTableHeader) {
      flushBuffer();
      const headerCells = line.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        let cells = lines[i].split('|').map((c) => c.trim());
        if (cells.length > 0 && cells[0] === '') cells = cells.slice(1);
        if (cells.length > 0 && cells[cells.length - 1] === '') cells = cells.slice(0, -1);
        rows.push(cells);
        i++;
      }
      segments.push({ type: 'table', header: headerCells, rows });
    } else {
      buffer.push(line);
      i++;
    }
  }

  flushBuffer();
  return segments;
}

export default function MarkdownWithTables({ md }: { md?: string | null }) {
  const text = md ?? '';
  const segments = splitMarkdownTables(text);

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === 'md') {
          return (
            <ReactMarkdown key={`md-${idx}`} remarkPlugins={[remarkGfm]}>
              {seg.text}
            </ReactMarkdown>
          );
        }

        // Render table with borders and responsive wrapper.
        const colCount = seg.header.length || 1;
        const colWidth = `${Math.floor(100 / colCount)}%`;

        return (
          <div key={`table-${idx}`} className="overflow-auto my-2">
            <table className="min-w-full table-fixed border border-slate-200 text-sm">
              <colgroup>
                {Array.from({ length: colCount }).map((_, i) => (
                  <col key={i} style={{ width: colWidth }} />
                ))}
              </colgroup>
              <thead className="bg-muted/10">
                <tr>
                  {seg.header.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold border-b border-slate-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seg.rows.map((r, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-muted/5'}>
                    {seg.header.map((_, ci) => (
                      <td key={ci} className="px-3 py-2 align-top border-b border-slate-100">
                        {r[ci] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
