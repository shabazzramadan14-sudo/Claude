import React, { useState } from 'react';
import { purchasesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CloseIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

export default function PurchaseModal({ item, itemType, onSuccess, onClose }) {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('confirm'); // confirm | processing | success | error
  const [error, setError] = useState('');

  if (!isLoggedIn) {
    navigate('/auth');
    return null;
  }

  const price = item.pricing?.price;
  const title = item.title;

  const handlePurchase = async () => {
    setStep('processing');
    setError('');
    try {
      // 1. Create purchase intent
      const { data } = await purchasesAPI.purchase({ itemType, itemId: item._id });

      // In production, you'd show Stripe Elements here to collect card details
      // and call stripe.confirmCardPayment(data.clientSecret).
      // For this demo we skip to confirmation directly.

      // 2. Confirm purchase
      await purchasesAPI.confirm(data.purchaseId);

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Purchase failed. Please try again.');
      setStep('error');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', width: '100%', maxWidth: 420,
        boxShadow: 'var(--shadow)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border)'
        }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>
            {step === 'success' ? '🎉 Purchase Complete!' : 'Unlock Content'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
            <CloseIcon />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 'confirm' && (
            <>
              <div style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                padding: 16, marginBottom: 20
              }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  You are purchasing
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>{title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Price</span>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>${price?.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Access</span>
                  <span style={{ color: 'var(--success)' }}>Lifetime</span>
                </div>
              </div>

              <div style={{
                background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
                borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 20,
                fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8
              }}>
                <span>🔒</span>
                <span>Payments are secured by Stripe. Your card details are never stored on our servers.</span>
              </div>

              <button onClick={handlePurchase} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15 }}>
                Pay ${price?.toFixed(2)} with Card
              </button>
              <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                Cancel
              </button>
            </>
          )}

          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Processing payment…</div>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>You now have full access!</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>
                Enjoy the POV experience.
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ color: 'var(--live-red)', marginBottom: 16, fontSize: 14 }}>{error}</div>
              <button onClick={() => setStep('confirm')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
