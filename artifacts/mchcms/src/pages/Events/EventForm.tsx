import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { db, generateEventCode, type EventType } from '@/db';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  type: z.string().min(1, "Event type is required"),
  date: z.string().min(1, "Date is required"),
  venue: z.string().optional(),
  budget: z.coerce.number().min(0, "Budget cannot be negative"),
  description: z.string().optional(),
  sponsors: z.string().optional(),
});

export function EventForm() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      type: 'football_tournament',
      date: new Date().toISOString().slice(0, 10),
      venue: '',
      budget: 0,
      description: '',
      sponsors: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof eventSchema>) => {
    try {
      const code = await generateEventCode();
      const now = new Date().toISOString();
      
      const newEvent = {
        eventCode: code,
        name: data.name,
        type: data.type as EventType,
        date: data.date,
        venue: data.venue,
        budget: data.budget,
        description: data.description,
        sponsors: data.sponsors,
        status: 'planned' as const,
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
        createdBy: user!.id,
        createdAt: now,
        updatedAt: now,
      };

      const id = await db.events.add(newEvent);

      await logAudit({
        username: user!.username,
        userId: user!.id,
        action: 'create',
        module: 'event',
        recordId: id as number,
        recordCode: code,
        newValue: newEvent
      });

      toast.success('Event created successfully');
      setLocation('/events');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save event');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/events">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Event</h2>
          <p className="text-muted-foreground text-sm mt-1">Schedule a new club activity or tournament.</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-lg">Event Details</CardTitle>
          <CardDescription>Plan budget and details for the upcoming event.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Event Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Annual Football Tournament 2026" className="text-lg font-medium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="football_tournament">Football Tournament</SelectItem>
                          <SelectItem value="annual_meal">Annual Meal</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="picnic">Picnic</SelectItem>
                          <SelectItem value="seminar">Seminar</SelectItem>
                          <SelectItem value="custom">Other</SelectItem>
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
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Budget (৳)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <FormControl>
                        <Input placeholder="Location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sponsors"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Sponsors (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Names of sponsors or organizations" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Description / Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional details about the event..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 flex gap-4 justify-end border-t">
                <Button type="button" variant="outline" onClick={() => setLocation('/events')}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2 shadow-sm">
                  <Save className="size-4" />
                  Create Event
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}