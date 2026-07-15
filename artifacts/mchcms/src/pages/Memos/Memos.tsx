import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateMemoCode } from '@/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, StickyNote } from 'lucide-react';
import { formatDateBD } from '@/lib/export';
import { toast } from 'sonner';
import type { MemoPriority, MemoStatus } from '@/db';

const PRIORITY_COLORS: Record<MemoPriority, string> = {
  low:    'bg-slate-100 text-slate-600 border-slate-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high:   'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_COLORS: Record<MemoStatus, string> = {
  open:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  resolved: 'bg-slate-100 text-slate-600 border-slate-200',
  archived: 'bg-slate-50 text-slate-500 border-slate-200',
};

export function Memos() {
  const { user, hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MemoPriority>('normal');
  const [reminderDate, setReminderDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('open');

  const memos = useLiveQuery(() => db.memos.reverse().sortBy('date'));

  const filtered = memos?.filter(m => filterStatus === 'all' || m.status === filterStatus);

  const handleCreate = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    const code = await generateMemoCode();
    const now = new Date().toISOString();
    const id = await db.memos.add({
      memoNumber: code,
      date: now.slice(0, 10),
      subject: subject.trim(),
      description: description.trim(),
      priority,
      status: 'open',
      reminderDate: reminderDate || undefined,
      createdBy: user!.id!,
      createdByName: user!.displayName,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit({ username: user!.username, userId: user!.id, action: 'create', module: 'memo', recordId: id as number, recordCode: code });
    setSubject(''); setDescription(''); setPriority('normal'); setReminderDate('');
    setOpen(false);
    toast.success('Memo created');
  };

  const handleResolve = async (id: number) => {
    await db.memos.update(id, { status: 'resolved', updatedAt: new Date().toISOString() });
    toast.success('Memo resolved');
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Memo Book</h2>
        {hasPermission('memo:create') && (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> New Memo
          </Button>
        )}
      </div>

      <div className="flex gap-2 items-center">
        {(['all', 'open', 'resolved', 'archived'] as const).map(s => (
          <Button key={s} size="sm" variant={filterStatus === s ? 'default' : 'outline'} className="h-7 text-xs capitalize"
            onClick={() => setFilterStatus(s)}>{s}</Button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered === undefined ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
            <StickyNote className="size-6 opacity-20" />
            No memos found
          </div>
        ) : filtered.map(memo => (
          <Card key={memo.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{memo.memoNumber}</span>
                    <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[memo.priority]}`}>{memo.priority}</Badge>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[memo.status]}`}>{memo.status}</Badge>
                  </div>
                  <p className="font-semibold text-sm">{memo.subject}</p>
                  {memo.description && <p className="text-xs text-muted-foreground mt-1">{memo.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{formatDateBD(memo.date)}</span>
                    <span>by {memo.createdByName}</span>
                    {memo.reminderDate && <span className="text-amber-600">Reminder: {formatDateBD(memo.reminderDate)}</span>}
                  </div>
                </div>
                {memo.status === 'open' && hasPermission('memo:update') && (
                  <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => handleResolve(memo.id!)}>
                    Resolve
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Memo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Subject *</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief subject..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Full details..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={v => setPriority(v as MemoPriority)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reminder Date</Label>
                <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate}>Save Memo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
