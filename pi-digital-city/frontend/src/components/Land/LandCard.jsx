import { LAND_LEVELS, formatLad } from '../../lib/constants';

export default function LandCard({ land, priceLad, onClick, badge }) {
  const levelInfo = LAND_LEVELS[land.level] || LAND_LEVELS[1];

  return (
    <button
      onClick={onClick}
      className="card p-3 text-left w-full hover:border-primary/40 border border-transparent transition-colors animate-fadeUp"
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `${levelInfo.color}22`, color: levelInfo.color }}
        >
          {levelInfo.emoji}
        </div>
        {badge && <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full">{badge}</span>}
      </div>

      <p className="mt-2 font-semibold text-sm truncate">{land.name || `Plot ${land.x}-${land.y}`}</p>
      <p className="text-xs text-white/40">
        ({land.x}, {land.y}) · {levelInfo.name}
      </p>

      {land.ownerPiUsername && (
        <p className="text-xs text-white/40 mt-1 truncate">by @{land.ownerPiUsername}</p>
      )}

      {priceLad != null && (
        <p className="mt-2 text-sm font-display font-semibold text-primary">{formatLad(priceLad)} LAD</p>
      )}
    </button>
  );
}
