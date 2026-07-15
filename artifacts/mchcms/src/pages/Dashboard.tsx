import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats, type DashboardStats } from '@/db';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { Wallet, TrendingUp, TrendingDown, Calendar, FileText, Heart, Users, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
        </div>
        {stats.pendingApprovals > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1.5 text-sm font-medium gap-2 w-fit shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            {stats.pendingApprovals} Pending Approvals
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrencyBDT(stats.currentBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Total available funds</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Income</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrencyBDT(stats.todayIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              <span className="text-emerald-500 mr-1">Monthly:</span> {formatCurrencyBDT(stats.monthlyIncome)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Expense</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <TrendingDown className="size-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrencyBDT(stats.todayExpense)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              <span className="text-rose-500 mr-1">Monthly:</span> {formatCurrencyBDT(stats.monthlyExpense)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Donations</CardTitle>
            <div className="p-2 bg-accent/20 rounded-lg">
              <Heart className="size-4 text-amber-600 dark:text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrencyBDT(stats.totalDonations)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Lifetime contributions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="col-span-1 lg:col-span-4 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              Income vs Expense
            </CardTitle>
            <CardDescription>Financial flow over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyChart.slice().reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: 'var(--shadow-md)' }}
                    formatter={(value: number) => [formatCurrencyBDT(value), '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 shadow-sm flex flex-col border-border">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Recent Transactions</span>
              <Link href="/reports" className="text-xs text-primary font-normal hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <div className="divide-y divide-border/50">
              {stats.recentTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <FileText className="size-8 opacity-20" />
                  No recent transactions
                </div>
              ) : (
                stats.recentTransactions.map(tx => (
                  <div key={`${tx.type}-${tx.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`p-2.5 rounded-xl shadow-sm ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {tx.type === 'income' ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{tx.description}</p>
                      <div className="flex items-center text-xs text-muted-foreground gap-2 mt-0.5">
                        <span className="font-medium">{formatDateBD(tx.date).split(' ').slice(0,2).join(' ')}</span>
                        <span className="opacity-50">•</span>
                        <span className="uppercase tracking-wider opacity-80">{tx.code}</span>
                      </div>
                    </div>
                    <div className={`text-sm font-bold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrencyBDT(tx.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Monthly Contributions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Employees</span>
                  <span className="font-bold text-foreground">{formatCurrencyBDT(stats.employeeContributionThisMonth)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" style={{width: '75%'}}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Hospital</span>
                  <span className="font-bold text-foreground">{formatCurrencyBDT(stats.hospitalContributionThisMonth)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-accent h-full rounded-full transition-all duration-1000 ease-out" style={{width: '25%'}}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              <div className="flex-1 bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-3xl font-bold text-primary">{stats.receiptBooksRemaining}</span>
                <span className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">Receipts Left</span>
              </div>
              <div className="flex-1 bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-3xl font-bold text-destructive">{stats.voucherBooksRemaining}</span>
                <span className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">Vouchers Left</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            {stats.upcomingEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
                <Calendar className="size-6 opacity-20" />
                No scheduled events
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {stats.upcomingEvents.map(event => (
                  <div key={event.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold text-foreground">{event.name}</span>
                      <span className="text-[10px] font-bold tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">
                        {formatDateBD(event.date).split(' ').slice(0,2).join(' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize">{event.type.replace('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground opacity-50">•</span>
                      <span className="text-xs text-muted-foreground font-medium">Budget: {formatCurrencyBDT(event.budget)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Temporary icon to satisfy missing import
const BookOpen = FileText;