import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-white/5">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-display font-bold text-bg">π</div>
          <span className="font-display font-semibold tracking-tight">Pi Digital City</span>
        </Link>

        {user && (
          <Link to="/buy-lad" className="flex items-center gap-1.5 bg-card border border-white/10 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-sm font-semibold">{user.ladBalance?.toFixed(4) ?? '0.0000'}</span>
            <span className="text-xs text-white/50">LAD</span>
          </Link>
        )}
      </div>
    </header>
  );
}
