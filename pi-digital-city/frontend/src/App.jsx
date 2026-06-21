import { Routes, Route } from 'react-router-dom';
import TopBar from './components/Layout/TopBar';
import BottomNav from './components/Layout/BottomNav';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CityMap from './pages/CityMap';
import Marketplace from './pages/Marketplace';
import LandProfile from './pages/LandProfile';
import Leaderboard from './pages/Leaderboard';
import BuyLad from './pages/BuyLad';
import Admin from './pages/Admin';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-4 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={user?.isAdmin ? <Admin /> : <Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/map" element={<CityMap />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/land/:landId" element={<LandProfile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/buy-lad" element={<BuyLad />} />
          <Route path="*" element={<p className="text-center text-white/50 py-20">Page not found</p>} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
