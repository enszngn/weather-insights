import React, { useState, useEffect } from 'react';
import useWeather from './hooks/useWeather';
import { generateInsights, getSystemTheme } from './utils/weatherLogic';
import MainScreen from './components/MainScreen';
import StatsPage from './components/StatsPage';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    setPath(to);
  };

  const { weather, loading, error } = useWeather();

  if (path === '/stats' || path === '/stats/') {
    return <StatsPage navigate={navigate} />;
  }

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;
  if (!weather) return null;

  const insights = generateInsights(weather);
  const themeGradient = getSystemTheme(weather.weatherCode);

  return (
    <div className="relative">
      <MainScreen 
        weather={weather} 
        insights={insights} 
        themeGradient={themeGradient} 
      />
      {/* Floating visitor statistics navigation button */}
      <button 
        onClick={() => navigate('/stats')}
        className="fixed bottom-4 right-4 z-40 p-3 bg-slate-900/60 hover:bg-slate-900/90 text-white rounded-full border border-slate-700/50 backdrop-blur-md shadow-lg transition-all duration-300 group cursor-pointer"
        title="Ziyaretçi İstatistikleri"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
        </svg>
      </button>
    </div>
  );
}

// Small sub-components for states
const LoadingScreen = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
    <div className="text-white tracking-[0.4em] font-light animate-pulse text-xl">SYNCING...</div>
  </div>
);

const ErrorScreen = ({ message }) => (
  <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-10 text-center">
    <div className="max-w-sm text-slate-500 text-sm leading-relaxed uppercase tracking-widest">{message}</div>
  </div>
);