import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { LAND_LEVELS } from '../lib/constants';
import LandCard from '../components/Land/LandCard';
import Spinner from '../components/UI/Spinner';

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [level, setLevel] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = { sort };
      if (level) params.level = level;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      const res = await api.searchListings(params);
      setListings(res.listings);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, minPrice, maxPrice, sort]);

  useEffect(() => {
    const landParam = searchParams.get('land');
    if (landParam) navigate(`/land/${landParam}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = query
    ? listings.filter(
        (l) =>
          l.landId.includes(query) ||
          l.sellerPiUsername?.toLowerCase().includes(query.toLowerCase())
      )
    : listings;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Marketplace</h1>

      <div className="card p-3 space-y-3">
        <input
          className="input-field w-full"
          placeholder="Search by coordinates (e.g. 12-340) or seller"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <select className="input-field" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option>
            {Object.entries(LAND_LEVELS).map(([lvl, info]) => (
              <option key={lvl} value={lvl}>{info.name}</option>
            ))}
          </select>
          <select className="input-field" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="cheapest">Cheapest first</option>
            <option value="expensive">Most expensive first</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="input-field"
            placeholder="Min price (LAD)"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <input
            type="number"
            className="input-field"
            placeholder="Max price (LAD)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : error ? (
        <p className="text-sm text-red-400 text-center py-6">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-10">No lands match your filters right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((listing) => (
            <LandCard
              key={listing.listingId}
              land={listing}
              priceLad={listing.priceLad}
              onClick={() => navigate(`/land/${listing.landId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
