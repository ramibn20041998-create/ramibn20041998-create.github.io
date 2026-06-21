import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { LAND_LEVELS, formatLad } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../UI/Spinner';

export default function LandModal({ landId, onClose, onChanged }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [land, setLand] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getLand(landId), api.settings()])
      .then(([landRes, settingsRes]) => {
        if (cancelled) return;
        setLand(landRes.land);
        setSettings(settingsRes.settings);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [landId]);

  async function handleBuy() {
    if (!user) return setError('Sign in to buy land');
    setBusy(true);
    setError(null);
    try {
      await api.buyLand(land.x, land.y);
      onChanged?.();
      onClose();
      navigate(`/land/${landId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const levelInfo = land ? LAND_LEVELS[land.level] || LAND_LEVELS[1] : null;
  const isOwnedByMe = land?.owner === user?.uid;

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full sm:w-96 max-h-[80vh] overflow-y-auto p-5 rounded-b-none sm:rounded-2xl animate-fadeUp" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : land ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-lg">Plot ({land.x}, {land.y})</h3>
              <button onClick={onClose} className="text-white/40 text-2xl leading-none">×</button>
            </div>

            {land.minted ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${levelInfo.color}22`, color: levelInfo.color }}
                  >
                    {levelInfo.emoji} {levelInfo.name}
                  </span>
                  {land.forSale && <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">For Sale</span>}
                </div>

                <p className="text-sm text-white/70 mb-1">{land.name}</p>
                {land.description && <p className="text-xs text-white/50 mb-3">{land.description}</p>}

                <div className="text-xs text-white/50 space-y-1 mb-4">
                  <p>Owner: @{land.ownerPiUsername}</p>
                  {land.forSale && <p className="text-primary">Listed at {formatLad(land.salePrice)} LAD</p>}
                </div>

                {isOwnedByMe ? (
                  <button onClick={() => navigate(`/land/${landId}`)} className="btn-primary w-full py-2.5">
                    Manage This Land
                  </button>
                ) : land.forSale ? (
                  <button onClick={() => navigate(`/marketplace?land=${landId}`)} className="btn-primary w-full py-2.5">
                    View on Marketplace
                  </button>
                ) : (
                  <p className="text-xs text-white/40 text-center">Not currently for sale</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-white/60 mb-4">This plot hasn't been claimed yet. Be the first to own it!</p>
                <div className="card bg-bg p-3 mb-4 flex items-center justify-between">
                  <span className="text-xs text-white/50">Price</span>
                  <span className="font-display font-semibold text-primary">{formatLad(settings?.landPriceLad)} LAD</span>
                </div>
                <button onClick={handleBuy} disabled={busy} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                  {busy && <Spinner size={16} />} Buy This Land
                </button>
              </>
            )}

            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </>
        ) : (
          <p className="text-sm text-red-400">{error || 'Could not load land'}</p>
        )}
      </div>
    </div>
  );
}
