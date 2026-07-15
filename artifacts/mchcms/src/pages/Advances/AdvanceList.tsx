import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CreditCard } from 'lucide-react';
import { Link } from 'wouter';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { useAuth } from '@/contexts/AuthContext';
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
  draft:             'Draft',
  pending:           'Pending',
  approved:          'Approved',
  cash_released:     'Cash Released',
  partially_settled: 'Partially Settled',
  fully_settled:     'Fully Settled',
  cancelled:         'Cancelled',
};

export function AdvanceList() {
  const { hasPermission } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const advances = useLiveQuery(
    () => db.advances.filter(a => !a.isDeleted).reverse().sortBy('date'),
    []
  );

  const filtered = advances?.filter(a => filterStatus === 'all' || a.status === filterStatus);

  const totalOutstanding = filtered?.reduce((s, a) => {
    if (!['fully_settled', 'cancelled'].includes(a.status)) return s + a.outstandingAmount;
    return s;
  }, 0) ?? 0;

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Advances</h2>
        {hasPermission('advance:create') && (
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/advances/new"><Plus className="size-3.5" /> New Advance</Link>
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Advances</span>
            <span className="font-semibold text-sm">{advances?.length ?? 0}</span>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active</span>
            <span className="font-semibold text-sm text-amber-600">
              {advances?.filter(a => !['fully_settled','cancelled'].includes(a.status)).length ?? 0}
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Outstanding</span>
            <span className="font-semibold text-sm text-rose-600">{formatCurrencyBDT(totalOutstanding)}</span>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="p-3 border-b flex flex-row items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered?.length ?? 0} records</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">Given</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered === undefined ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                    <CreditCard className="size-6 opacity-20 mx-auto mb-2" />
                    No advances found
                  </TableCell>
                </TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.advanceCode}</TableCell>
                  <TableCell className="text-sm">{formatDateBD(a.date)}</TableCell>
                  <TableCell className="text-sm font-medium">{a.personName}</TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate" title={a.purpose}>{a.purpose}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatCurrencyBDT(a.amountGiven)}</TableCell>
                  <TableCell className={`text-right text-sm font-semibold ${a.outstandingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrencyBDT(a.outstandingAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                      <Link href={`/advances/${a.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
