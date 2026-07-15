import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD, exportToExcel, exportToCSV } from '@/lib/export';

export function Reports() {
  const [reportType, setReportType] = useState('income');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const incomes = useLiveQuery(() => db.incomes.filter(i => !i.isDeleted && i.date >= startDate && i.date <= endDate).reverse().sortBy('date'), [startDate, endDate]);
  const expenses = useLiveQuery(() => db.expenses.filter(e => !e.isDeleted && e.date >= startDate && e.date <= endDate).reverse().sortBy('date'), [startDate, endDate]);
  const donations = useLiveQuery(() => db.donations.filter(d => !d.isDeleted && d.date >= startDate && d.date <= endDate).reverse().sortBy('date'), [startDate, endDate]);

  const handleExportCSV = () => {
    let data: any[] = [];
    if (reportType === 'income') data = incomes || [];
    else if (reportType === 'expense') data = expenses || [];
    else if (reportType === 'donation') data = donations || [];
    
    if (data.length > 0) {
      exportToCSV(data, `${reportType}_report_${startDate}_to_${endDate}`);
    }
  };

  const handleExportExcel = () => {
    let data: any[] = [];
    if (reportType === 'income') data = incomes || [];
    else if (reportType === 'expense') data = expenses || [];
    else if (reportType === 'donation') data = donations || [];
    
    if (data.length > 0) {
      exportToExcel(data, `${reportType}_report_${startDate}_to_${endDate}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground mt-1">Generate and export financial reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <FileText className="size-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 text-emerald-600 hover:text-emerald-700">
            <FileSpreadsheet className="size-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
            <div className="space-y-1">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income Report</SelectItem>
                  <SelectItem value="expense">Expense Report</SelectItem>
                  <SelectItem value="donation">Donation Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Code/Receipt</TableHead>
                <TableHead>Description/Source</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportType === 'income' && incomes?.map(i => (
                <TableRow key={i.id}>
                  <TableCell>{formatDateBD(i.date)}</TableCell>
                  <TableCell>{i.receiptNumber}</TableCell>
                  <TableCell>{i.source}</TableCell>
                  <TableCell className="capitalize">{i.category.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">{formatCurrencyBDT(i.amount)}</TableCell>
                </TableRow>
              ))}
              {reportType === 'expense' && expenses?.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{formatDateBD(e.date)}</TableCell>
                  <TableCell>{e.voucherNumber}</TableCell>
                  <TableCell>{e.payee}</TableCell>
                  <TableCell className="capitalize">{e.category.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right text-rose-600 font-medium">{formatCurrencyBDT(e.amount)}</TableCell>
                </TableRow>
              ))}
              {reportType === 'donation' && donations?.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{formatDateBD(d.date)}</TableCell>
                  <TableCell>{d.receiptNumber}</TableCell>
                  <TableCell>{d.donorName}</TableCell>
                  <TableCell>{d.purpose || '-'}</TableCell>
                  <TableCell className="text-right text-amber-600 font-medium">{formatCurrencyBDT(d.amount)}</TableCell>
                </TableRow>
              ))}
              
              {((reportType === 'income' && incomes?.length === 0) || 
                (reportType === 'expense' && expenses?.length === 0) || 
                (reportType === 'donation' && donations?.length === 0)) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Download className="size-8 opacity-20 mx-auto mb-2" />
                    No records found for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}