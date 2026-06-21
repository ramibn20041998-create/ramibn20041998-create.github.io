export default function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="card p-4 animate-fadeUp">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className={`mt-1 text-xl font-display font-semibold ${accent ? 'text-primary' : 'text-white'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
    </div>
  );
}
