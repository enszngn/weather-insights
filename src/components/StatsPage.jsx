import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Import Leaflet CSS styles
import 'leaflet/dist/leaflet.css';

// Define a custom animated SVG map pin icon to avoid default Leaflet marker asset resolution issues
const createCustomIcon = (visitCount) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute h-8 w-8 rounded-full bg-cyan-500/25 animate-ping"></div>
        <div class="relative h-4 w-4 rounded-full bg-cyan-500 border-2 border-slate-950 flex items-center justify-center shadow-lg">
          <div class="h-1.5 w-1.5 rounded-full bg-white"></div>
        </div>
        <div class="absolute -top-6 bg-slate-900/90 text-[10px] text-cyan-400 px-1.5 py-0.5 rounded border border-slate-700/50 shadow backdrop-blur-sm whitespace-nowrap font-medium pointer-events-none">
          ${visitCount} Ziyaret
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

export default function StatsPage({ navigate }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Check if stats password session token exists on component mount
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('stats_password');
    if (savedPassword) {
      fetchStats(savedPassword);
    }
  }, []);

  const fetchStats = async (authPassword) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authPassword}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStats(data);
        setIsAuthenticated(true);
        sessionStorage.setItem('stats_password', authPassword);
      } else {
        setError(data.error || 'Giriş başarısız. Şifreyi kontrol edin.');
        sessionStorage.removeItem('stats_password');
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError('Veriler alınırken sunucu hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Şifre alanı boş bırakılamaz.');
      return;
    }
    fetchStats(password);
  };

  // Backfill missing days with 0 to ensure a smooth continuous chart line
  const getCleanedChartData = () => {
    if (!stats || !stats.chartData) return [];

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push(dateStr);
    }

    const dataMap = new Map(stats.chartData.map(item => [item.date, item.count]));

    return days.map(date => ({
      date: date.split('-').slice(1).reverse().join('/'), // Convert to DD/MM formatting
      Ziyaretçi: dataMap.get(date) || 0
    }));
  };

  // Calculate KPI statistics from metrics payload
  const totalVisitsCount = stats?.visits?.length || 0;
  const uniqueCitiesCount = stats?.pins?.length || 0;
  const topCityName = stats?.pins?.[0]?.city || 'Yok';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 font-sans select-none">
        {/* Blur glow effect background overlay */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative w-full max-w-md bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl animate-fade-in">
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-wide uppercase">İstatistik Paneli Girişi</h1>
            <p className="text-xs text-slate-500 mt-2">Bu panele erişmek için yönetici şifresini girin.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Yönetici Şifresi"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500/80 text-white rounded-xl py-3 px-4 outline-none text-center tracking-widest text-sm transition-all duration-300 placeholder:tracking-normal placeholder:text-slate-600"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-xs text-rose-500 bg-rose-500/5 border border-rose-500/10 py-2.5 px-4 rounded-xl text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-medium py-3 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-600/30 active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center text-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : 'Giriş Yap'}
            </button>
          </form>

          <button 
            onClick={() => navigate('/')}
            className="w-full text-slate-500 hover:text-slate-400 text-xs text-center mt-6 transition-colors duration-200 cursor-pointer"
          >
            ← Hava Durumuna Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Navigation */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
              Ziyaretçi Paneli
            </h1>
            <p className="text-xs text-slate-500 mt-1">Sitenizin anlık trafik ve ziyaretçi konum verileri.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                sessionStorage.removeItem('stats_password');
                setIsAuthenticated(false);
                setStats(null);
                setPassword('');
              }}
              className="px-4 py-2 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 text-xs rounded-xl font-medium transition-colors cursor-pointer text-rose-400 hover:text-rose-300"
            >
              Çıkış Yap
            </button>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-lg shadow-cyan-500/15"
            >
              ← Hava Durumu
            </button>
          </div>
        </header>

        {/* KPI Scorecards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Toplam Ziyaretçi</div>
            <div className="text-3xl font-bold text-white mt-2 flex items-baseline gap-2">
              {totalVisitsCount}
              <span className="text-xs font-normal text-cyan-400">aktif log</span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tekil Konumlar</div>
            <div className="text-3xl font-bold text-white mt-2 flex items-baseline gap-2">
              {uniqueCitiesCount}
              <span className="text-xs font-normal text-cyan-400">şehir</span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">En Çok Ziyaret Edilen</div>
            <div className="text-3xl font-bold text-white mt-2 truncate pr-2" title={topCityName}>
              {topCityName}
            </div>
          </div>
        </section>

        {/* Charts & Maps Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Traffic Line Chart */}
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex flex-col backdrop-blur-md h-[400px]">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Son 7 Günlük Ziyaret Trafiği
            </h2>
            <div className="flex-1 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getCleanedChartData()} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Ziyaretçi" 
                    stroke="#06b6d4" 
                    strokeWidth={3} 
                    dot={{ fill: '#0891b2', strokeWidth: 2, r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-md h-[400px] flex flex-col relative overflow-hidden">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ziyaretçi Haritası
            </h2>
            <div className="flex-1 rounded-xl overflow-hidden border border-slate-850 z-10">
              <MapContainer 
                center={[20, 0]} 
                zoom={1.5} 
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                {/* Render CartoDB dark mode map tiles */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                
                {stats?.pins?.map((pin, i) => (
                  <Marker 
                    key={i} 
                    position={[pin.lat, pin.lon]} 
                    icon={createCustomIcon(pin.visits)}
                  >
                    <Popup>
                      <div className="text-slate-950 font-sans p-1">
                        <strong className="text-sm text-slate-800 block mb-0.5">{pin.city}, ${pin.country}</strong>
                        <span className="text-xs text-slate-500">Toplam {pin.visits} Ziyaretçi</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </section>

        {/* Telemetry Table */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Son 100 Ziyaretçi Detayı
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 font-medium border-b border-slate-800/60">
                  <th className="py-4 px-5">ID</th>
                  <th className="py-4 px-5">IP Adresi</th>
                  <th className="py-4 px-5">Konum</th>
                  <th className="py-4 px-5">Koordinat (Enlem, Boylam)</th>
                  <th className="py-4 px-5">Ziyaret Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-slate-900/10">
                {stats?.visits && stats.visits.length > 0 ? (
                  stats.visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-850/30 transition-colors duration-200">
                      <td className="py-4 px-5 text-slate-500 font-mono">#{visit.id}</td>
                      <td className="py-4 px-5 font-mono text-cyan-400/95">{visit.ip}</td>
                      <td className="py-4 px-5 text-white font-medium">
                        {visit.city_name || visit.city || 'Belirsiz'}
                        {(visit.country) && <span className="text-[10px] text-slate-500 font-normal block mt-0.5">{visit.country}</span>}
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-400">
                        {visit.lat ? visit.lat.toFixed(4) : '0.0000'}, {visit.lon ? visit.lon.toFixed(4) : '0.0000'}
                      </td>
                      <td className="py-4 px-5 text-slate-400 font-mono">
                        {new Date(visit.created_at + ' UTC').toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">Kayıtlı ziyaret verisi bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
