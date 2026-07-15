import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generatePromiseCode } from '@/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, HandshakeIcon } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { toast } from 'sonner';
import type { PromiseStatus } from '@/db';

const STATUS_COLORS: Record<PromiseStatus, string> = {
  promised:  'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  received:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
};

const NEXT_STATUS: Partial<Record<PromiseStatus, PromiseStatus>> = {
  promised: 'confirmed',
  confirmed: 'received',
};

const NEXT_LABEL: Partial<Record<PromiseStatus, string>> = {
  promised: 'Mark Confirmed',
  confirmed: 'Mark Received',
};

export function Promises() {
  const { user, hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [promisedBy, setPromisedBy] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [promiseDate, setPromiseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('promised');

  const promises = useLiveQuery(() => db.promises.reverse().sortBy('promiseDate'));

  const filtered = promises?.filter(p => filterStatus === 'all' || p.status === filterStatus);

  const totalPromised = filtered?.filter(p => p.status !== 'cancelled').reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalReceived = filtered?.filter(p => p.status === 'received').reduce((s, p) => s + (p.receivedAmount ?? p.amount), 0) ?? 0;

  const handleCreate = async () => {
    if (!promisedBy.trim() || !amount) { toast.error('Name and amount required'); return; }
    const code = await generatePromiseCode();
    const now = new Date().toISOString();
    const id = await db.promises.add({
      promiseCode: code,
      promisedBy: promisedBy.trim(),
      phone: phone || undefined,
      amount: parseFloat(amount),
      description: description.trim(),
      promiseDate,
      expectedDate: expectedDate || undefined,
      status: 'promised',
      notes: notes || undefined,
      createdBy: user!.id!,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit({ username: user!.username, userId: user!.id, action: 'create', module: 'promise', recordId: id as number, recordCode: code });
    setPromisedBy(''); setPhone(''); setAmount(''); setDescription(''); setNotes(''); setExpectedDate('');
    setOpen(false);
    toast.success('Promise recorded');
  };

  const handleAdvance = async (id: number, current: PromiseStatus) => {
    const next = NEXT_STATUS[current];
    if (!next) return;
    const update: Record<string, unknown> = { status: next, updatedAt: new Date().toISOString() };
    if (next === 'received') {
      update.receivedDate = new Date().toISOString().slice(0, 10);
    }
    await db.promises.update(id, update);
    toast.success(`Marked as ${next}`);
  };

  const handleCancel = async (id: number) => {
    await db.promises.update(id, { status: 'cancelled', updatedAt: new Date().toISOString() });
    toast.success('Promise cancelled');
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Promise Register</h2>
        {hasPermission('promise:create') && (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> New Promise
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Promised</span>
            <span className="font-semibold text-sm text-amber-600">{formatCurrencyBDT(totalPromised)}</span>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Received</span>
            <span className="font-semibold text-sm text-emerald-600">{formatCurrencyBDT(totalReceived)}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        {(['all', 'promised', 'confirmed', 'received', 'cancelled'] as const).map(s => (
          <Button key={s} size="sm" variant={filterStatus === s ? 'default' : 'outline'} className="h-7 text-xs capitalize"
            onClick={() => setFilterStatus(s)}>{s}</Button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered === undefined ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
            <HandshakeIcon className="size-6 opacity-20" />
            No promises found
          </div>
        ) : filtered.map(p => (
          <Card key={p.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{p.promiseCode}</span>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status]}`}>{p.status}</Badge>
                  </div>
                  <p className="font-semibold text-sm">{p.promisedBy}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-sm font-bold text-primary">{formatCurrencyBDT(p.amount)}</span>
                    <span className="text-xs text-muted-foreground">Promised: {formatDateBD(p.promiseDate)}</span>
                    {p.expectedDate && <span className="text-xs text-amber-600">Expected: {formatDateBD(p.expectedDate)}</span>}
                    {p.receivedDate && <span className="text-xs text-emerald-600">Received: {formatDateBD(p.receivedDate)}</span>}
                  </div>
                </div>
                {hasPermission('promise:update') && (
                  <div className="flex flex-col gap-1 shrink-0">
                    {NEXT_STATUS[p.status] && (
                      <Button variant="outline" size="sm" className="h-7 text-xs whitespace-nowrap" onClick={() => handleAdvance(p.id!, p.status)}>
                        {NEXT_LABEL[p.status]}
                      </Button>
                    )}
                    {p.status !== 'cancelled' && p.status !== 'received' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => handleCancel(p.id!)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Promise</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-full">
                <Label className="text-xs">Promised By *</Label>
                <Input value={promisedBy} onChange={e => setPromisedBy(e.target.value)} placeholder="Person or organization name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount (৳) *</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Promise Date *</Label>
                <Input type="date" value={promiseDate} onChange={e => setPromiseDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expected By</Label>
                <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
              </div>
              <div className="space-y-1 col-span-full">
                <Label className="text-xs">Description *</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What was promised?" />
              </div>
              <div className="space-y-1 col-span-full">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate}>Save Promise</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
