// lib/invoiceStore.ts
// Generates an HTML invoice for a Sequins event and prints/shares it as PDF.
// Uses expo-print for on-device PDF rendering and expo-sharing to share.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { type EventAnalytics } from './analyticsStore';
import { type EventRecord } from './eventsStore';
import { type EventTalentInvite } from './eventRolesStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceLineItem = {
  label: string;
  amount: number;  // positive = revenue, negative = expense
  note?: string;
};

// ─── HTML template ────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function dollars(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `–$${formatted}` : `$${formatted}`;
}

function buildHtml(
  event: EventRecord,
  analytics: EventAnalytics,
  confirmedTalent: EventTalentInvite[],
): string {
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const invoiceNumber = `SEQ-${event.id.slice(0, 8).toUpperCase()}`;

  // Staff line items
  const staffRows = confirmedTalent
    .filter(t => t.status === 'accepted' && t.payAgreed)
    .map(t => `
      <tr class="staff-row">
        <td>${t.stageName ?? 'Staff Member'}</td>
        <td class="role">${t.customRoleName || t.roleName}</td>
        <td class="amount">${dollars(-(t.payAgreed ?? 0))}</td>
      </tr>
    `).join('');

  const netColor = analytics.netEstimate >= 0 ? '#34D399' : '#F87171';
  const netLabel = analytics.netEstimate >= 0 ? 'Net Profit' : 'Net Loss';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Event Invoice — ${event.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
      color: #111827;
      padding: 40px;
      font-size: 14px;
      line-height: 1.5;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 2px solid #0D2B45;
    }
    .brand {
      font-size: 28px;
      font-weight: 900;
      color: #0D2B45;
      letter-spacing: -0.5px;
    }
    .brand span { color: #6EE7D2; }
    .invoice-meta { text-align: right; }
    .invoice-meta .invoice-num {
      font-size: 11px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .invoice-meta .invoice-date {
      font-size: 13px;
      color: #374151;
      margin-top: 4px;
    }

    /* ── Event info ── */
    .event-card {
      background: #F3F4F6;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 32px;
    }
    .event-title {
      font-size: 20px;
      font-weight: 900;
      color: #0D2B45;
      margin-bottom: 8px;
    }
    .event-detail {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }
    .event-detail div { color: #374151; font-size: 13px; }
    .event-detail .label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 700; }

    /* ── Section headings ── */
    h2 {
      font-size: 11px;
      font-weight: 800;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 28px 0 10px;
    }

    /* ── Summary table ── */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 0 12px 8px;
      text-align: left;
    }
    th.amount { text-align: right; }
    td {
      padding: 10px 12px;
      border-top: 1px solid #E5E7EB;
      font-size: 14px;
      color: #111827;
      vertical-align: top;
    }
    td.amount { text-align: right; font-weight: 700; font-feature-settings: "tnum"; }
    td.role { color: #6B7280; font-size: 12px; }

    .revenue-row td { background: #F0FDF9; }
    .revenue-row td.amount { color: #059669; }
    .staff-row td.amount { color: #DC2626; }

    /* ── Totals ── */
    .totals {
      margin-top: 24px;
      border-top: 2px solid #0D2B45;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
    }
    .total-row.gross { color: #059669; font-weight: 700; }
    .total-row.cost  { color: #DC2626; font-weight: 700; }
    .total-row.net {
      background: #F3F4F6;
      border-radius: 8px;
      margin-top: 6px;
      padding: 14px 16px;
      font-size: 18px;
      font-weight: 900;
    }
    .total-row.net .net-label { color: #374151; }
    .total-row.net .net-amount { color: ${netColor}; }

    /* ── Staff section ── */
    .staff-section { margin-top: 12px; }

    /* ── Empty state ── */
    .empty { color: #9CA3AF; font-style: italic; padding: 12px; text-align: center; border-top: 1px solid #E5E7EB; }

    /* ── Footer ── */
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #9CA3AF;
      font-size: 11px;
    }
    .footer strong { color: #6B7280; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">✦ Se<span>quin</span>s</div>
      <div style="color:#6B7280;font-size:12px;margin-top:4px;">Event Summary Invoice</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-num">${invoiceNumber}</div>
      <div class="invoice-date">Generated ${invoiceDate}</div>
    </div>
  </div>

  <!-- Event info -->
  <div class="event-card">
    <div class="event-title">${event.title}</div>
    <div class="event-detail">
      <div>
        <div class="label">Date</div>
        <div>${formatDate(event.datetimeStart)}</div>
      </div>
      ${event.venue?.name ? `
      <div>
        <div class="label">Venue</div>
        <div>${event.venue.name}${event.venue.city ? `, ${event.venue.city}` : ''}</div>
      </div>` : ''}
      ${event.hostName ? `
      <div>
        <div class="label">Host</div>
        <div>${event.hostName}</div>
      </div>` : ''}
      <div>
        <div class="label">Capacity</div>
        <div>${event.capacity ? event.capacity : 'Open'}</div>
      </div>
    </div>
  </div>

  <!-- Ticket Revenue -->
  <h2>Ticket Revenue</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Detail</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr class="revenue-row">
        <td>Ticket Sales</td>
        <td class="role">${analytics.ticketsSold} ticket${analytics.ticketsSold !== 1 ? 's' : ''} sold · ${analytics.checkedIn} checked in</td>
        <td class="amount">${dollars(analytics.grossRevenue)}</td>
      </tr>
      ${analytics.ticketsSold === 0 ? '<tr><td colspan="3" class="empty">No ticket sales recorded yet.</td></tr>' : ''}
    </tbody>
  </table>

  <!-- Staff Costs -->
  <h2>Staff Costs</h2>
  <table class="staff-section">
    <thead>
      <tr>
        <th>Performer / Staff</th>
        <th>Role</th>
        <th class="amount">Pay Agreed</th>
      </tr>
    </thead>
    <tbody>
      ${staffRows || '<tr><td colspan="3" class="empty">No confirmed staff with pay agreements.</td></tr>'}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="total-row gross">
      <span>Gross Revenue</span>
      <span>${dollars(analytics.grossRevenue)}</span>
    </div>
    <div class="total-row cost">
      <span>Total Staff Cost</span>
      <span>${dollars(-analytics.staffCost)}</span>
    </div>
    <div class="total-row net">
      <span class="net-label">${netLabel}</span>
      <span class="net-amount">${dollars(analytics.netEstimate)}</span>
    </div>
  </div>

  <!-- Staff count -->
  <div style="margin-top:16px; color:#6B7280; font-size:12px; padding: 0 12px;">
    ${analytics.staffConfirmed} confirmed · ${analytics.staffPending} pending ·
    estimate based on agreed pay, not including venue or other expenses.
  </div>

  <!-- Footer -->
  <div class="footer">
    <strong>Sequins</strong> · Event management for the drag &amp; nightlife community<br/>
    This invoice is an automated summary generated by Sequins and is not a legal financial document.
  </div>

</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate and share a PDF invoice for an event.
 * Prints HTML to a PDF using expo-print, then opens the system share sheet.
 */
export async function generateAndShareInvoice(
  event: EventRecord,
  analytics: EventAnalytics,
  confirmedTalent: EventTalentInvite[],
): Promise<void> {
  const html = buildHtml(event, analytics, confirmedTalent);

  // Render HTML to PDF (expo-print)
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Share via system share sheet (AirDrop, Files, Messages, etc.)
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    // Fallback: open the print dialog directly
    await Print.printAsync({ uri });
    return;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Invoice — ${event.title}`,
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Open the system print dialog for the invoice (no file saved).
 */
export async function printInvoice(
  event: EventRecord,
  analytics: EventAnalytics,
  confirmedTalent: EventTalentInvite[],
): Promise<void> {
  const html = buildHtml(event, analytics, confirmedTalent);
  await Print.printAsync({ html });
}
