import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { db, generateIncomeCode, validateReceiptNumber, type IncomeCategory } from '@/db';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

const incomeSchema = z.object({
  category: z.string().min(1, "Category is required"),
  receiptNumber: z.string().min(1, "Receipt number is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  source: z.string().min(1, "Source is required"),
  description: z.string().min(1, "Description is required"),
  remarks: z.string().optional(),
  // Employee specifics
  employeeCount: z.coerce.number().optional(),
  contributionPerEmployee: z.coerce.number().optional(),
});

export function IncomeForm() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [receiptStatus, setReceiptStatus] = useState<{valid: boolean; message: string; status?: string} | null>(null);
  
  const categories = useLiveQuery(() => db.categories.filter(c => c.type === 'income' && c.isActive).toArray());

  const form = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      category: '',
      receiptNumber: '',
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      source: '',
      description: '',
      remarks: '',
      employeeCount: 310,
      contributionPerEmployee: 10,
    },
  });

  const selectedCategory = form.watch('category');
  const employeeCount = form.watch('employeeCount');
  const contributionRate = form.watch('contributionPerEmployee');

  const handleReceiptBlur = async () => {
    const rn = form.getValues('receiptNumber');
    if (!rn) return;
    const res = await validateReceiptNumber(rn);
    setReceiptStatus(res);
  };

  const calculateAmount = () => {
    if (selectedCategory === 'employee_contribution' && employeeCount && contributionRate) {
      form.setValue('amount', employeeCount * contributionRate);
    }
  };

  const onSubmit = async (data: z.infer<typeof incomeSchema>) => {
    if (receiptStatus && !receiptStatus.valid) {
      toast.error('Invalid receipt number');
      return;
    }

    try {
      const code = await generateIncomeCode();
      const now = new Date().toISOString();
      
      const newIncome = {
        incomeCode: code,
        receiptNumber: data.receiptNumber,
        date: data.date,
        entryDate: now,
        amount: data.amount,
        description: data.description,
        source: data.source,
        category: data.category as IncomeCategory,
        remarks: data.remarks,
        status: 'pending' as const,
        employeeCount: data.employeeCount,
        contributionPerEmployee: data.contributionPerEmployee,
        createdBy: user!.id,
        isDeleted: false,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      const id = await db.incomes.add(newIncome);

      // Mark receipt number as used
      const bookPart = data.receiptNumber.match(/^([A-Z]+)-/);
      if (bookPart) {
        const book = await db.receiptBooks.filter(b => b.prefix === bookPart[1] && b.status === 'active').first();
        if (book) {
          const numVal = parseInt(data.receiptNumber.split('-')[1], 10);
          await db.receiptNumbers.add({
            bookId: book.id!,
            number: data.receiptNumber,
            numericValue: numVal,
            status: 'used',
            usedAt: now,
            usedBy: user!.id,
            usedForId: id as number,
            usedForType: 'income'
          });
          await db.receiptBooks.update(book.id!, { remainingCount: book.remainingCount - 1 });
        }
      }

      await logAudit({
        username: user!.username,
        userId: user!.id,
        action: 'create',
        module: 'income',
        recordId: id as number,
        recordCode: code,
        newValue: newIncome
      });

      toast.success('Income recorded successfully');
      setLocation('/income');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save income record');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/income">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Record Income</h2>
          <p className="text-muted-foreground text-sm mt-1">Add a new income transaction to the system.</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-lg">Income Details</CardTitle>
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
                  name="receiptNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Number *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="e.g. DR-000123" 
                            {...field} 
                            onBlur={(e) => {
                              field.onBlur();
                              handleReceiptBlur();
                            }} 
                            className={receiptStatus ? (receiptStatus.valid ? 'border-emerald-500' : 'border-rose-500') : ''}
                          />
                          {receiptStatus && (
                            <div className="absolute right-3 top-2.5">
                              {receiptStatus.valid ? <CheckCircle2 className="size-4 text-emerald-500" /> : <AlertCircle className="size-4 text-rose-500" />}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {receiptStatus && !receiptStatus.valid && (
                        <p className="text-xs text-rose-500 mt-1 font-medium">{receiptStatus.message}</p>
                      )}
                      <FormDescription>Must match an active receipt book</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source / Received From *</FormLabel>
                      <FormControl>
                        <Input placeholder="Name of person or entity" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedCategory === 'employee_contribution' && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-full mb-1">
                    <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                      Employee Contribution Calculator
                    </h4>
                  </div>
                  <FormField
                    control={form.control}
                    name="employeeCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Employees</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => { field.onChange(e); calculateAmount(); }} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contributionPerEmployee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate per Employee (৳)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => { field.onChange(e); calculateAmount(); }} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (৳) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="text-xl font-bold" {...field} />
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
                      <Input placeholder="Brief description of the income" {...field} />
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
                <Button type="button" variant="outline" onClick={() => setLocation('/income')}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2 shadow-sm" disabled={!receiptStatus?.valid && !!form.getValues('receiptNumber')}>
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