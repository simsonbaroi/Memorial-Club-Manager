import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, MapPin, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { useAuth } from '@/contexts/AuthContext';

export function EventList() {
  const { hasPermission } = useAuth();
  const events = useLiveQuery(() => db.events.reverse().sortBy('date'));

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'planned': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Planned</Badge>;
      case 'ongoing': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Ongoing</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Events</h2>
          <p className="text-muted-foreground mt-1">Manage club events, tournaments, and gatherings.</p>
        </div>
        {hasPermission('event:create') && (
          <Button asChild className="gap-2 shadow-sm">
            <Link href="/events/new">
              <Plus className="size-4" />
              Create Event
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events === undefined ? (
          <div className="col-span-full py-12 text-center text-muted-foreground animate-pulse">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Calendar className="size-12 opacity-20" />
            <p>No events scheduled.</p>
            {hasPermission('event:create') && (
              <Button asChild variant="outline" className="mt-2">
                <Link href="/events/new">Create your first event</Link>
              </Button>
            )}
          </div>
        ) : (
          events.map(event => (
            <Card key={event.id} className="shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <div className="h-2 w-full bg-gradient-to-r from-primary to-primary/50" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="font-mono text-xs uppercase tracking-wider">{event.eventCode}</Badge>
                  {getStatusBadge(event.status)}
                </div>
                <CardTitle className="text-xl line-clamp-1" title={event.name}>{event.name}</CardTitle>
                <CardDescription className="flex flex-col gap-1.5 mt-2">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {formatDateBD(event.date)}
                  </span>
                  {event.venue && (
                    <span className="flex items-center gap-1.5 text-sm">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      <span className="truncate">{event.venue}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm">
                    <Tag className="size-3.5 text-muted-foreground" />
                    <span className="capitalize">{event.type.replace(/_/g, ' ')}</span>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto border-t bg-muted/10 pt-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-semibold text-foreground">{formatCurrencyBDT(event.budget)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Net Balance</span>
                  <span className={`font-bold ${event.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {event.netBalance >= 0 ? '+' : ''}{formatCurrencyBDT(event.netBalance)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs">
                    <Link href={`/events/${event.id}/budget`}>Budget</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs">
                    <Link href={`/events/${event.id}/summary`}>Summary</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}