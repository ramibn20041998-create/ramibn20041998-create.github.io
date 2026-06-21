export default function Spinner({ size = 24, className = '' }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-white/20 border-t-primary ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
