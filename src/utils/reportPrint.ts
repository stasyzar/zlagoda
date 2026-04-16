type ReportColumn<T> = {
  header: string;
  getValue: (row: T) => string | number | boolean | null | undefined;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function openReportPreview<T>(
  title: string,
  columns: ReportColumn<T>[],
  rows: T[],
  filters?: string,
): boolean {
  const generatedAt = new Date().toLocaleString('uk-UA');
  const filtersBlock = filters?.trim() ? `<p><strong>Фільтри:</strong> ${escapeHtml(filters)}</p>` : '';

  const headerHtml = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const bodyHtml = rows.map((row) => {
    const cells = columns
      .map((c) => {
        const raw = c.getValue(row);
        const value = raw === null || raw === undefined || raw === '' ? '—' : String(raw);
        return `<td>${escapeHtml(value)}</td>`;
      })
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const reportHtml = `
    <!doctype html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          .report-header { margin-bottom: 16px; }
          .report-footer { margin-top: 16px; font-size: 12px; color: #555; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; word-wrap: break-word; }
          th { background: #f3f3f3; }
          .actions { margin-top: 16px; display: flex; gap: 8px; }
          @media print {
            .actions { display: none; }
            body { margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <header class="report-header">
          <h1>${escapeHtml(title)}</h1>
          <p><strong>Згенеровано:</strong> ${escapeHtml(generatedAt)}</p>
          ${filtersBlock}
          <p><strong>Кількість записів:</strong> ${rows.length}</p>
        </header>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
        <footer class="report-footer">
          <p>Звіт АІС "ZLAGODA"</p>
        </footer>
        <div class="actions">
          <button onclick="window.print()">Друк</button>
          <button onclick="window.close()">Закрити</button>
        </div>
      </body>
    </html>
  `;

  const reportWindow = window.open('about:blank', '_blank');
  if (reportWindow) {
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    return true;
  }

  // Fallback for strict popup blockers: open in current tab.
  try {
    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    return false;
  }
}
