import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateBudgetCode } from '@/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, BarChart3, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { BudgetEditor } from '@/components/budget/BudgetEditor';

export function EventBudget() {
  const [, params] = useRoute('/events/:id/budget');
  const { user, hasPermission } = useAuth();
  const eventId = params?.id ? parseInt(params.id) : undefined;

  const event = useLiveQuery(() => eventId ? db.events.get(eventId) : undefined, [eventId]);
  const budgets = useLiveQuery(() => eventId ? db.budgets.where('eventId').equals(eventId).toArray() : [], [eventId]);
  const [activeBudgetId, setActiveBudgetId] = useState<number | null>(null);

  const activeBudget = budgets?.find(b => b.id === activeBudgetId) ?? budgets?.[0];

  // New budget form
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [budgetName, setBudgetName] = useState('');

  const handleCreateBudget = async () => {
    if (!budgetName.trim()) { toast.error('Budget name required'); return; }
    const code = await generateBudgetCode();
    const now = new Date().toISOString();
    const id = await db.budgets.add({
      budgetCode: code,
      name: budgetName.trim(),
      scope: 'event',
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

  if (!event) return <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/events"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{event.name}</h2>
          <p className="text-xs text-muted-foreground">Event Budget</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" asChild>
          <Link href="/budget-management"><PiggyBank className="size-3.5" /> All Budgets</Link>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" asChild>
          <Link href={`/events/${eventId}/summary`}><BarChart3 className="size-3.5" /> Summary</Link>
        </Button>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{activeBudget.name}</h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href={`/budget-management/${activeBudget.id}`}>Open in Budget Management &rarr;</Link>
            </Button>
          </div>
          <BudgetEditor budget={activeBudget} />
        </>
      )}
    </div>
  );
}
