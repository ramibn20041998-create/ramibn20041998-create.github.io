import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { LAND_LEVELS, MAX_LEVEL, formatLad } from '../lib/constants';
import Spinner from '../components/UI/Spinner';

export default function LandProfile() {
  const { landId } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [land, setLand] = useState(null);
  const [settings, setSettings] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyAction, setBusyAction] = useState(null);

  const [form, setForm] = useState({ name: '', description: '', imageUrl: '', websiteUrl: '' });
  const [listPrice, setListPrice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [landRes, settingsRes, catalogRes] = await Promise.all([
        api.getLand(landId),
        api.settings(),
        api.decorationCatalog(),
      ]);
      setLand(landRes.land);
      setSettings(settingsRes.settings);
      setCatalog(catalogRes.catalog);
      if (landRes.land.minted) {
        setForm({
          name: landRes.land.name || '',
          description: landRes.land.description || '',
          imageUrl: landRes.land.imageUrl || '',
          websiteUrl: landRes.land.websiteUrl || '',
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [landId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (error || !land) return <p className="text-sm text-red-400 text-center py-16">{error || 'Land not found'}</p>;

  const isOwner = user && land.owner === user.uid;
  const levelInfo = LAND_LEVELS[land.minted ? land.level : 1];
  const nextLevel = land.level + 1;
  const upgradeCost = settings?.upgradeCosts?.[nextLevel];
  const burnAmount = upgradeCost ? Number((upgradeCost * settings.burnPercent).toFixed(6)) : 0;

  async function run(action, fn) {
    setBusyAction(action);
    setError(null);
    try {
      await fn();
      await Promise.all([load(), refreshUser()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="text-xs text-white/40">← Back</button>

      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="font-display text-xl font-semibold">{land.minted ? land.name : `Plot ${land.x}-${land.y}`}</h1>
            <p className="text-xs text-white/40">Coordinates ({land.x}, {land.y})</p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full shrink-0"
            style={{ backgroundColor: `${levelInfo.color}22`, color: levelInfo.color }}
          >
            {levelInfo.emoji} {levelInfo.name}
          </span>
        </div>

        {land.imageUrl && (
          <img src={land.imageUrl} alt={land.name} className="w-full h-40 object-cover rounded-xl mb-3" onError={(e) => (e.target.style.display = 'none')} />
        )}

        {land.minted ? (
          <>
            <p className="text-sm text-white/60 mb-1">{land.description || 'No description yet.'}</p>
            {land.websiteUrl && (
              <a href={land.websiteUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                {land.websiteUrl}
              </a>
            )}
            <p className="text-xs text-white/40 mt-3">Owned by @{land.ownerPiUsername}</p>
          </>
        ) : (
          <p className="text-sm text-white/60">This plot hasn't been claimed yet.</p>
        )}

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>

      {!land.minted && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-white/60">Price</span>
            <span className="font-display font-semibold text-primary text-lg">{formatLad(settings?.landPriceLad)} LAD</span>
          </div>
          <button
            onClick={() => run('buy', () => api.buyLand(land.x, land.y))}
            disabled={!user || busyAction === 'buy'}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {busyAction === 'buy' && <Spinner size={16} />} {user ? 'Buy This Land' : 'Sign in to buy'}
          </button>
        </div>
      )}

      {land.minted && !isOwner && land.forSale && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-white/60">Listed price</span>
            <span className="font-display font-semibold text-primary text-lg">{formatLad(land.salePrice)} LAD</span>
          </div>
          <button
            onClick={() => run('buyListed', () => api.buyListedLand(land.landId))}
            disabled={!user || busyAction === 'buyListed'}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {busyAction === 'buyListed' && <Spinner size={16} />} {user ? 'Buy Now' : 'Sign in to buy'}
          </button>
        </div>
      )}

      {land.minted && isOwner && (
        <>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-1">Daily Rewards</p>
            <p className="text-xs text-white/50 mb-3">
              Pending: <span className="text-primary font-semibold">{formatLad(land.pendingReward)} LAD</span>
            </p>
            <button
              onClick={() => run('claim', () => api.claimReward(land.landId))}
              disabled={busyAction === 'claim' || !(land.pendingReward > 0)}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {busyAction === 'claim' && <Spinner size={16} />} Claim Reward
            </button>
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Development</p>
            {land.level >= MAX_LEVEL ? (
              <p className="text-xs text-white/40">This land is already a Mega Tower - maximum level reached.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                  <span>Upgrade to {LAND_LEVELS[nextLevel].name}</span>
                  <span>{formatLad(upgradeCost)} LAD</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/30 mb-3">
                  <span>30% burned permanently</span>
                  <span>−{formatLad(burnAmount)} LAD</span>
                </div>
                <button
                  onClick={() => run('upgrade', () => api.upgradeLand(land.landId))}
                  disabled={busyAction === 'upgrade' || land.forSale}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                >
                  {busyAction === 'upgrade' && <Spinner size={16} />} Upgrade
                </button>
                {land.forSale && <p className="text-xs text-white/30 mt-2 text-center">Unlist from marketplace to upgrade</p>}
              </>
            )}
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Edit Land Profile</p>
            <div className="space-y-2">
              <input className="input-field w-full" placeholder="Land name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <textarea className="input-field w-full" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input className="input-field w-full" placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              <input className="input-field w-full" placeholder="Website URL" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
            </div>
            <button
              onClick={() => run('profile', () => api.updateLandProfile(land.landId, form))}
              disabled={busyAction === 'profile'}
              className="btn-secondary w-full py-2.5 mt-3 flex items-center justify-center gap-2"
            >
              {busyAction === 'profile' && <Spinner size={16} />} Save Profile
            </button>
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Decorations</p>
            <p className="text-xs text-white/40 mb-3">Cosmetic only - these don't affect rewards.</p>
            <div className="grid grid-cols-2 gap-2">
              {catalog.map((deco) => {
                const owned = land.decorations?.includes(deco.id);
                return (
                  <button
                    key={deco.id}
                    disabled={owned || busyAction === `deco-${deco.id}`}
                    onClick={() => run(`deco-${deco.id}`, () => api.buyDecoration(land.landId, deco.id))}
                    className="card bg-bg p-3 text-left disabled:opacity-50"
                  >
                    <p className="text-lg">{deco.icon}</p>
                    <p className="text-xs font-medium mt-1">{deco.name}</p>
                    <p className="text-xs text-primary">{owned ? 'Owned' : `${formatLad(deco.priceLad)} LAD`}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Marketplace</p>
            {land.forSale ? (
              <>
                <p className="text-xs text-white/50 mb-3">Listed at {formatLad(land.salePrice)} LAD</p>
                <button
                  onClick={() => run('unlist', () => api.unlistLand(land.landId))}
                  disabled={busyAction === 'unlist'}
                  className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"
                >
                  {busyAction === 'unlist' && <Spinner size={16} />} Remove Listing
                </button>
              </>
            ) : (
              <>
                <input
                  type="number"
                  className="input-field w-full mb-3"
                  placeholder="Price in LAD"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                />
                <button
                  onClick={() => run('list', () => api.listLand(land.landId, Number(listPrice)))}
                  disabled={busyAction === 'list' || !listPrice}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                >
                  {busyAction === 'list' && <Spinner size={16} />} List for Sale
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
