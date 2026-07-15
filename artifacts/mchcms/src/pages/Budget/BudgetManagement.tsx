import { useState } from 'react';
import { Link } from 'wouter';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateBudgetCode } from '@/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, PiggyBank, LayoutTemplate, Trash2, Calendar, Building2 } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import type { BudgetStatus } from '@/db';
import { toast } from 'sonner';

const STATUS_COLORS: Record<BudgetStatus, string> = {
  draft:    'bg-slate-50 text-slate-600 border-slate-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  locked:   'bg-blue-50 text-blue-700 border-blue-200',
};

export function BudgetManagement() {
  const { user, hasPermission } = useAuth();

  const budgets = useLiveQuery(() => db.budgets.orderBy('createdAt').reverse().toArray());
  const events = useLiveQuery(() => db.events.toArray());
  const categories = useLiveQuery(() => db.budgetCategories.toArray());
  const templates = useLiveQuery(() => db.budgetTemplates.toArray());

  const [scopeFilter, setScopeFilter] = useState<'all' | 'organization' | 'event'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | BudgetStatus>('all');

  const [showNewBudget, setShowNewBudget] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFiscalYear, setNewFiscalYear] = useState(String(new Date().getFullYear()));

  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategories, setTemplateCategories] = useState('');

  const eventName = (eventId?: number) => events?.find(e => e.id === eventId)?.name;

  const totalsByBudget = (budgetId?: number) => {
    const cats = categories?.filter(c => c.budgetId === budgetId) ?? [];
    const estimated = cats.reduce((s, c) => s + c.estimatedAmount, 0);
    const actual = cats.reduce((s, c) => s + c.actualAmount, 0);
    return { estimated, actual };
  };

  const filtered = budgets?.filter(b =>
    (scopeFilter === 'all' || b.scope === scopeFilter) &&
    (statusFilter === 'all' || b.approvalStatus === statusFilter)
  ) ?? [];

  const grandEstimated = filtered.reduce((s, b) => s + totalsByBudget(b.id).estimated, 0);
  const grandActual = filtered.reduce((s, b) => s + totalsByBudget(b.id).actual, 0);
  const grandUtilization = grandEstimated > 0 ? (grandActual / grandEstimated) * 100 : 0;

  const handleCreateBudget = async () => {
    if (!newName.trim()) { toast.error('Budget name required'); return; }
    const code = await generateBudgetCode();
    const now = new Date().toISOString();
    const id = await db.budgets.add({
      budgetCode: code,
      name: newName.trim(),
      scope: 'organization',
      fiscalYear: newFiscalYear || undefined,
      approvalStatus: 'draft',
      createdBy: user!.id!,
      createdByName: user!.displayName,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit({ username: user!.username, userId: user!.id, action: 'create', module: 'budget', recordId: id as number, recordCode: code });
    setNewName('');
    setShowNewBudget(false);
    toast.success('Budget created');
  };

  const handleCreateTemplate = async () => {
    const names = templateCategories.split('\n').map(s => s.trim()).filter(Boolean);
    if (!templateName.trim() || names.length === 0) { toast.error('Template name and at least one category required'); return; }
    const now = new Date().toISOString();
    await db.budgetTemplates.add({
      name: templateName.trim(),
      categoryNames: names,
      createdBy: user!.id!,
      createdByName: user!.displayName,
      createdAt: now,
    });
    await logAudit({ username: user!.username, userId: user!.id, action: 'create', module: 'budget_template', recordCode: templateName.trim() });
    setTemplateName(''); setTemplateCategories('');
    setNewTemplateOpen(false);
    toast.success('Template created');
  };

  const handleDeleteTemplate = async (id: number) => {
    await db.budgetTemplates.delete(id);
    toast.success('Template deleted');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><PiggyBank className="size-5 text-primary" /> Budget Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Organization-wide and event budgets, in one place</p>
        </div>
        {hasPermission('budget:create') && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowNewBudget(true)}>
            <Plus className="size-3.5" /> New Budget
          </Button>
        )}
      </div>

      <Tabs defaultValue="budgets">
        <TabsList>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="overview">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* ─── Budgets list ─── */}
        <TabsContent value="budgets" className="space-y-3 pt-3">
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as typeof scopeFilter)}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showNewBudget && (
            <Card className="shadow-sm border-blue-200">
              <CardContent className="p-4 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-xs">Budget Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Annual Operating Budget 2026" />
                </div>
                <div className="space-y-1 w-32">
                  <Label className="text-xs">Fiscal Year</Label>
                  <Input value={newFiscalYear} onChange={e => setNewFiscalYear(e.target.value)} placeholder="2026" />
                </div>
                <Button size="sm" onClick={handleCreateBudget}>Create</Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewBudget(false)}>Cancel</Button>
              </CardContent>
              <CardContent className="pt-0 pb-3 -mt-2">
                <p className="text-xs text-muted-foreground">To create a budget tied to a specific event, open that event and use "New Budget" there — it will also appear in this list.</p>
              </CardContent>
            </Card>
          )}

          {filtered.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="py-12 text-center text-sm text-muted-foreground">No budgets match these filters</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(b => {
                const { estimated, actual } = totalsByBudget(b.id);
                const pct = estimated > 0 ? (actual / estimated) * 100 : 0;
                return (
                  <Link key={b.id} href={`/budget-management/${b.id}`}>
                    <Card className="shadow-sm hover:border-primary/40 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs text-muted-foreground">{b.budgetCode}</span>
                              <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.approvalStatus]}`}>{b.approvalStatus}</Badge>
                              <Badge variant="secondary" className="text-xs gap-1">
                                {b.scope === 'organization' ? <Building2 className="size-3" /> : <Calendar className="size-3" />}
                                {b.scope === 'organization' ? (b.fiscalYear ? `FY ${b.fiscalYear}` : 'Organization') : (eventName(b.eventId) ?? 'Event')}
                              </Badge>
                            </div>
                            <p className="font-semibold text-sm">{b.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-primary">{formatCurrencyBDT(estimated)}</div>
                            <div className="text-xs text-muted-foreground">estimated</div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{formatCurrencyBDT(actual)} used</span>
                            <span>{pct.toFixed(0)}%</span>
                          </div>
                          <Progress value={Math.min(pct, 100)} className="h-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Budget vs Actual overview ─── */}
        <TabsContent value="overview" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="shadow-sm"><CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-primary">{formatCurrencyBDT(grandEstimated)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Estimated</div>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-rose-600">{formatCurrencyBDT(grandActual)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Actual</div>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 text-center">
              <div className={`text-lg font-bold ${grandEstimated - grandActual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrencyBDT(grandEstimated - grandActual)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Remaining</div>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 text-center">
              <div className={`text-lg font-bold ${grandUtilization > 100 ? 'text-rose-600' : grandUtilization > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{grandUtilization.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Used</div>
            </CardContent></Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm">Per-Budget Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Budget</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">% Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No data</TableCell></TableRow>
                  ) : filtered.map(b => {
                    const { estimated, actual } = totalsByBudget(b.id);
                    const variance = estimated - actual;
                    const pct = estimated > 0 ? (actual / estimated) * 100 : 0;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="text-sm font-medium">
                          <Link href={`/budget-management/${b.id}`} className="hover:underline">{b.name}</Link>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.scope === 'organization' ? (b.fiscalYear ? `FY ${b.fiscalYear}` : 'Organization') : (eventName(b.eventId) ?? 'Event')}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrencyBDT(estimated)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrencyBDT(actual)}</TableCell>
                        <TableCell className={`text-right text-sm ${variance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrencyBDT(variance)}</TableCell>
                        <TableCell className="text-right text-sm">{pct.toFixed(0)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Templates ─── */}
        <TabsContent value="templates" className="space-y-3 pt-3">
          <div className="flex justify-end">
            {hasPermission('budget:create') && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewTemplateOpen(true)}>
                <Plus className="size-3.5" /> New Template
              </Button>
            )}
          </div>
          {(templates?.length ?? 0) === 0 ? (
            <Card className="shadow-sm"><CardContent className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <LayoutTemplate className="size-6 opacity-20" /> No templates yet — create one here, or save one from any budget's category list.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {templates?.map(t => (
                <Card key={t.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t.categoryNames.join(' · ')}</p>
                      <p className="text-xs text-muted-foreground mt-1">Created {formatDateBD(t.createdAt)} by {t.createdByName}</p>
                    </div>
                    {hasPermission('budget:update') && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleDeleteTemplate(t.id!)}>
                        <Trash2 className="size-3.5 text-rose-500" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Budget Template</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs">Template Name</Label>
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Annual Sports Event" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category Names (one per line)</Label>
              <textarea
                value={templateCategories}
                onChange={e => setTemplateCategories(e.target.value)}
                rows={6}
                placeholder={'Venue Rental\nRefreshments\nPrizes\nTransportation'}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewTemplateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
