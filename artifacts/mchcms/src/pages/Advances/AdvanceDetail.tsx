import { useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, CheckCircle } from 'lucide-react';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { toast } from 'sonner';
import type { AdvanceStatus } from '@/db';

const STATUS_COLORS: Record<AdvanceStatus, string> = {
  draft:             'bg-slate-100 text-slate-700 border-slate-200',
  pending:           'bg-amber-50 text-amber-700 border-amber-200',
  approved:          'bg-blue-50 text-blue-700 border-blue-200',
  cash_released:     'bg-purple-50 text-purple-700 border-purple-200',
  partially_settled: 'bg-orange-50 text-orange-700 border-orange-200',
  fully_settled:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:         'bg-slate-50 text-slate-500 border-slate-200',
};

const STATUS_LABELS: Record<AdvanceStatus, string> = {
  draft: 'Draft', pending: 'Pending', approved: 'Approved',
  cash_released: 'Cash Released', partially_settled: 'Partially Settled',
  fully_settled: 'Fully Settled', cancelled: 'Cancelled',
};

export function AdvanceDetail() {
  const [, params] = useRoute('/advances/:id');
  const [, setLocation] = useLocation();
  const { user, hasPermission } = useAuth();
  const id = params?.id ? parseInt(params.id) : undefined;

  const advance = useLiveQuery(() => id ? db.advances.get(id) : undefined, [id]);
  const settlements = useLiveQuery(() => id ? db.advanceSettlements.where('advanceId').equals(id).sortBy('settlementDate') : [], [id]);
  const notes = useLiveQuery(() => id ? db.notes.where({ recordType: 'advance', recordId: id }).sortBy('createdAt') : [], [id]);

  const [showSettle, setShowSettle] = useState(false);
  const [billsSubmitted, setBillsSubmitted] = useState('');
  const [cashReturned, setCashReturned] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [noteText, setNoteText] = useState('');

  if (!advance) return <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>;

  const handleApprove = async () => {
    await db.advances.update(id!, { status: 'approved', approvedBy: user!.id, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await logAudit({ username: user!.username, userId: user!.id, action: 'approve', module: 'advance', recordId: id!, recordCode: advance.advanceCode });
    toast.success('Advance approved');
  };

  const handleRelease = async () => {
    await db.advances.update(id!, { status: 'cash_released', updatedAt: new Date().toISOString() });
    await logAudit({ username: user!.username, userId: user!.id, action: 'release_cash', module: 'advance', recordId: id!, recordCode: advance.advanceCode });
    toast.success('Cash released');
  };

  const handleSettle = async () => {
    const bills = parseFloat(billsSubmitted) || 0;
    const returned = parseFloat(cashReturned) || 0;
    if (bills + returned === 0) { toast.error('Enter bills submitted or cash returned'); return; }

    const now = new Date().toISOString();
    await db.advanceSettlements.add({
      advanceId: id!,
      settlementDate: new Date().toISOString().slice(0, 10),
      billsSubmitted: bills,
      cashReturned: returned,
      notes: settleNote || undefined,
      settledBy: user!.id!,
      settledByName: user!.displayName,
      createdAt: now,
    });

    const newSpent = advance.amountSpent + bills;
    const newReturned = advance.amountReturned + returned;
    const newOutstanding = advance.amountGiven - newSpent - newReturned;
    const newStatus: AdvanceStatus = newOutstanding <= 0 ? 'fully_settled' : 'partially_settled';

    await db.advances.update(id!, { amountSpent: newSpent, amountReturned: newReturned, outstandingAmount: Math.max(0, newOutstanding), status: newStatus, updatedAt: now });
    await logAudit({ username: user!.username, userId: user!.id, action: 'settle', module: 'advance', recordId: id!, recordCode: advance.advanceCode });

    setBillsSubmitted(''); setCashReturned(''); setSettleNote(''); setShowSettle(false);
    toast.success('Settlement recorded');
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await db.notes.add({
      recordType: 'advance',
      recordId: id!,
      comment: noteText.trim(),
      createdBy: user!.id!,
      createdByName: user!.displayName,
      createdAt: new Date().toISOString(),
    });
    setNoteText('');
    toast.success('Note added');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/advances"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{advance.advanceCode}</h2>
            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[advance.status]}`}>{STATUS_LABELS[advance.status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{advance.personName} · {formatDateBD(advance.date)}</p>
        </div>
        <div className="flex gap-2">
          {advance.status === 'draft' && hasPermission('advance:approve') && (
            <Button size="sm" onClick={handleApprove} variant="outline">Approve</Button>
          )}
          {advance.status === 'approved' && hasPermission('advance:settle') && (
            <Button size="sm" onClick={handleRelease}>Release Cash</Button>
          )}
          {(advance.status === 'cash_released' || advance.status === 'partially_settled') && hasPermission('advance:settle') && (
            <Button size="sm" onClick={() => setShowSettle(true)} className="gap-1.5">
              <Plus className="size-3.5" /> Add Settlement
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm">Advance Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Purpose:</span> <span className="font-medium ml-1">{advance.purpose}</span></div>
            <div><span className="text-muted-foreground">Designation:</span> <span className="font-medium ml-1">{advance.designation || '—'}</span></div>
            <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium ml-1 capitalize">{advance.paymentMethod.replace('_', ' ')}</span></div>
            <div><span className="text-muted-foreground">Voucher:</span> <span className="font-mono font-medium ml-1">{advance.voucherNumber || '—'}</span></div>
          </div>
          {advance.notes && <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{advance.notes}</p>}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm">Settlement Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold">{formatCurrencyBDT(advance.amountGiven)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Given</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-rose-600">{formatCurrencyBDT(advance.amountSpent)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Bills Submitted</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-emerald-600">{formatCurrencyBDT(advance.amountReturned)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Returned</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${advance.outstandingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrencyBDT(advance.outstandingAmount)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Outstanding</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlement entries */}
      {(settlements?.length ?? 0) > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm">Settlement Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements?.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{formatDateBD(s.settlementDate)}</TableCell>
                    <TableCell className="text-right text-sm text-rose-600">{formatCurrencyBDT(s.billsSubmitted)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600">{formatCurrencyBDT(s.cashReturned)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Settlement Form */}
      {showSettle && (
        <Card className="shadow-sm border-blue-200">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm">Record Settlement</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bills Submitted (৳)</Label>
                <Input type="number" step="0.01" value={billsSubmitted} onChange={e => setBillsSubmitted(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cash Returned (৳)</Label>
                <Input type="number" step="0.01" value={cashReturned} onChange={e => setCashReturned(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            {billsSubmitted || cashReturned ? (
              <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                Remaining after settlement: {formatCurrencyBDT(Math.max(0, advance.outstandingAmount - (parseFloat(billsSubmitted)||0) - (parseFloat(cashReturned)||0)))}
              </div>
            ) : null}
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={settleNote} onChange={e => setSettleNote(e.target.value)} placeholder="Optional notes..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowSettle(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSettle} className="gap-1.5">
                <CheckCircle className="size-3.5" /> Save Settlement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes timeline */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm">Notes Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {notes?.map(n => (
            <div key={n.id} className="border-l-2 border-primary/20 pl-3 py-1">
              <p className="text-sm">{n.comment}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.createdByName} · {new Date(n.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          ))}
          {notes?.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
          <div className="flex gap-2 pt-2 border-t">
            <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." className="h-8 text-sm" onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }} />
            <Button size="sm" onClick={handleAddNote} className="h-8">Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
