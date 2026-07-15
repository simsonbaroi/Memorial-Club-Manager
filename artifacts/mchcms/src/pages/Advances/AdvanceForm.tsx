import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { db, generateAdvanceCode } from '@/db';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const schema = z.object({
  date: z.string().min(1),
  personName: z.string().min(1, 'Person name is required'),
  designation: z.string().optional(),
  eventId: z.string().optional(),
  purpose: z.string().min(1, 'Purpose is required'),
  amountGiven: z.coerce.number().min(1, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'bank', 'mobile_banking']),
  voucherNumber: z.string().optional(),
  notes: z.string().optional(),
});

export function AdvanceForm() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const events = useLiveQuery(() => db.events.filter(e => e.status !== 'cancelled' && e.status !== 'archived').toArray());

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      personName: '', designation: '', eventId: '', purpose: '',
      amountGiven: 0, paymentMethod: 'cash', voucherNumber: '', notes: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const code = await generateAdvanceCode();
      const now = new Date().toISOString();
      const eventId = data.eventId ? parseInt(data.eventId) : undefined;

      const rec = {
        advanceCode: code,
        voucherNumber: data.voucherNumber || undefined,
        date: data.date,
        personName: data.personName,
        designation: data.designation || undefined,
        eventId,
        purpose: data.purpose,
        amountGiven: data.amountGiven,
        paymentMethod: data.paymentMethod,
        status: 'draft' as const,
        amountSpent: 0,
        amountReturned: 0,
        outstandingAmount: data.amountGiven,
        notes: data.notes || undefined,
        createdBy: user!.id!,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };

      const id = await db.advances.add(rec);
      await logAudit({ username: user!.username, userId: user!.id, action: 'create', module: 'advance', recordId: id as number, recordCode: code, newValue: rec });

      toast.success('Advance created');
      setLocation(`/advances/${id}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save advance');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/advances"><ArrowLeft className="size-4" /></Link>
        </Button>
        <h2 className="text-xl font-bold">New Advance</h2>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b py-3 px-4">
          <CardTitle className="text-sm font-semibold">Advance Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="personName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person Name *</FormLabel>
                    <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="designation" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl><Input placeholder="e.g. Treasurer" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="amountGiven" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (৳) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="voucherNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voucher Number</FormLabel>
                    <FormControl><Input placeholder="PV-000XXX" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="eventId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Event</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {events?.map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Purpose *</FormLabel>
                    <FormControl><Input placeholder="What is this advance for?" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="Additional notes..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation('/advances')}>Cancel</Button>
                <Button type="submit" className="gap-2"><Save className="size-3.5" /> Save Advance</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
