import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { db, generateExpenseCode, validateVoucherNumber, type ExpenseCategory } from '@/db';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const expenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  voucherNumber: z.string().min(1, "Voucher number is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  payee: z.string().min(1, "Payee is required"),
  description: z.string().min(1, "Description is required"),
  remarks: z.string().optional(),
});

export function ExpenseForm() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [voucherStatus, setVoucherStatus] = useState<{valid: boolean; message: string; status?: string} | null>(null);
  
  const categories = useLiveQuery(() => db.categories.filter(c => c.type === 'expense' && c.isActive).toArray());

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: '',
      voucherNumber: '',
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      payee: '',
      description: '',
      remarks: '',
    },
  });

  const handleVoucherBlur = async () => {
    const vn = form.getValues('voucherNumber');
    if (!vn) return;
    const res = await validateVoucherNumber(vn);
    setVoucherStatus(res);
  };

  const onSubmit = async (data: z.infer<typeof expenseSchema>) => {
    if (voucherStatus && !voucherStatus.valid) {
      toast.error('Invalid voucher number');
      return;
    }

    try {
      const code = await generateExpenseCode();
      const now = new Date().toISOString();
      
      const newExpense = {
        expenseCode: code,
        voucherNumber: data.voucherNumber,
        date: data.date,
        entryDate: now,
        amount: data.amount,
        description: data.description,
        payee: data.payee,
        category: data.category as ExpenseCategory,
        remarks: data.remarks,
        status: 'pending' as const,
        createdBy: user!.id,
        isDeleted: false,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      const id = await db.expenses.add(newExpense);

      // Mark voucher number as used
      const bookPart = data.voucherNumber.match(/^([A-Z]+)-/);
      if (bookPart) {
        const book = await db.voucherBooks.filter(b => b.prefix === bookPart[1] && b.status === 'active').first();
        if (book) {
          const numVal = parseInt(data.voucherNumber.split('-')[1], 10);
          await db.voucherNumbers.add({
            bookId: book.id!,
            number: data.voucherNumber,
            numericValue: numVal,
            status: 'used',
            usedAt: now,
            usedBy: user!.id,
            usedForId: id as number,
          });
          await db.voucherBooks.update(book.id!, { remainingCount: book.remainingCount - 1 });
        }
      }

      await logAudit({
        username: user!.username,
        userId: user!.id,
        action: 'create',
        module: 'expense',
        recordId: id as number,
        recordCode: code,
        newValue: newExpense
      });

      toast.success('Expense recorded successfully');
      setLocation('/expense');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save expense record');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/expense">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Record Expense</h2>
          <p className="text-muted-foreground text-sm mt-1">Add a new expense or payment to the system.</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-rose-500">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-lg">Expense Details</CardTitle>
          <CardDescription>All fields marked with an asterisk (*) are required.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={c.name.toLowerCase().replace(/ /g, '_')}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="voucherNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voucher Number *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="e.g. PV-000580" 
                            {...field} 
                            onBlur={(e) => {
                              field.onBlur();
                              handleVoucherBlur();
                            }} 
                            className={voucherStatus ? (voucherStatus.valid ? 'border-emerald-500' : 'border-rose-500') : ''}
                          />
                          {voucherStatus && (
                            <div className="absolute right-3 top-2.5">
                              {voucherStatus.valid ? <CheckCircle2 className="size-4 text-emerald-500" /> : <AlertCircle className="size-4 text-rose-500" />}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {voucherStatus && !voucherStatus.valid && (
                        <p className="text-xs text-rose-500 mt-1 font-medium">{voucherStatus.message}</p>
                      )}
                      <FormDescription>Must match an active voucher book</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid To / Payee *</FormLabel>
                      <FormControl>
                        <Input placeholder="Name of person or vendor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (৳) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="text-xl font-bold text-rose-600" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the expense" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Any additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex gap-4 justify-end border-t">
                <Button type="button" variant="outline" onClick={() => setLocation('/expense')}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2 shadow-sm bg-rose-600 hover:bg-rose-700 text-white" disabled={!voucherStatus?.valid && !!form.getValues('voucherNumber')}>
                  <Save className="size-4" />
                  Save Record
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}