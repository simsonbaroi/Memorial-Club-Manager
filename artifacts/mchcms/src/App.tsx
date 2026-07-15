import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppLayout } from '@/components/layout/AppLayout';

import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { IncomeList } from '@/pages/Income/IncomeList';
import { IncomeForm } from '@/pages/Income/IncomeForm';
import { ExpenseList } from '@/pages/Expense/ExpenseList';
import { ExpenseForm } from '@/pages/Expense/ExpenseForm';
import { DonationList } from '@/pages/Donation/DonationList';
import { DonationForm } from '@/pages/Donation/DonationForm';
import { ReceiptBooks } from '@/pages/Books/ReceiptBooks';
import { VoucherBooks } from '@/pages/Books/VoucherBooks';
import { Reports } from '@/pages/Reports/Reports';
import { Committee } from '@/pages/Committee/Committee';
import { EventList } from '@/pages/Events/EventList';
import { EventForm } from '@/pages/Events/EventForm';
import { AuditLog } from '@/pages/Audit/AuditLog';
import { Settings } from '@/pages/Settings/Settings';

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground text-lg">Page not found</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Switch>
                <Route path="/login" component={Login} />
                <Route>
                  <AppLayout>
                    <Switch>
                      <Route path="/" component={Dashboard} />
                      <Route path="/income" component={IncomeList} />
                      <Route path="/income/new" component={IncomeForm} />
                      <Route path="/expense" component={ExpenseList} />
                      <Route path="/expense/new" component={ExpenseForm} />
                      <Route path="/donations" component={DonationList} />
                      <Route path="/donations/new" component={DonationForm} />
                      <Route path="/receipt-books" component={ReceiptBooks} />
                      <Route path="/voucher-books" component={VoucherBooks} />
                      <Route path="/reports" component={Reports} />
                      <Route path="/committee" component={Committee} />
                      <Route path="/events" component={EventList} />
                      <Route path="/events/new" component={EventForm} />
                      <Route path="/audit" component={AuditLog} />
                      <Route path="/settings" component={Settings} />
                      <Route component={NotFound} />
                    </Switch>
                  </AppLayout>
                </Route>
              </Switch>
            </WouterRouter>
            <SonnerToaster position="top-right" expand={false} richColors />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;