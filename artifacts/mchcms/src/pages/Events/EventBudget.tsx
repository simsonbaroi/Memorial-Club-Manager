import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateBudgetCode } from '@/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, Pencil, Check, X } from 'lucide-react';
import { formatCurrencyBDT } from '@/lib/export';
import { toast } from 'sonner';

export function EventBudget() {
  const [, params] = useRoute('/events/:id/budget');
  const { user, hasPermission } = useAuth();
  const eventId = params?.id ? parseInt(params.id) : undefined;

  const event = useLiveQuery(() => eventId ? db.events.get(eventId) : undefined, [eventId]);
  const budgets = useLiveQuery(() => eventId ? db.budgets.where('eventId').equals(eventId).toArray() : [], [eventId]);
  const [activeBudgetId, setActiveBudgetId] = useState<number | null>(null);

  const activeBudget = budgets?.find(b => b.id === activeBudgetId) ?? budgets?.[0];

  const categories = useLiveQuery(() =>
    activeBudget?.id ? db.budgetCategories.where('budgetId').equals(activeBudget.id).sortBy('sortOrder') : [],
    [activeBudget?.id]
  );

  // New budget form
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [budgetName, setBudgetName] = useState('');

  // New category form
  const [showNewCat, setShowNewCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [catEstimated, setCatEstimated] = useState('');
  const [catNotes, setCatNotes] = useState('');

  // Inline edit
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editActual, setEditActual] = useState('');
  const [editReason, setEditReason] = useState('');

  const totalEstimated = categories?.reduce((s, c) => s + c.estimatedAmount, 0) ?? 0;
  const totalActual = categories?.reduce((s, c) => s + c.actualAmount, 0) ?? 0;
  const utilization = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0;

  const handleCreateBudget = async () => {
    if (!budgetName.trim()) { toast.error('Budget name required'); return; }
    const code = await generateBudgetCode();
    const now = new Date().toISOString();
    const id = await db.budgets.add({
      budgetCode: code,
      name: budgetName.trim(),
      eventId: eventId!,
      approvalStatus: 'draft',
      createdBy: user!.id!,
      createdByName: user!.displayName,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit({ username: user!.username, userId: user!.id, action: 'create', module: 'budget', recordId: id as number, recordCode: code });
    setActiveBudgetId(id as number);
    setBudgetName('');
    setShowNewBudget(false);
    toast.success('Budget created');
  };

  const handleAddCategory = async () => {
    if (!catName.trim() || !catEstimated) { toast.error('Name and estimated amount required'); return; }
    const sortOrder = (categories?.length ?? 0) + 1;
    const now = new Date().toISOString();
    await db.budgetCategories.add({
      budgetId: activeBudget!.id!,
      name: catName.trim(),
      estimatedAmount: parseFloat(catEstimated),
      actualAmount: 0,
      notes: catNotes || undefined,
      sortOrder,
      createdAt: now,
    });
    setCatName(''); setCatEstimated(''); setCatNotes('');
    setShowNewCat(false);
    toast.success('Category added');
  };

  const handleUpdateActual = async (catId: number) => {
    const actual = parseFloat(editActual);
    if (isNaN(actual)) { toast.error('Enter a valid amount'); return; }
    const cat = categories?.find(c => c.id === catId);
    if (!cat) return;
    const now = new Date().toISOString();

    // Record revision
    await db.budgetRevisions.add({
      budgetCategoryId: catId,
      budgetId: activeBudget!.id!,
      field: 'actualAmount',
      previousValue: String(cat.actualAmount),
      newValue: String(actual),
      reason: editReason || undefined,
      revisedBy: user!.id!,
      revisedByName: user!.displayName,
      revisedAt: now,
    });

    await db.budgetCategories.update(catId, { actualAmount: actual });
    setEditingCatId(null);
    setEditActual('');
    setEditReason('');
    toast.success('Actual amount updated');
  };

  if (!event) return <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/events"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{event.name}</h2>
          <p className="text-xs text-muted-foreground">Budget Management</p>
        </div>
        {hasPermission('budget:create') && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setShowNewBudget(true)}>
            <Plus className="size-3.5" /> New Budget
          </Button>
        )}
      </div>

      {/* Budget selector */}
      {(budgets?.length ?? 0) > 1 && (
        <div className="flex gap-2 flex-wrap">
          {budgets?.map(b => (
            <Button key={b.id} size="sm" variant={activeBudget?.id === b.id ? 'default' : 'outline'} className="h-7 text-xs"
              onClick={() => setActiveBudgetId(b.id!)}>
              {b.name}
            </Button>
          ))}
        </div>
      )}

      {/* New Budget form */}
      {showNewBudget && (
        <Card className="shadow-sm border-blue-200">
          <CardContent className="p-4 flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Budget Name</Label>
              <Input value={budgetName} onChange={e => setBudgetName(e.target.value)} placeholder="e.g. Football Tournament 2026 Budget" />
            </div>
            <Button size="sm" onClick={handleCreateBudget}>Create</Button>
            <Button size="sm" variant="outline" onClick={() => setShowNewBudget(false)}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      {!activeBudget ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No budget yet. Create one to start planning.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="shadow-sm">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-primary">{formatCurrencyBDT(totalEstimated)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Estimated</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-rose-600">{formatCurrencyBDT(totalActual)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Actual</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 text-center">
                <div className={`text-lg font-bold ${totalEstimated - totalActual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrencyBDT(totalEstimated - totalActual)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Remaining</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 text-center">
                <div className={`text-lg font-bold ${utilization > 100 ? 'text-rose-600' : utilization > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {utilization.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Used</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Budget Utilization</span>
                <span>{utilization.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(utilization, 100)} className="h-2" />
            </CardContent>
          </Card>

          {/* Categories table */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{activeBudget.name}
                <Badge variant="outline" className="ml-2 text-xs">{activeBudget.approvalStatus}</Badge>
              </CardTitle>
              {hasPermission('budget:update') && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowNewCat(true)}>
                  <Plus className="size-3" /> Add Line
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">% Used</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map(cat => {
                    const remaining = cat.estimatedAmount - cat.actualAmount;
                    const pct = cat.estimatedAmount > 0 ? (cat.actualAmount / cat.estimatedAmount) * 100 : 0;
                    const isEditing = editingCatId === cat.id;
                    return (
                      <TableRow key={cat.id}>
                        <TableCell className="text-sm font-medium">{cat.name}
                          {cat.notes && <p className="text-xs text-muted-foreground font-normal">{cat.notes}</p>}
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrencyBDT(cat.estimatedAmount)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {isEditing ? (
                            <div className="flex flex-col gap-1 items-end">
                              <Input type="number" step="0.01" value={editActual} onChange={e => setEditActual(e.target.value)} className="h-7 w-28 text-xs text-right" />
                              <Input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Reason (optional)" className="h-7 w-28 text-xs" />
                            </div>
                          ) : (
                            <span className={cat.actualAmount > cat.estimatedAmount ? 'text-rose-600' : ''}>{formatCurrencyBDT(cat.actualAmount)}</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right text-sm ${remaining < 0 ? 'text-rose-600 font-medium' : ''}`}>{formatCurrencyBDT(remaining)}</TableCell>
                        <TableCell className="text-right text-sm">
                          <span className={pct > 100 ? 'text-rose-600 font-medium' : pct > 80 ? 'text-amber-600' : ''}>{pct.toFixed(0)}%</span>
                        </TableCell>
                        <TableCell>
                          {hasPermission('budget:update') && (
                            isEditing ? (
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdateActual(cat.id!)}><Check className="size-3.5 text-emerald-600" /></Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCatId(null)}><X className="size-3.5" /></Button>
                              </div>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingCatId(cat.id!); setEditActual(String(cat.actualAmount)); }}><Pencil className="size-3" /></Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Add category row */}
                  {showNewCat && (
                    <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                      <TableCell>
                        <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" className="h-7 text-xs" />
                        <Input value={catNotes} onChange={e => setCatNotes(e.target.value)} placeholder="Notes (optional)" className="h-7 text-xs mt-1" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.01" value={catEstimated} onChange={e => setCatEstimated(e.target.value)} placeholder="0.00" className="h-7 text-xs text-right" />
                      </TableCell>
                      <TableCell colSpan={3} />
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddCategory}><Check className="size-3.5 text-emerald-600" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowNewCat(false)}><X className="size-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Totals */}
                  {(categories?.length ?? 0) > 0 && (
                    <TableRow className="bg-muted/40 font-semibold border-t-2">
                      <TableCell className="text-sm">Total</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrencyBDT(totalEstimated)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrencyBDT(totalActual)}</TableCell>
                      <TableCell className={`text-right text-sm ${totalEstimated - totalActual < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrencyBDT(totalEstimated - totalActual)}</TableCell>
                      <TableCell className="text-right text-sm">{utilization.toFixed(0)}%</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
