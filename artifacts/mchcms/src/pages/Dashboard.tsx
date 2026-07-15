import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats, type DashboardStats } from '@/db';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { Wallet, TrendingUp, TrendingDown, Heart, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard</h2>
        {stats.pendingApprovals > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 text-sm font-medium gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            {stats.pendingApprovals} Pending Approval{stats.pendingApprovals > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Balance</CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrencyBDT(stats.currentBalance)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Month Income</CardTitle>
            <TrendingUp className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{formatCurrencyBDT(stats.monthlyIncome)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Today: {formatCurrencyBDT(stats.todayIncome)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Month Expense</CardTitle>
            <TrendingDown className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-rose-600">{formatCurrencyBDT(stats.monthlyExpense)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Today: {formatCurrencyBDT(stats.todayExpense)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Donations</CardTitle>
            <Heart className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{formatCurrencyBDT(stats.totalDonations)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Lifetime total</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipt / Voucher remaining */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Receipts remaining</span>
            <span className="text-lg font-bold text-primary">{stats.receiptBooksRemaining}</span>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Vouchers remaining</span>
            <span className="text-lg font-bold text-primary">{stats.voucherBooksRemaining}</span>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
          <Link href="/reports" className="text-xs text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
              <FileText className="size-6 opacity-20" />
              No transactions yet
            </div>
          ) : (
            <div className="divide-y">
              {stats.recentTransactions.map(tx => (
                <div key={`${tx.type}-${tx.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-500' : tx.type === 'expense' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDateBD(tx.date)} · {tx.code}</p>
                  </div>
                  <span className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {tx.type === 'expense' ? '-' : '+'}{formatCurrencyBDT(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
