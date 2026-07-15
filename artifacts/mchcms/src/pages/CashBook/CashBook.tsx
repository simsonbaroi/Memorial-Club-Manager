import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, FileText, Printer, X } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD, exportToExcel, exportToCSV, exportToPDF, printPDF } from '@/lib/export';

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();

const QUICK_RANGES = [
  { label: 'This Month', start: new Date(y, m, 1).toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) },
  { label: 'Last Month', start: new Date(y, m - 1, 1).toISOString().slice(0, 10), end: new Date(y, m, 0).toISOString().slice(0, 10) },
  { label: 'This Year', start: new Date(y, 0, 1).toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) },
];

interface CashEntry {
  date: string;
  code: string;
  description: string;
  type: string;
  category: string;
  person: string;
  notes: string;
  income: number;
  expense: number;
  balance: number;
}

export function CashBook() {
  const [startDate, setStartDate] = useState(new Date(y, m, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const incomes = useLiveQuery(() => db.incomes.filter(i => !i.isDeleted && i.date >= startDate && i.date <= endDate && i.status !== 'rejected').toArray(), [startDate, endDate]);
  const expenses = useLiveQuery(() => db.expenses.filter(e => !e.isDeleted && e.date >= startDate && e.date <= endDate && e.status !== 'rejected').toArray(), [startDate, endDate]);
  const donations = useLiveQuery(() => db.donations.filter(d => !d.isDeleted && d.date >= startDate && d.date <= endDate && d.status !== 'rejected').toArray(), [startDate, endDate]);
  const advances = useLiveQuery(() => db.advances.filter(a => !a.isDeleted && a.date >= startDate && a.date <= endDate && a.status !== 'draft' && a.status !== 'cancelled').toArray(), [startDate, endDate]);

  // Opening balance: all transactions before startDate
  const allIncomeBefore = useLiveQuery(() => db.incomes.filter(i => !i.isDeleted && i.date < startDate && i.status !== 'rejected').toArray(), [startDate]);
  const allExpenseBefore = useLiveQuery(() => db.expenses.filter(e => !e.isDeleted && e.date < startDate && e.status !== 'rejected').toArray(), [startDate]);

  const openingBalance = (allIncomeBefore?.reduce((s, i) => s + i.amount, 0) ?? 0)
    - (allExpenseBefore?.reduce((s, e) => s + e.amount, 0) ?? 0);

  const allRows: Omit<CashEntry, 'balance'>[] = [
    ...(incomes?.map(i => ({ date: i.date, code: i.receiptNumber || i.incomeCode, description: i.description, type: 'Income', category: i.category, person: i.source, notes: i.remarks ?? '', income: i.amount, expense: 0 })) ?? []),
    ...(donations?.map(d => ({ date: d.date, code: d.receiptNumber || d.donationCode, description: `Donation - ${d.donorName}`, type: 'Donation', category: 'donation', person: d.donorName, notes: d.notes ?? '', income: d.amount, expense: 0 })) ?? []),
    ...(expenses?.map(e => ({ date: e.date, code: e.voucherNumber || e.expenseCode, description: e.description, type: 'Expense', category: e.category, person: e.payee, notes: e.remarks ?? '', income: 0, expense: e.amount })) ?? []),
    ...(advances?.map(a => ({ date: a.date, code: a.advanceCode, description: `Advance - ${a.personName}: ${a.purpose}`, type: 'Advance', category: 'advance', person: a.personName, notes: a.notes ?? '', income: 0, expense: a.amountGiven })) ?? []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Running balance is computed over the full unfiltered set so it stays accurate,
  // then the ledger view is filtered for display/export.
  let runningBalance = openingBalance;
  const ledgerAll: CashEntry[] = allRows.map(r => {
    runningBalance += r.income - r.expense;
    return { ...r, balance: runningBalance };
  });

  const min = minAmount ? parseFloat(minAmount) : undefined;
  const max = maxAmount ? parseFloat(maxAmount) : undefined;
  const searchLower = search.trim().toLowerCase();

  const ledger = ledgerAll.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    const amount = r.income || r.expense;
    if (min !== undefined && amount < min) return false;
    if (max !== undefined && amount > max) return false;
    if (searchLower) {
      const haystack = `${r.code} ${r.description} ${r.person} ${r.notes} ${r.category}`.toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });

  const hasActiveFilters = typeFilter !== 'all' || !!search || !!minAmount || !!maxAmount;
  const clearFilters = () => { setSearch(''); setTypeFilter('all'); setMinAmount(''); setMaxAmount(''); };

  const totalIncome = ledger.reduce((s, r) => s + r.income, 0);
  const totalExpense = ledger.reduce((s, r) => s + r.expense, 0);
  const closingBalance = ledger.length ? ledger[ledger.length - 1].balance : openingBalance;

  const buildExportRows = () => ledger.map(r => ({
    Date: r.date,
    'Ref/Code': r.code,
    Description: r.description,
    Type: r.type,
    Category: r.category,
    Person: r.person,
    'Income (৳)': r.income || '',
    'Expense (৳)': r.expense || '',
    'Balance (৳)': r.balance,
  }));

  const handleExport = (fmt: 'csv' | 'excel') => {
    const data = buildExportRows();
    const name = `cashbook_${startDate}_to_${endDate}`;
    fmt === 'csv' ? exportToCSV(data, name) : exportToExcel(data, name);
  };

  const pdfOpts = () => ({
    title: 'Cash Book',
    subtitle: `${formatDateBD(startDate)} — ${formatDateBD(endDate)}`,
    meta: [
      { label: 'Opening Balance', value: formatCurrencyBDT(openingBalance) },
      { label: 'Closing Balance', value: formatCurrencyBDT(closingBalance) },
    ],
    head: [['Date', 'Ref', 'Description', 'Type', 'Income', 'Expense', 'Balance']],
    body: ledger.map(r => [formatDateBD(r.date), r.code, r.description, r.type, r.income ? formatCurrencyBDT(r.income) : '', r.expense ? formatCurrencyBDT(r.expense) : '', formatCurrencyBDT(r.balance)]),
    filename: `cashbook_${startDate}_to_${endDate}`,
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cash Book</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToPDF(pdfOpts())} className="gap-1.5">
            <FileText className="size-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-1.5">
            <FileText className="size-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-1.5 text-emerald-600">
            <FileSpreadsheet className="size-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => printPDF(pdfOpts())} className="gap-1.5">
            <Printer className="size-3.5" /> Print
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="p-3 border-b space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_RANGES.map(r => (
              <Button key={r.label} variant={startDate === r.start && endDate === r.end ? 'default' : 'outline'} size="sm" className="h-7 text-xs"
                onClick={() => { setStartDate(r.start); setEndDate(r.end); }}>
                {r.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Donation">Donation</SelectItem>
                  <SelectItem value="Advance">Advance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min Amount</Label>
              <Input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="0" className="h-8 text-sm w-28" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Amount</Label>
              <Input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="Any" className="h-8 text-sm w-28" />
            </div>
            <div className="space-y-1 flex-1 min-w-[180px]">
              <Label className="text-xs">Search (person, voucher, receipt, notes)</Label>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. John, VCH-0012, football" className="h-8 text-sm" />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={clearFilters}>
                <X className="size-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right text-emerald-700">Income</TableHead>
                <TableHead className="text-right text-rose-700">Expense</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Opening balance row */}
              <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                <TableCell className="text-sm font-medium" colSpan={4}>Opening Balance ({formatDateBD(startDate)})</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right text-sm font-semibold text-primary">{formatCurrencyBDT(openingBalance)}</TableCell>
              </TableRow>

              {ledger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No transactions in this period</TableCell>
                </TableRow>
              ) : ledger.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{formatDateBD(r.date)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={r.description}>{r.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-emerald-600">{r.income > 0 ? formatCurrencyBDT(r.income) : ''}</TableCell>
                  <TableCell className="text-right text-sm text-rose-600">{r.expense > 0 ? formatCurrencyBDT(r.expense) : ''}</TableCell>
                  <TableCell className={`text-right text-sm font-medium ${r.balance >= 0 ? 'text-foreground' : 'text-rose-600'}`}>{formatCurrencyBDT(r.balance)}</TableCell>
                </TableRow>
              ))}

              {/* Totals */}
              {ledger.length > 0 && (
                <TableRow className="bg-muted/40 font-semibold border-t-2">
                  <TableCell colSpan={4} className="text-sm text-right pr-4">Totals ({ledger.length} entries)</TableCell>
                  <TableCell className="text-right text-sm text-emerald-700">{formatCurrencyBDT(totalIncome)}</TableCell>
                  <TableCell className="text-right text-sm text-rose-700">{formatCurrencyBDT(totalExpense)}</TableCell>
                  <TableCell className="text-right text-sm text-primary">{formatCurrencyBDT(closingBalance)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
