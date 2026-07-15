import { useRoute, Link } from 'wouter';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, FileSpreadsheet, Printer, Sheet as SheetIcon, Paperclip, History } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD, formatDateTimeBD, exportToExcel, exportToCSV, exportToPDF, printPDF } from '@/lib/export';

export function EventSummary() {
  const [, params] = useRoute('/events/:id/summary');
  const eventId = params?.id ? parseInt(params.id) : undefined;

  const event = useLiveQuery(() => eventId ? db.events.get(eventId) : undefined, [eventId]);
  const budgets = useLiveQuery(() => eventId ? db.budgets.where('eventId').equals(eventId).toArray() : [], [eventId]);
  const activeBudget = budgets?.[0];
  const budgetCategories = useLiveQuery(
    () => activeBudget?.id ? db.budgetCategories.where('budgetId').equals(activeBudget.id).toArray() : [],
    [activeBudget?.id]
  );

  const incomes = useLiveQuery(() => eventId ? db.incomes.where('eventId').equals(eventId).filter(i => !i.isDeleted).toArray() : [], [eventId]);
  const expenses = useLiveQuery(() => eventId ? db.expenses.where('eventId').equals(eventId).filter(e => !e.isDeleted).toArray() : [], [eventId]);
  const advances = useLiveQuery(() => eventId ? db.advances.where('eventId').equals(eventId).filter(a => !a.isDeleted).toArray() : [], [eventId]);
  const advanceIds = advances?.map(a => a.id!) ?? [];
  const settlements = useLiveQuery(
    () => advanceIds.length ? db.advanceSettlements.where('advanceId').anyOf(advanceIds).toArray() : [],
    [advanceIds.join(',')]
  );
  const attachments = useLiveQuery(() => eventId ? db.attachments.where({ recordType: 'event', recordId: eventId }).toArray() : [], [eventId]);
  const auditLogs = useLiveQuery(
    () => eventId ? db.auditLogs.where({ module: 'event', recordId: eventId }).reverse().sortBy('timestamp') : [],
    [eventId]
  );

  if (!event) return <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>;

  const totalEstimated = budgetCategories?.reduce((s, c) => s + c.estimatedAmount, 0) ?? 0;
  const totalBudgetActual = budgetCategories?.reduce((s, c) => s + c.actualAmount, 0) ?? 0;
  const totalIncome = incomes?.reduce((s, i) => s + i.amount, 0) ?? 0;
  const totalExpense = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const totalAdvancesGiven = advances?.reduce((s, a) => s + a.amountGiven, 0) ?? 0;
  const totalAdvancesOutstanding = advances?.reduce((s, a) => s + a.outstandingAmount, 0) ?? 0;
  const totalSettled = settlements?.reduce((s, s2) => s + s2.billsSubmitted + s2.cashReturned, 0) ?? 0;

  const netBalance = totalIncome - totalExpense;
  const remainingBudget = totalEstimated - totalBudgetActual;
  const profitLoss = totalIncome - totalExpense;

  const summaryUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : event.eventCode;

  const buildReportOpts = () => ({
    title: `Event Financial Summary — ${event.name}`,
    subtitle: `${event.eventCode} · ${formatDateBD(event.date)}${event.venue ? ' · ' + event.venue : ''}`,
    meta: [
      { label: 'Status', value: event.status },
      { label: 'Approved Budget', value: formatCurrencyBDT(event.budget) },
      { label: 'Total Income', value: formatCurrencyBDT(totalIncome) },
      { label: 'Total Expense', value: formatCurrencyBDT(totalExpense) },
      { label: 'Net Balance (Profit/Loss)', value: formatCurrencyBDT(profitLoss) },
      { label: 'Outstanding Advances', value: formatCurrencyBDT(totalAdvancesOutstanding) },
    ],
    head: [['Section', 'Reference', 'Description', 'Amount (৳)']],
    body: [
      ...(incomes ?? []).map(i => ['Income', i.incomeCode, i.description, formatCurrencyBDT(i.amount)]),
      ...(expenses ?? []).map(e => ['Expense', e.expenseCode, e.payee + ' — ' + e.description, formatCurrencyBDT(e.amount)]),
      ...(advances ?? []).map(a => ['Advance', a.advanceCode, `${a.personName} — ${a.purpose} (${a.status.replace(/_/g, ' ')})`, formatCurrencyBDT(a.amountGiven)]),
    ],
    filename: `event_summary_${event.eventCode}`,
  });

  const handleExportPDF = () => exportToPDF(buildReportOpts());
  const handlePrint = () => printPDF(buildReportOpts());
  const handleExportExcel = () => {
    const data = [
      ...(incomes ?? []).map(i => ({ Section: 'Income', Reference: i.incomeCode, Description: i.description, 'Amount (৳)': i.amount, Date: i.date })),
      ...(expenses ?? []).map(e => ({ Section: 'Expense', Reference: e.expenseCode, Description: `${e.payee} — ${e.description}`, 'Amount (৳)': e.amount, Date: e.date })),
      ...(advances ?? []).map(a => ({ Section: 'Advance', Reference: a.advanceCode, Description: `${a.personName} — ${a.purpose}`, 'Amount (৳)': a.amountGiven, Date: a.date })),
    ];
    exportToExcel(data, `event_summary_${event.eventCode}`, 'Summary');
  };
  const handleExportCSV = () => {
    const data = [
      ...(incomes ?? []).map(i => ({ Section: 'Income', Reference: i.incomeCode, Description: i.description, Amount: i.amount, Date: i.date })),
      ...(expenses ?? []).map(e => ({ Section: 'Expense', Reference: e.expenseCode, Description: `${e.payee} — ${e.description}`, Amount: e.amount, Date: e.date })),
      ...(advances ?? []).map(a => ({ Section: 'Advance', Reference: a.advanceCode, Description: `${a.personName} — ${a.purpose}`, Amount: a.amountGiven, Date: a.date })),
    ];
    exportToCSV(data, `event_summary_${event.eventCode}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href={`/events/${eventId}/budget`}><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{event.name}</h2>
          <p className="text-xs text-muted-foreground">Financial Summary · Auto-generated</p>
        </div>
        <div className="hidden sm:flex gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportPDF}>
            <FileText className="size-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-emerald-600" onClick={handleExportExcel}>
            <FileSpreadsheet className="size-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportCSV}>
            <SheetIcon className="size-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePrint}>
            <Printer className="size-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Header card with QR code */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs uppercase">{event.eventCode}</Badge>
              <Badge variant="outline" className="capitalize text-xs">{event.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{formatDateBD(event.date)}{event.venue ? ` · ${event.venue}` : ''}</p>
            {event.organizer && <p className="text-xs text-muted-foreground">Organizer: {event.organizer}</p>}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="bg-white p-2 rounded-lg border">
              <QRCodeSVG value={summaryUrl} size={72} />
            </div>
            <span className="text-[10px] text-muted-foreground">Scan for reference</span>
          </div>
        </CardContent>
      </Card>

      {/* Financial overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Income</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrencyBDT(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Expense</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrencyBDT(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Net Balance</p>
            <p className={`text-xl font-bold ${profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrencyBDT(profitLoss)}</p>
            <p className="text-[11px] text-muted-foreground">{profitLoss >= 0 ? 'Profit' : 'Loss'}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Remaining Budget</p>
            <p className={`text-xl font-bold ${remainingBudget >= 0 ? 'text-primary' : 'text-rose-600'}`}>{formatCurrencyBDT(remainingBudget)}</p>
            <p className="text-[11px] text-muted-foreground">Est. {formatCurrencyBDT(totalEstimated)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Advances Given</span>
            <span className="text-sm font-bold">{formatCurrencyBDT(totalAdvancesGiven)}</span>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Advances Outstanding</span>
            <span className={`text-sm font-bold ${totalAdvancesOutstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrencyBDT(totalAdvancesOutstanding)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Income table */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Income ({incomes?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {!incomes?.length ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No income recorded for this event</TableCell></TableRow>
              ) : incomes.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm">{formatDateBD(i.date)}</TableCell>
                  <TableCell className="text-sm font-mono">{i.incomeCode}</TableCell>
                  <TableCell className="text-sm">{i.description}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-emerald-600">{formatCurrencyBDT(i.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expense table */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Expenses ({expenses?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Code</TableHead><TableHead>Payee / Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {!expenses?.length ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No expenses recorded for this event</TableCell></TableRow>
              ) : expenses.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{formatDateBD(e.date)}</TableCell>
                  <TableCell className="text-sm font-mono">{e.expenseCode}</TableCell>
                  <TableCell className="text-sm">{e.payee} — {e.description}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-rose-600">{formatCurrencyBDT(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Advances table */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Advances ({advances?.length ?? 0}) · Settled {formatCurrencyBDT(totalSettled)}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Code</TableHead><TableHead>Person / Purpose</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Given</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
            <TableBody>
              {!advances?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No advances linked to this event</TableCell></TableRow>
              ) : advances.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">{formatDateBD(a.date)}</TableCell>
                  <TableCell className="text-sm font-mono">{a.advanceCode}</TableCell>
                  <TableCell className="text-sm">{a.personName} — {a.purpose}</TableCell>
                  <TableCell className="text-sm capitalize">{a.status.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrencyBDT(a.amountGiven)}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-amber-600">{formatCurrencyBDT(a.outstandingAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Paperclip className="size-3.5" /> Attachments ({attachments?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-4">
          {!attachments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-2">No attachments uploaded for this event</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attachments.map(att => (
                <Badge key={att.id} variant="outline" className="text-xs">{att.fileName}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit history */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><History className="size-3.5" /> Audit History ({auditLogs?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!auditLogs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No audit entries recorded for this event yet</p>
          ) : (
            <div className="divide-y">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, ' ')} <span className="text-muted-foreground">by {log.username}</span></p>
                    {log.reason && <p className="text-xs text-muted-foreground">{log.reason}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTimeBD(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
