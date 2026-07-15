import { useRoute, Link } from 'wouter';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, FileSpreadsheet, Printer, Calendar, Building2 } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD, exportToExcel, exportToPDF, printPDF } from '@/lib/export';
import { toast } from 'sonner';
import { BudgetEditor } from '@/components/budget/BudgetEditor';

export function BudgetDetail() {
  const [, params] = useRoute('/budget-management/:id');
  const budgetId = params?.id ? parseInt(params.id) : undefined;

  const budget = useLiveQuery(() => budgetId ? db.budgets.get(budgetId) : undefined, [budgetId]);
  const event = useLiveQuery(() => budget?.eventId ? db.events.get(budget.eventId) : undefined, [budget?.eventId]);
  const categories = useLiveQuery(() => budgetId ? db.budgetCategories.where('budgetId').equals(budgetId).sortBy('sortOrder') : [], [budgetId]);

  if (!budget) return <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>;

  const totalEstimated = categories?.reduce((s, c) => s + c.estimatedAmount, 0) ?? 0;
  const totalActual = categories?.reduce((s, c) => s + c.actualAmount, 0) ?? 0;
  const utilization = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0;

  const buildReportOpts = () => ({
    title: `Budget Report — ${budget.name}`,
    subtitle: budget.scope === 'organization' ? (budget.fiscalYear ? `Organization Budget · FY ${budget.fiscalYear}` : 'Organization Budget') : event?.name,
    meta: [
      { label: 'Budget Code', value: budget.budgetCode },
      { label: 'Status', value: budget.approvalStatus },
      { label: 'Generated', value: formatDateBD(new Date().toISOString()) },
    ],
    head: [['Category', 'Estimated', 'Actual', 'Remaining', '% Used', 'Notes']],
    body: (categories ?? []).map(c => {
      const remaining = c.estimatedAmount - c.actualAmount;
      const pct = c.estimatedAmount > 0 ? (c.actualAmount / c.estimatedAmount) * 100 : 0;
      return [c.name, formatCurrencyBDT(c.estimatedAmount), formatCurrencyBDT(c.actualAmount), formatCurrencyBDT(remaining), `${pct.toFixed(0)}%`, c.notes ?? ''];
    }).concat([['Total', formatCurrencyBDT(totalEstimated), formatCurrencyBDT(totalActual), formatCurrencyBDT(totalEstimated - totalActual), `${utilization.toFixed(0)}%`, '']]),
    filename: `budget_${budget.budgetCode}`,
  });

  const handleExportPDF = () => exportToPDF(buildReportOpts());
  const handlePrint = () => printPDF(buildReportOpts());
  const handleExportExcel = () => {
    if (!categories?.length) { toast.error('No budget lines to export'); return; }
    const data = categories.map(c => {
      const remaining = c.estimatedAmount - c.actualAmount;
      const pct = c.estimatedAmount > 0 ? (c.actualAmount / c.estimatedAmount) * 100 : 0;
      return {
        Category: c.name,
        'Estimated (৳)': c.estimatedAmount,
        'Actual (৳)': c.actualAmount,
        'Remaining (৳)': remaining,
        '% Used': `${pct.toFixed(0)}%`,
        Notes: c.notes ?? '',
      };
    });
    exportToExcel(data, `budget_${budget.budgetCode}`, 'Budget');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/budget-management"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{budget.name}</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">{budget.budgetCode}</span>
            <Badge variant="secondary" className="text-xs gap-1">
              {budget.scope === 'organization' ? <Building2 className="size-3" /> : <Calendar className="size-3" />}
              {budget.scope === 'organization' ? (budget.fiscalYear ? `FY ${budget.fiscalYear}` : 'Organization') : (event?.name ?? 'Event')}
            </Badge>
          </div>
        </div>
        {(categories?.length ?? 0) > 0 && (
          <div className="hidden sm:flex gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportPDF}>
              <FileText className="size-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-emerald-600" onClick={handleExportExcel}>
              <FileSpreadsheet className="size-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePrint}>
              <Printer className="size-3.5" /> Print
            </Button>
          </div>
        )}
        {budget.scope === 'event' && event && (
          <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" asChild>
            <Link href={`/events/${event.id}/budget`}>View Event</Link>
          </Button>
        )}
      </div>

      <BudgetEditor budget={budget} />
    </div>
  );
}
