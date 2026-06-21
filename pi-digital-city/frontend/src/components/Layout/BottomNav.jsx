import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const items = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/map', label: 'City', icon: MapIcon },
  { to: '/marketplace', label: 'Market', icon: StoreIcon },
  { to: '/leaderboard', label: 'Ranks', icon: TrophyIcon },
  { to: '/dashboard', label: 'You', icon: UserIcon },
];

export default function BottomNav() {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur border-t border-white/10">
      <div className="max-w-5xl mx-auto grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-xs ${
                isActive ? 'text-primary' : 'text-white/50'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label === 'You' && user?.isAdmin ? 'Admin' : label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 11l9-8 9 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MapIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 4l6 2 6-2v16l-6 2-6-2-6 2V6z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 4v16M15 6v16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StoreIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 9l1-5h14l1 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9v10h14V9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrophyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 6H3v2a4 4 0 0 0 4 4M19 6h2v2a4 4 0 0 1-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17h4v3h-4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 20h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
