import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const v = row[h];
        const str = v == null ? '' : String(v);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export interface PDFTableOptions {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  head: string[][];
  body: (string | number)[][];
  filename: string;
  footer?: string;
}

function buildPDF(opts: PDFTableOptions): jsPDF {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setTextColor(21, 101, 192);
  doc.text(opts.title, 14, 18);

  let cursorY = 26;
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(opts.subtitle, 14, cursorY);
    cursorY += 7;
  }

  if (opts.meta?.length) {
    doc.setFontSize(9);
    doc.setTextColor(60);
    opts.meta.forEach((m) => {
      doc.text(`${m.label}: ${m.value}`, 14, cursorY);
      cursorY += 5;
    });
    cursorY += 3;
  }

  autoTable(doc, {
    startY: cursorY,
    head: opts.head,
    body: opts.body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [21, 101, 192], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    doc.text(opts.footer ?? `Generated ${nowBD()} · MCHCMS`, 14, pageHeight - 8);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - 30, pageHeight - 8);
  }

  return doc;
}

export function exportToPDF(opts: PDFTableOptions) {
  buildPDF(opts).save(`${opts.filename}.pdf`);
}

export function printPDF(opts: PDFTableOptions) {
  const doc = buildPDF(opts);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

export function formatCurrencyBDT(amount: number): string {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount);
}

export function formatDateBD(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Asia/Dhaka',
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

export function formatDateTimeBD(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Dhaka', hour12: true,
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

export function nowBD(): string {
  return new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Dhaka', hour12: true,
  });
}

export function toISODate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function toISODateTime(date: Date = new Date()): string {
  return date.toISOString();
}
