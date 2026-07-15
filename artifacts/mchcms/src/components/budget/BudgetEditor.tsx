import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Budget, BudgetStatus } from '@/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Check, X, Trash2, History, LayoutTemplate, Lock, Unlock, ThumbsUp } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { toast } from 'sonner';

const STATUS_COLORS: Record<BudgetStatus, string> = {
  draft:    'bg-slate-50 text-slate-600 border-slate-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  locked:   'bg-blue-50 text-blue-700 border-blue-200',
};

export function BudgetEditor({ budget }: { budget: Budget }) {
  const { user, hasPermission } = useAuth();
  const isLocked = budget.approvalStatus === 'locked';

  const categories = useLiveQuery(() =>
    budget.id ? db.budgetCategories.where('budgetId').equals(budget.id).sortBy('sortOrder') : [],
    [budget.id]
  );
  const revisions = useLiveQuery(() =>
    budget.id ? db.budgetRevisions.where('budgetId').equals(budget.id).reverse().sortBy('revisedAt') : [],
    [budget.id]
  );
  const templates = useLiveQuery(() => db.budgetTemplates.toArray());

  const [showNewCat, setShowNewCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [catEstimated, setCatEstimated] = useState('');
  const [catNotes, setCatNotes] = useState('');

  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editActual, setEditActual] = useState('');
  const [editReason, setEditReason] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const [templateId, setTemplateId] = useState<string>('');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const totalEstimated = categories?.reduce((s, c) => s + c.estimatedAmount, 0) ?? 0;
  const totalActual = categories?.reduce((s, c) => s + c.actualAmount, 0) ?? 0;
  const utilization = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0;

  const canEdit = hasPermission('budget:update') && !isLocked;

  const handleAddCategory = async () => {
    if (!catName.trim() || !catEstimated) { toast.error('Name and estimated amount required'); return; }
    const sortOrder = (categories?.length ?? 0) + 1;
    const now = new Date().toISOString();
    await db.budgetCategories.add({
      budgetId: budget.id!,
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

  const handleDeleteCategory = async (catId: number) => {
    await db.budgetCategories.delete(catId);
    await db.budgetRevisions.where('budgetCategoryId').equals(catId).delete();
    toast.success('Category removed');
  };

  const handleUpdateActual = async (catId: number) => {
    const actual = parseFloat(editActual);
    if (isNaN(actual)) { toast.error('Enter a valid amount'); return; }
    const cat = categories?.find(c => c.id === catId);
    if (!cat) return;
    const now = new Date().toISOString();

    await db.budgetRevisions.add({
      budgetCategoryId: catId,
      budgetId: budget.id!,
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

  const handleApplyTemplate = async () => {
    const template = templates?.find(t => String(t.id) === templateId);
    if (!template) { toast.error('Choose a template first'); return; }
    const existingNames = new Set((categories ?? []).map(c => c.name.toLowerCase()));
    const toAdd = template.categoryNames.filter(n => !existingNames.has(n.toLowerCase()));
    if (toAdd.length === 0) { toast.info('All template categories already exist on this budget'); return; }
    const now = new Date().toISOString();
    let sortOrder = (categories?.length ?? 0) + 1;
    for (const name of toAdd) {
      await db.budgetCategories.add({ budgetId: budget.id!, name, estimatedAmount: 0, actualAmount: 0, sortOrder: sortOrder++, createdAt: now });
    }
    toast.success(`Added ${toAdd.length} categories from "${template.name}"`);
    setTemplateId('');
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) { toast.error('Template name required'); return; }
    if (!categories?.length) { toast.error('This budget has no categories yet'); return; }
    const now = new Date().toISOString();
    await db.budgetTemplates.add({
      name: templateName.trim(),
      categoryNames: categories.map(c => c.name),
      createdBy: user!.id!,
      createdByName: user!.displayName,
      createdAt: now,
    });
    await logAudit({ username: user!.username, userId: user!.id, action: 'create', module: 'budget_template', recordCode: templateName.trim() });
    setSaveTemplateOpen(false);
    setTemplateName('');
    toast.success('Template saved');
  };

  const handleStatusChange = async (next: BudgetStatus, action: 'approve' | 'lock' | 'unlock') => {
    await db.budgets.update(budget.id!, { approvalStatus: next, lastModifiedBy: user!.id!, updatedAt: new Date().toISOString() });
    await logAudit({ username: user!.username, userId: user!.id, action, module: 'budget', recordId: budget.id, recordCode: budget.budgetCode });
    toast.success(`Budget ${next}`);
  };

  return (
    <div className="space-y-4">
      {/* Status + actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[budget.approvalStatus]}`}>{budget.approvalStatus}</Badge>
        <div className="flex gap-1.5 flex-wrap">
          {hasPermission('budget:approve') && budget.approvalStatus !== 'approved' && budget.approvalStatus !== 'locked' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleStatusChange('approved', 'approve')}>
              <ThumbsUp className="size-3" /> Approve
            </Button>
          )}
          {hasPermission('budget:approve') && budget.approvalStatus === 'approved' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleStatusChange('locked', 'lock')}>
              <Lock className="size-3" /> Lock
            </Button>
          )}
          {hasPermission('budget:approve') && budget.approvalStatus === 'locked' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleStatusChange('approved', 'unlock')}>
              <Unlock className="size-3" /> Unlock
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setShowHistory(v => !v)}>
            <History className="size-3" /> History
          </Button>
        </div>
      </div>

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

      {/* Templates row */}
      {canEdit && (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <LayoutTemplate className="size-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground shrink-0">Category Template</span>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="Choose a template..." /></SelectTrigger>
              <SelectContent>
                {(templates ?? []).map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.categoryNames.length})</SelectItem>
                ))}
                {(templates ?? []).length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No templates yet</div>}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleApplyTemplate} disabled={!templateId}>Apply</Button>
            <div className="flex-1" />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSaveTemplateOpen(true)}>Save current as template</Button>
          </CardContent>
        </Card>
      )}

      {/* Categories table */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Budget Lines</CardTitle>
          {canEdit && (
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
              {(categories?.length ?? 0) === 0 && !showNewCat && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No budget lines yet</TableCell>
                </TableRow>
              )}
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
                      {canEdit && (
                        isEditing ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdateActual(cat.id!)}><Check className="size-3.5 text-emerald-600" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCatId(null)}><X className="size-3.5" /></Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingCatId(cat.id!); setEditActual(String(cat.actualAmount)); }}><Pencil className="size-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteCategory(cat.id!)}><Trash2 className="size-3 text-rose-500" /></Button>
                          </div>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

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

      {/* Revision history */}
      {showHistory && (
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm">Revision History</CardTitle></CardHeader>
          <CardContent className="p-4">
            {(revisions?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No revisions recorded yet</p>
            ) : (
              <div className="space-y-2.5">
                {revisions?.map(r => {
                  const cat = categories?.find(c => c.id === r.budgetCategoryId);
                  return (
                    <div key={r.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-medium">{cat?.name ?? 'Deleted category'}</span>
                        <span className="text-xs text-muted-foreground">{formatDateBD(r.revisedAt)} by {r.revisedByName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.field}: <span className="line-through">{formatCurrencyBDT(parseFloat(r.previousValue) || 0)}</span> → <span className="font-medium text-foreground">{formatCurrencyBDT(parseFloat(r.newValue) || 0)}</span>
                        {r.reason && <> — "{r.reason}"</>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
          <div className="space-y-2 pt-1">
            <Label className="text-xs">Template Name</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Annual Sports Event" />
            <p className="text-xs text-muted-foreground">Saves the {categories?.length ?? 0} category names from this budget (not the amounts) so you can reuse them next time.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveAsTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
