import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD, exportToExcel, exportToCSV } from '@/lib/export';

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();

const QUICK_RANGES = [
  { label: 'Today', start: today.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) },
  { label: 'This Month', start: new Date(y, m, 1).toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) },
  { label: 'Last Month', start: new Date(y, m - 1, 1).toISOString().slice(0, 10), end: new Date(y, m, 0).toISOString().slice(0, 10) },
  { label: 'This Year', start: new Date(y, 0, 1).toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) },
];

export function Reports() {
  const [reportType, setReportType] = useState('income');
  const [startDate, setStartDate] = useState(new Date(y, m, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));

  const incomes = useLiveQuery(
    () => db.incomes.filter(i => !i.isDeleted && i.date >= startDate && i.date <= endDate).reverse().sortBy('date'),
    [startDate, endDate]
  );
  const expenses = useLiveQuery(
    () => db.expenses.filter(e => !e.isDeleted && e.date >= startDate && e.date <= endDate).reverse().sortBy('date'),
    [startDate, endDate]
  );
  const donations = useLiveQuery(
    () => db.donations.filter(d => !d.isDeleted && d.date >= startDate && d.date <= endDate).reverse().sortBy('date'),
    [startDate, endDate]
  );

  const rows = reportType === 'income' ? incomes : reportType === 'expense' ? expenses : donations;
  const total = rows?.reduce((sum, r) => sum + (r as { amount: number }).amount, 0) ?? 0;

  const handleExport = (format: 'csv' | 'excel') => {
    if (!rows?.length) return;
    const filename = `${reportType}_report_${startDate}_to_${endDate}`;
    format === 'csv' ? exportToCSV(rows as Record<string, unknown>[], filename) : exportToExcel(rows as Record<string, unknown>[], filename);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Reports</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-1.5">
            <FileText className="size-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-1.5 text-emerald-600">
            <FileSpreadsheet className="size-3.5" /> Excel
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="p-4 border-b space-y-3">
          {/* Quick date shortcuts */}
          <div className="flex flex-wrap gap-2">
            {QUICK_RANGES.map(r => (
              <Button
                key={r.label}
                variant={startDate === r.start && endDate === r.end ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setStartDate(r.start); setEndDate(r.end); }}
              >
                {r.label}
              </Button>
            ))}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-sm w-36" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>{reportType === 'expense' ? 'Voucher No.' : 'Receipt No.'}</TableHead>
                <TableHead>{reportType === 'donation' ? 'Donor' : reportType === 'expense' ? 'Payee' : 'Source'}</TableHead>
                <TableHead>Category / Purpose</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportType === 'income' && incomes?.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm">{formatDateBD(i.date)}</TableCell>
                  <TableCell className="text-sm font-mono">{i.receiptNumber}</TableCell>
                  <TableCell className="text-sm">{i.source}</TableCell>
                  <TableCell className="text-sm capitalize">{i.category.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-emerald-600">{formatCurrencyBDT(i.amount)}</TableCell>
                </TableRow>
              ))}
              {reportType === 'expense' && expenses?.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{formatDateBD(e.date)}</TableCell>
                  <TableCell className="text-sm font-mono">{e.voucherNumber}</TableCell>
                  <TableCell className="text-sm">{e.payee}</TableCell>
                  <TableCell className="text-sm capitalize">{e.category.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-rose-600">{formatCurrencyBDT(e.amount)}</TableCell>
                </TableRow>
              ))}
              {reportType === 'donation' && donations?.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">{formatDateBD(d.date)}</TableCell>
                  <TableCell className="text-sm font-mono">{d.receiptNumber}</TableCell>
                  <TableCell className="text-sm">{d.donorName}</TableCell>
                  <TableCell className="text-sm">{d.purpose || '—'}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-amber-600">{formatCurrencyBDT(d.amount)}</TableCell>
                </TableRow>
              ))}

              {/* Empty state */}
              {rows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                    No records for this period
                  </TableCell>
                </TableRow>
              )}

              {/* Totals row */}
              {(rows?.length ?? 0) > 0 && (
                <TableRow className="bg-muted/40 font-semibold border-t-2">
                  <TableCell colSpan={4} className="text-sm text-right pr-4">Total ({rows?.length} record{rows?.length !== 1 ? 's' : ''})</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrencyBDT(total)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
