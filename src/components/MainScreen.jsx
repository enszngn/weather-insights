import InsightCard from './InsightCard';
import MetricCard from './MetricCard';
import { Droplets, Wind } from 'lucide-react';

export default function MainScreen({ weather, insights, themeGradient }) {
  return (
    <div className={`min-h-screen w-full transition-colors duration-1000 bg-gradient-to-br ${themeGradient} flex items-center justify-center p-[clamp(1rem,5vw,3rem)]`}>
      <div className="w-full max-w-2xl space-y-[clamp(1.5rem,5vw,3rem)]">
        <header className="text-center space-y-[clamp(0.5rem,1.5vw,1rem)]">
          <p className="text-[clamp(0.75rem,2vw,1rem)] uppercase tracking-[0.5em] opacity-60">{weather.locationName}</p>
          <h1 className="text-[clamp(5rem,18vw,12rem)] leading-none font-bold tracking-tighter italic">{Math.round(weather.temp)}°</h1>
        </header>

        <div className="space-y-[clamp(0.75rem,2vw,1.5rem)]">
          {insights.map((text, i) => <InsightCard key={i} text={text} />)}
        </div>

        <div className="grid grid-cols-2 gap-[clamp(0.75rem,2vw,1.5rem)] opacity-80">
          <MetricCard Icon={Droplets} label="Humidity" value={weather.humidity} unit="%" />
          <MetricCard Icon={Wind} label="Wind" value={weather.windSpeed} unit="km/h" />
        </div>
      </div>
    </div>
  );
}
