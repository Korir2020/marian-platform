import { PageShell } from './SiteChrome';
import TrialBanner from './TrialBanner';

const line = '1px solid color-mix(in oklab, var(--learn-deep) 16%, transparent)';
const S = {
  wrap: { maxWidth: 480, margin: '0 auto', padding: '1.25rem 1rem 2rem' },
  h1: { fontFamily: 'Fraunces, serif', fontSize: '1.5rem', margin: '0.25rem 0 0.25rem' },
  sub: { fontSize: '0.8125rem', opacity: 0.8, margin: '0 0 1rem' },
  card: { border: '1.5px solid var(--learn)', borderRadius: 12, padding: '0.875rem', background: 'var(--learn-soft)', marginBottom: '1rem' },
  price: { fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 600 },
  btn: { width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: 10, border: line, background: 'transparent', color: 'inherit', marginBottom: '0.5rem', opacity: 0.7 },
  note: { fontSize: '0.75rem', opacity: 0.7, margin: '0 0 1rem' },
  back: { fontSize: '0.875rem', background: 'none', border: 'none', color: 'var(--learn-deep)', cursor: 'pointer', padding: '0 0.5rem' },
};

// DESIGN ONLY: price and trial length are placeholders. Nothing charges and nothing is wired.
export default function PaymentGate({ go }) {
  return (
    <PageShell go={go} active="site-learning">
      <div style={S.wrap}>
        <TrialBanner />
        <h1 style={S.h1}>Keep learning after your trial</h1>
        <p style={S.sub}>Choose how you would like to pay.</p>
        <div style={S.card}>
          <div style={S.price}>KES [price] / month</div>
          <div style={S.sub}>Placeholder price. To be decided.</div>
        </div>
        <button type="button" style={S.btn} disabled>M-Pesa (coming soon)</button>
        <button type="button" style={S.btn} disabled>Card (coming soon)</button>
        <p style={S.note}>Payments are not available yet. This screen is a design preview.</p>
        <button type="button" style={S.back} onClick={() => go('site-learning')}>Back</button>
      </div>
    </PageShell>
  );
}
