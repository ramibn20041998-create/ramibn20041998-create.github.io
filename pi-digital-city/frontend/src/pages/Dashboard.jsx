import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatLad } from '../lib/constants';
import StatCard from '../components/UI/StatCard';
import LandCard from '../components/Land/LandCard';
import Spinner from '../components/UI/Spinner';

const TX_LABELS = {
  pi_purchase: 'Bought LAD with Pi',
  land_buy_primary: 'Claimed new land',
  land_buy_market: 'Bought land on marketplace',
  land_sell: 'Sold land',
  land_list: 'Listed land for sale',
  land_unlist: 'Removed listing',
  upgrade: 'Upgraded land',
  claim_reward: 'Claimed rewards',
  decoration_purchase: 'Bought decoration',
};

export default function Dashboard() {
  const { user, login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [lands, setLands] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [landsRes, txRes] = await Promise.all([api.myLands(), api.myTransactions()]);
      setLands(landsRes.lands);
      setTransactions(txRes.transactions);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) {
    return (
      <div className="card p-8 text-center">
        <p className="text-white/60 mb-4">Sign in to view your dashboard</p>
        <button onClick={login} className="btn-primary px-6 py-2.5">Sign in with Pi</button>
      </div>
    );
  }

  const totalPending = lands.reduce((sum, l) => sum + (l.pendingReward || 0), 0);

  async function handleClaimAll() {
    setClaiming(true);
    setMessage(null);
    try {
      const res = await api.claimAllRewards();
      setMessage(res.claimedLad > 0 ? `Claimed ${formatLad(res.claimedLad)} LAD from ${res.landsClaimed} lands!` : 'No rewards to claim yet');
      await Promise.all([refreshUser(), load()]);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-xl font-semibold mb-3">Your Dashboard</h1>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="LAD Balance" value={`${formatLad(user.ladBalance)}`} accent />
          <StatCard label="Pi Spent" value={`${formatLad(user.piSpent, 2)} π`} />
          <StatCard label="Lands Owned" value={lands.length} />
          <StatCard label="Pending Rewards" value={`${formatLad(totalPending)} LAD`} />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold">Daily Rewards</p>
          <p className="text-xs text-white/40">Claimed all-time: {formatLad(user.totalRewardsClaimed)} LAD</p>
        </div>
        <p className="text-xs text-white/50 mb-3">Developed land earns LAD continuously - claim anytime.</p>
        <button
          onClick={handleClaimAll}
          disabled={claiming || totalPending <= 0}
          className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
        >
          {claiming && <Spinner size={16} />} Claim All Rewards
        </button>
        {message && <p className="text-xs text-primary mt-2 text-center">{message}</p>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold">Your Lands</h2>
          <button onClick={() => navigate('/map')} className="text-xs text-primary">+ Claim more</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : lands.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-6">You don't own any land yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {lands.map((land) => (
              <LandCard
                key={land.landId}
                land={land}
                badge={land.pendingReward > 0 ? `+${formatLad(land.pendingReward)} LAD` : undefined}
                onClick={() => navigate(`/land/${land.landId}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-6">No transactions yet.</p>
        ) : (
          <div className="card divide-y divide-white/5">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm">{TX_LABELS[tx.type] || tx.type}</p>
                  <p className="text-xs text-white/40">
                    {tx.createdAt?._seconds ? new Date(tx.createdAt._seconds * 1000).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="text-right">
                  {tx.amountLad !== 0 && (
                    <p className={`text-sm font-semibold ${tx.amountLad > 0 ? 'text-green-400' : 'text-white/70'}`}>
                      {tx.amountLad > 0 ? '+' : ''}
                      {formatLad(tx.amountLad)} LAD
                    </p>
                  )}
                  {tx.amountPi > 0 && <p className="text-xs text-white/40">{formatLad(tx.amountPi, 2)} π</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
