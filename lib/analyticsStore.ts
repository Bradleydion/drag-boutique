// lib/analyticsStore.ts
// Host-only analytics — pulls ticket sales, check-in, and staff cost for an event.

import { supabase } from './supabase';

export type DailySales = {
  date: string;   // 'Mon May 5'
  count: number;
  revenue: number;
};

export type EventAnalytics = {
  // Tickets
  ticketsSold: number;
  capacity?: number;
  grossRevenue: number;
  checkedIn: number;
  checkInRate: number;   // 0–1
  // Staff
  staffConfirmed: number;
  staffPending: number;
  staffCost: number;
  // Bottom line
  netEstimate: number;   // grossRevenue - staffCost
  // Timeline
  recentSales: DailySales[];
};

export async function loadEventAnalytics(eventId: string): Promise<EventAnalytics> {
  // ── Tickets ──────────────────────────────────────────────────────────────────
  const { data: tickets, error: tErr } = await supabase
    .from('tickets')
    .select('price, checked_in_at, purchased_at')
    .eq('event_id', eventId);

  if (tErr) throw new Error(tErr.message);

  const ticketRows = tickets ?? [];
  const ticketsSold  = ticketRows.length;
  const grossRevenue = ticketRows.reduce((s, t) => s + (Number(t.price) || 0), 0);
  const checkedIn    = ticketRows.filter(t => t.checked_in_at).length;
  const checkInRate  = ticketsSold > 0 ? checkedIn / ticketsSold : 0;

  // ── Daily sales breakdown (last 14 days) ─────────────────────────────────────
  const salesMap: Record<string, { count: number; revenue: number }> = {};
  for (const t of ticketRows) {
    if (!t.purchased_at) continue;
    const label = new Date(t.purchased_at).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    if (!salesMap[label]) salesMap[label] = { count: 0, revenue: 0 };
    salesMap[label].count++;
    salesMap[label].revenue += Number(t.price) || 0;
  }
  const recentSales: DailySales[] = Object.entries(salesMap)
    .map(([date, v]) => ({ date, ...v }))
    .slice(-14);

  // ── Staff ─────────────────────────────────────────────────────────────────────
  const { data: staffRows, error: sErr } = await supabase
    .from('event_talent')
    .select('status, pay_agreed')
    .eq('event_id', eventId);

  if (sErr) throw new Error(sErr.message);

  const staff = staffRows ?? [];
  const staffConfirmed = staff.filter(s => s.status === 'accepted').length;
  const staffPending   = staff.filter(s => s.status === 'invited').length;
  const staffCost      = staff
    .filter(s => s.status === 'accepted' && s.pay_agreed)
    .reduce((sum, s) => sum + (Number(s.pay_agreed) || 0) / 100, 0);

  return {
    ticketsSold,
    grossRevenue,
    checkedIn,
    checkInRate,
    staffConfirmed,
    staffPending,
    staffCost,
    netEstimate: grossRevenue - staffCost,
    recentSales,
  };
}
