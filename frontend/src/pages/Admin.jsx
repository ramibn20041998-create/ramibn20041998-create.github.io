import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatLad } from '../lib/constants';
import StatCard from '../components/UI/StatCard';
import Spinner from '../components/UI/Spinner';

export default function Admin() {
  const { user, login } = useAuth();
  const [overview, setOverview] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [banUid, setBanUid] = useState('');
  const [listingId, setListingId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [ov, st] = await Promise.all([api.adminOverview(), api.adminGetSettings()]);
      setOverview(ov.overview);
      setSettings(st.settings);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user]);

  if (!user) {
    return (
      <div className="card p-8 text-center">
        <p className="text-white/60 mb-4">Sign in to continue</p>
        <button onClick={login} className="btn-primary px-6 py-2.5">Sign in with Pi</button>
      </div>
    );
  }

  if (!user.isAdmin) {
    return <p className="text-sm text-white/40 text-center py-16">You don't have admin access.</p>;
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  async function saveSettings(partial) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.adminUpdateSettings(partial);
      setSettings(res.settings);
      setMessage('Settings updated');
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBan(banned) {
    if (!banUid) return;
    setMessage(null);
    try {
      banned ? await api.adminBanUser(banUid) : await api.adminUnbanUser(banUid);
      setMessage(`User ${banned ? 'banned' : 'unbanned'}`);
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function handleRemoveListing() {
    if (!listingId) return;
    setMessage(null);
    try {
      await api.adminRemoveListing(listingId, 'Removed by admin');
      setMessage('Listing removed');
    } catch (e) {
      setMessage(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-semibold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Lands Sold" value={overview.totalLandsSold} />
        <StatCard label="Lands Minted" value={`${overview.totalLandsMinted.toLocaleString()} / 1,000,000`} />
        <StatCard label="Total Users" value={overview.totalUsers} />
        <StatCard label="Pi Revenue" value={`${formatLad(overview.totalPiRevenue, 2)} π`} accent />
        <StatCard label="LAD Burned" value={`${formatLad(overview.totalBurnedLad)} LAD`} />
        <StatCard label="Treasury (LAD)" value={`${formatLad(overview.totalTreasuryLad)} LAD`} accent />
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold mb-3">Economy Settings</p>
        <SettingRow
          label="Pi → LAD rate"
          value={settings.piToLadRate}
          onSave={(v) => saveSettings({ piToLadRate: v })}
          saving={saving}
          step="0.001"
        />
        <SettingRow
          label="Land price (LAD)"
          value={settings.landPriceLad}
          onSave={(v) => saveSettings({ landPriceLad: v })}
          saving={saving}
        />
        <SettingRow
          label="Burn % on upgrades"
          value={settings.burnPercent}
          onSave={(v) => saveSettings({ burnPercent: v })}
          saving={saving}
          step="0.01"
        />
        <SettingRow
          label="Marketplace fee %"
          value={settings.marketplaceFeePercent}
          onSave={(v) => saveSettings({ marketplaceFeePercent: v })}
          saving={saving}
          step="0.01"
        />

        <p className="text-xs text-white/40 mt-4 mb-2">Upgrade costs (LAD)</p>
        {[2, 3, 4, 5].map((lvl) => (
          <SettingRow
            key={lvl}
            label={`Level ${lvl}`}
            value={settings.upgradeCosts[lvl]}
            onSave={(v) => saveSettings({ upgradeCosts: { ...settings.upgradeCosts, [lvl]: v } })}
            saving={saving}
          />
        ))}

        <p className="text-xs text-white/40 mt-4 mb-2">Daily reward rates (LAD/day)</p>
        {[2, 3, 4, 5].map((lvl) => (
          <SettingRow
            key={lvl}
            label={`Level ${lvl}`}
            value={settings.dailyRewardRates[lvl]}
            onSave={(v) => saveSettings({ dailyRewardRates: { ...settings.dailyRewardRates, [lvl]: v } })}
            saving={saving}
            step="0.0001"
          />
        ))}
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold mb-3">Ban / Unban User</p>
        <input className="input-field w-full mb-2" placeholder="User UID" value={banUid} onChange={(e) => setBanUid(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={() => handleBan(true)} className="btn-secondary flex-1 py-2">Ban</button>
          <button onClick={() => handleBan(false)} className="btn-secondary flex-1 py-2">Unban</button>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold mb-3">Remove Fraudulent Listing</p>
        <input className="input-field w-full mb-2" placeholder="Listing ID" value={listingId} onChange={(e) => setListingId(e.target.value)} />
        <button onClick={handleRemoveListing} className="btn-primary w-full py-2">Remove Listing</button>
      </div>

      {message && <p className="text-xs text-primary text-center">{message}</p>}
    </div>
  );
}

function SettingRow({ label, value, onSave, saving, step = '0.01' }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-white/60">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={step}
          className="input-field w-24 py-1 text-sm"
          value={local}
          onChange={(e) => setLocal(Number(e.target.value))}
        />
        <button
          disabled={saving || local === value}
          onClick={() => onSave(local)}
          className="text-xs text-primary disabled:text-white/20"
        >
          Save
        </button>
      </div>
    </div>
  );
}
