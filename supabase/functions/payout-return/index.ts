// Public bounce page for Stripe Connect onboarding.
//
// Stripe requires account-link return/refresh URLs to be https, but the app
// listens for its own deep link (sequins://payouts/return). Stripe sends the
// user here; we immediately redirect into the app.
//
// No auth needed (it only redirects), and it only redirects to the Sequins
// app's own schemes, so it can't be used as an open redirect.
// Deployed with verify_jwt = false.

const ALLOWED = /^(sequins|exp|exps):\/\//;
const DEFAULT_TARGET = 'sequins://payouts/return';

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const to = url.searchParams.get('to') ?? '';
  const target = ALLOWED.test(to) ? to : DEFAULT_TARGET;

  // A 302 plus an HTML fallback: some in-app browsers need the tap-through.
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">` +
    `<title>Returning to Sequins</title>` +
    `<body style="font-family:-apple-system,sans-serif;text-align:center;padding:40px;background:#1f2129;color:#fff">` +
    `<p>Returning you to Sequins…</p><p><a style="color:#5fd3c6" href="${target.replace(/"/g, '')}">Tap here if nothing happens</a></p></body>`;

  return new Response(html, {
    status: 302,
    headers: { Location: target, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
});
