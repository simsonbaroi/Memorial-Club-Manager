import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { db, generateDonationCode, validateReceiptNumber } from '@/db';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

const donationSchema = z.object({
  isAnonymous: z.boolean().default(false),
  donorName: z.string().min(1, "Donor name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  purpose: z.string().optional(),
  receiptNumber: z.string().min(1, "Receipt number is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  notes: z.string().optional(),
});

export function DonationForm() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [receiptStatus, setReceiptStatus] = useState<{valid: boolean; message: string; status?: string} | null>(null);

  const form = useForm<z.infer<typeof donationSchema>>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      isAnonymous: false,
      donorName: '',
      phone: '',
      address: '',
      purpose: '',
      receiptNumber: '',
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      notes: '',
    },
  });

  const isAnonymous = form.watch('isAnonymous');

  const handleReceiptBlur = async () => {
    const rn = form.getValues('receiptNumber');
    if (!rn) return;
    const res = await validateReceiptNumber(rn);
    setReceiptStatus(res);
  };

  const onSubmit = async (data: z.infer<typeof donationSchema>) => {
    if (receiptStatus && !receiptStatus.valid) {
      toast.error('Invalid receipt number');
      return;
    }

    try {
      const code = await generateDonationCode();
      const now = new Date().toISOString();
      
      const newDonation = {
        donationCode: code,
        donorName: data.isAnonymous ? 'Anonymous' : data.donorName,
        phone: data.isAnonymous ? undefined : data.phone,
        address: data.isAnonymous ? undefined : data.address,
        purpose: data.purpose,
        amount: data.amount,
        receiptNumber: data.receiptNumber,
        date: data.date,
        notes: data.notes,
        isAnonymous: data.isAnonymous,
        status: 'pending' as const,
        createdBy: user!.id,
        isDeleted: false,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      const id = await db.donations.add(newDonation);

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
            usedForType: 'donation'
          });
          await db.receiptBooks.update(book.id!, { remainingCount: book.remainingCount - 1 });
        }
      }

      await logAudit({
        username: user!.username,
        userId: user!.id,
        action: 'create',
        module: 'donation',
        recordId: id as number,
        recordCode: code,
        newValue: newDonation
      });

      toast.success('Donation recorded successfully');
      setLocation('/donations');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save donation record');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/donations">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Record Donation</h2>
          <p className="text-muted-foreground text-sm mt-1">Add a new donor contribution to the system.</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-amber-500">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-lg">Donation Details</CardTitle>
          <CardDescription>All fields marked with an asterisk (*) are required.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="isAnonymous"
                  render={({ field }) => (
                    <FormItem className="col-span-full flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Anonymous Donation</FormLabel>
                        <FormDescription>
                          Check this if the donor wishes to remain anonymous. Name will not be displayed in reports.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="donorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Donor Name {isAnonymous ? '' : '*'}</FormLabel>
                      <FormControl>
                        <Input placeholder="Name" {...field} disabled={isAnonymous} value={isAnonymous ? 'Anonymous' : field.value} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact number" {...field} disabled={isAnonymous} />
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Amount (৳) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="text-2xl font-bold text-amber-600 h-14" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Purpose / Occasion</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Annual Tournament, Zakat, General Fund" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Donor's full address" {...field} disabled={isAnonymous} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 flex gap-4 justify-end border-t">
                <Button type="button" variant="outline" onClick={() => setLocation('/donations')}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2 shadow-sm bg-amber-600 hover:bg-amber-700 text-white" disabled={!receiptStatus?.valid && !!form.getValues('receiptNumber')}>
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