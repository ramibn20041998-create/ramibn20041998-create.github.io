import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { LAND_LEVELS, formatLad } from '../lib/constants';
import Spinner from '../components/UI/Spinner';

const TABS = [
  { id: 'richest', label: 'Richest' },
  { id: 'largest-owners', label: 'Top Owners' },
  { id: 'highest-level', label: 'Top Lands' },
  { id: 'most-valuable', label: 'Most Valuable' },
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('richest');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = {
      richest: api.leaderboardRichest,
      'largest-owners': api.leaderboardLargestOwners,
      'highest-level': api.leaderboardHighestLevel,
      'most-valuable': api.leaderboardMostValuable,
    }[tab];

    fetcher()
      .then((res) => setData(res.users || res.lands || res.listings || []))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Leaderboards</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
              tab === t.id ? 'bg-primary text-bg font-semibold' : 'bg-card text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : data.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-10">No data yet.</p>
      ) : (
        <div className="card divide-y divide-white/5">
          {data.map((item, idx) => (
            <Row key={item.uid || item.landId || item.listingId} idx={idx} item={item} tab={tab} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ idx, item, tab, navigate }) {
  const isUserTab = tab === 'richest' || tab === 'largest-owners';
  const onClick = !isUserTab ? () => navigate(`/land/${item.landId}`) : undefined;

  return (
    <div className={`flex items-center justify-between px-4 py-3 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="flex items-center gap-3">
        <span className={`w-6 text-sm font-display font-semibold ${idx < 3 ? 'text-primary' : 'text-white/40'}`}>
          #{idx + 1}
        </span>
        <div>
          {isUserTab ? (
            <p className="text-sm font-medium">@{item.piUsername}</p>
          ) : (
            <p className="text-sm font-medium">
              {LAND_LEVELS[item.level]?.emoji} Plot ({item.x}, {item.y})
            </p>
          )}
          {tab === 'largest-owners' && <p className="text-xs text-white/40">{item.ownedLandCount} lands</p>}
        </div>
      </div>
      <span className="text-sm font-semibold text-primary">
        {tab === 'richest' && `${formatLad(item.ladBalance)} LAD`}
        {tab === 'largest-owners' && `${item.ownedLandCount}`}
        {tab === 'highest-level' && LAND_LEVELS[item.level]?.name}
        {tab === 'most-valuable' && `${formatLad(item.priceLad)} LAD`}
      </span>
    </div>
  );
}
