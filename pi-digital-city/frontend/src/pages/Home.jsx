import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatLad } from '../lib/constants';
import { isPiBrowser } from '../lib/piSdk';
import Spinner from '../components/UI/Spinner';
import StatCard from '../components/UI/StatCard';

export default function Home() {
  const { user, login, loading, error } = useAuth();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.settings().then((res) => setSettings(res)).catch(() => {});
  }, []);

  async function handleLogin() {
    setBusy(true);
    await login();
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <section className="card p-6 text-center relative overflow-hidden animate-fadeUp">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-2xl" />
        <h1 className="font-display text-2xl font-bold mb-1">Pi Digital City</h1>
        <p className="text-white/50 text-sm mb-5">
          A virtual city of exactly 1,000,000 land NFTs. No more will ever be created.
        </p>

        {user ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white/70">
              Welcome back, <span className="text-primary">@{user.piUsername}</span>
            </p>
            <div className="flex gap-2 justify-center mt-2">
              <Link to="/map" className="btn-primary px-5 py-2.5">Explore City</Link>
              <Link to="/buy-lad" className="btn-secondary px-5 py-2.5">Buy LAD</Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleLogin} disabled={busy || loading} className="btn-primary px-6 py-3 flex items-center gap-2">
              {(busy || loading) && <Spinner size={16} />}
              Sign in with Pi
            </button>
            {!isPiBrowser() && (
              <p className="text-xs text-white/40 max-w-xs">
                Open this app inside Pi Browser to sign in and use Pi payments.
              </p>
            )}
            {error && <p className="text-xs text-red-400 max-w-xs">{error}</p>}
          </div>
        )}
      </section>

      {settings && (
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Land Price" value={`${formatLad(settings.settings.landPriceLad)} LAD`} sub="≈ 5 Pi" />
          <StatCard label="Exchange Rate" value="1 Pi = 0.1 LAD" sub="10 Pi = 1 LAD" />
          <StatCard label="Total Supply" value="1,000,000" sub="Fixed forever" accent />
          <StatCard label="Marketplace Fee" value={`${(settings.settings.marketplaceFeePercent * 100).toFixed(0)}%`} sub="On resales" />
        </section>
      )}

      <section className="card p-4">
        <h2 className="font-display font-semibold mb-3">How it works</h2>
        <ol className="text-sm text-white/60 space-y-2 list-decimal list-inside">
          <li>Buy LAD with Pi - the in-game currency for everything in the city.</li>
          <li>Claim a plot of land anywhere on the 1,000×1,000 grid.</li>
          <li>Develop it from an Empty Plot up to a Mega Tower for passive daily rewards.</li>
          <li>Customize, decorate, list it on the marketplace, or just hold and earn.</li>
        </ol>
      </section>
    </div>
  );
}
