import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Link } from 'wouter';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, FileText, CheckCircle2, Lock, Ban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function ExpenseList() {
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  
  const expenses = useLiveQuery(() => 
    db.expenses
      .filter(e => !e.isDeleted)
      .reverse()
      .sortBy('date')
  );

  const filteredExpenses = expenses?.filter(e => 
    e.expenseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'locked': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>;
      case 'draft': return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Draft</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200"><Ban className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expense Records</h2>
          <p className="text-muted-foreground mt-1">Manage all club expenses and payments.</p>
        </div>
        {hasPermission('expense:create') && (
          <Button asChild className="gap-2 shadow-sm">
            <Link href="/expense/new">
              <Plus className="size-4" />
              Add Expense
            </Link>
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by code, voucher, payee..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 shadow-none h-8 p-0"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Voucher</TableHead>
                <TableHead className="font-semibold">Payee</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses === undefined ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="animate-pulse flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-32 bg-muted rounded"></div>
                      <div className="h-3 w-24 bg-muted rounded"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <FileText className="size-12 opacity-20 mx-auto mb-3" />
                    No expense records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-medium">{formatDateBD(expense.date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{expense.voucherNumber}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{expense.expenseCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-sm font-medium truncate">{expense.payee}</span>
                        <span className="text-[11px] text-muted-foreground truncate">{expense.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">{expense.category.replace(/_/g, ' ')}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrencyBDT(expense.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(expense.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}