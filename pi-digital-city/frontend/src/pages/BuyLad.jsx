import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { createPiPayment, isPiBrowser } from '../lib/piSdk';
import { formatLad } from '../lib/constants';
import Spinner from '../components/UI/Spinner';

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

export default function BuyLad() {
  const { user, login, refreshUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [piAmount, setPiAmount] = useState(10);
  const [status, setStatus] = useState('idle'); // idle | pending | success | error
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.settings().then((res) => setSettings(res.settings)).catch(() => {});
  }, []);

  const ladAmount = settings ? Number((piAmount * settings.piToLadRate).toFixed(6)) : piAmount * 0.1;

  async function handleBuy() {
    if (!user) {
      const ok = await login();
      if (!ok) return;
    }
    if (!isPiBrowser()) {
      setStatus('error');
      setMessage('Open this app inside Pi Browser to make a payment.');
      return;
    }
    if (piAmount <= 0) return;

    setStatus('pending');
    setMessage('Waiting for Pi wallet confirmation...');

    createPiPayment(
      {
        amount: piAmount,
        memo: `Buy ${ladAmount} LAD - Pi Digital City`,
        metadata: { type: 'lad_purchase', ladAmount },
      },
      {
        onReadyForServerApproval: async (paymentId) => {
          try {
            await api.approvePayment(paymentId);
          } catch (e) {
            setStatus('error');
            setMessage(e.message);
          }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          try {
            const res = await api.completePayment(paymentId, txid);
            await refreshUser();
            setStatus('success');
            setMessage(`Success! ${formatLad(res.ladCredited)} LAD added to your balance.`);
          } catch (e) {
            setStatus('error');
            setMessage(e.message);
          }
        },
        onCancel: () => {
          setStatus('idle');
          setMessage('Payment cancelled.');
        },
        onError: (error) => {
          setStatus('error');
          setMessage(error?.message || 'Payment failed.');
        },
      }
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-semibold">Buy LAD</h1>

      <div className="card p-5">
        <p className="text-xs text-white/50 mb-1">Exchange rate</p>
        <p className="text-sm mb-4">1 Pi = {settings?.piToLadRate ?? 0.1} LAD &nbsp;·&nbsp; 10 Pi = 1 LAD</p>

        <p className="text-xs text-white/50 mb-2">Amount in Pi</p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => setPiAmount(amt)}
              className={`py-2 rounded-lg text-sm font-medium ${
                piAmount === amt ? 'bg-primary text-bg' : 'bg-bg border border-white/10 text-white/70'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          className="input-field w-full mb-4"
          value={piAmount}
          onChange={(e) => setPiAmount(Number(e.target.value))}
        />

        <div className="card bg-bg p-4 flex items-center justify-between mb-4">
          <span className="text-sm text-white/60">You'll receive</span>
          <span className="font-display text-lg font-semibold text-primary">{formatLad(ladAmount)} LAD</span>
        </div>

        <button
          onClick={handleBuy}
          disabled={status === 'pending'}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {status === 'pending' && <Spinner size={16} />} Pay with Pi
        </button>

        {message && (
          <p className={`text-xs mt-3 text-center ${status === 'error' ? 'text-red-400' : status === 'success' ? 'text-green-400' : 'text-white/50'}`}>
            {message}
          </p>
        )}

        {!isPiBrowser() && (
          <p className="text-xs text-white/30 mt-3 text-center">
            Pi payments only work inside Pi Browser.
          </p>
        )}
      </div>
    </div>
  );
}
