import { useEffect, useState } from 'react';
import { PageShell } from './SiteChrome';
import TrialBanner from './TrialBanner';
import './payment.css';

// DESIGN ONLY: price and trial length are placeholders. Nothing charges and nothing is wired.
export default function PaymentGate({ go }) {
  const [out, setOut] = useState(false);
  const [method, setMethod] = useState(null);
  const close = () => { setOut(true); setTimeout(() => go('learner-signup'), 260); };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const item = (i) => ({ className: 'pg-item', style: { '--i': i } });
  return (
    <PageShell go={go} active="site-learning">
      <div style={{ minHeight: '60vh' }} />
      <div className={'pg-backdrop' + (out ? ' pg-out' : '')} onClick={close}>
        <div className="pg-modal" role="dialog" aria-modal="true" aria-label="Payment" onClick={(e) => e.stopPropagation()}>
          <div className="pg-grab" />
          <button type="button" className="pg-x" aria-label="Close" onClick={close}>×</button>
          <div {...item(0)}><TrialBanner /></div>
          <h2 className="pg-h pg-item" style={{ '--i': 1 }}>Keep learning after your trial</h2>
          <p className="pg-sub pg-item" style={{ '--i': 2 }}>Choose how you would like to pay.</p>
          <div {...item(3)}>
            <div className="pg-price">
              <div className="pg-amt">KES [price] / month</div>
              <div className="pg-sub" style={{ margin: 0 }}>Placeholder price. To be decided.</div>
            </div>
          </div>
          <div {...item(4)}>
            <button type="button" className={'pg-m' + (method === 'mpesa' ? ' on' : '')} onClick={() => setMethod('mpesa')}><span className="pg-dot" />M-Pesa</button>
            <button type="button" className={'pg-m' + (method === 'card' ? ' on' : '')} onClick={() => setMethod('card')}><span className="pg-dot" />Card</button>
          </div>
          <div {...item(5)}>
            <button type="button" className="pg-pay" disabled>Pay (not available yet)</button>
            <p className="pg-note">Payments are not available yet. This screen is a design preview.</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
