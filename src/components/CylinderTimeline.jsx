import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import WeatherWindow from './WeatherWindow';
import CitySearch from './CitySearch';
import { getSystemTheme } from '../utils/weatherLogic';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ── Module-level constants ────────────────────────────────────────────────────

const TOTAL_DAYS          = 8;
const ROTATION_PER_CARD   = 360 / TOTAL_DAYS; // 45° per card face
const ROTATION_SENSITIVITY = 0.15;            // px → degrees
const THRESHOLD_DEGREES    = 12;              // min drag to commit a slide
const WHEEL_THROTTLE_MS    = 800;             // ms between wheel-triggered slides

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today + next N days as YYYY-MM-DD strings. */
function buildDays(count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

/** Builds a normalised weather object from an Open-Meteo forecast API response. */
function normaliseMeteoData(data, dateStr, isToday, fallbackTitle) {
  const currentHour = new Date().getHours();
  return {
    temp:        isToday && data.current ? data.current.temperature_2m          : data.hourly.temperature_2m[currentHour],
    humidity:    isToday && data.current ? data.current.relative_humidity_2m     : (data.hourly.relative_humidity_2m?.[currentHour] ?? 50),
    windSpeed:   isToday && data.current ? data.current.wind_speed_10m           : (data.hourly.wind_speed_10m?.[currentHour] ?? 10),
    uvIndex:     data.daily.uv_index_max[0],
    weatherCode: isToday && data.current ? data.current.weather_code            : data.hourly.weather_code[currentHour],
    hourly:      data.hourly,
    locationName: fallbackTitle || data.timezone.split('/').pop().replace(/_/g, ' '),
    lat:         data.latitude,
    lon:         data.longitude,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CylinderTimeline({ initialWeather }) {
  // ── Location & active day state ───────────────────────────────────────────────
  const [coords, setCoords] = useState({
    lat:   initialWeather?.lat          ?? 41.0082,
    lon:   initialWeather?.lon          ?? 28.9784,
    title: initialWeather?.locationName ?? 'Istanbul',
  });

  const [activeIndex, setActiveIndex] = useState(0);

  // ── Day strings — memoized so array identity is stable across renders ─────────
  const days = useMemo(() => buildDays(TOTAL_DAYS), []);

  // ── Per-day weather cache — keyed by dateStr ──────────────────────────────────
  const [loadedData, setLoadedData] = useState(() => {
    if (!initialWeather) return {};
    return { [days[0]]: { loading: false, error: null, data: initialWeather } };
  });

  const activeFetches = useRef(new Set());

  // ── Fetch weather for a specific day ─────────────────────────────────────────
  const fetchDataForDate = useCallback(async (dateStr, lat, lon) => {
    const fetchKey = `${dateStr}-${lat}-${lon}`;
    if (activeFetches.current.has(fetchKey)) return;
    activeFetches.current.add(fetchKey);

    setLoadedData((prev) => ({
      ...prev,
      [dateStr]: { loading: true, error: null, data: null },
    }));

    try {
      const url = [
        'https://api.open-meteo.com/v1/forecast',
        `?latitude=${lat}&longitude=${lon}`,
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
        '&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
        '&daily=uv_index_max&timezone=auto',
        `&start_date=${dateStr}&end_date=${dateStr}`,
      ].join('');

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const isToday = dateStr === days[0];

      setLoadedData((prev) => {
        // Discard stale responses if the user switched city mid-flight.
        if (prev[dateStr]?.loading === false && prev[dateStr]?.data) return prev;
        return {
          ...prev,
          [dateStr]: {
            loading: false,
            error:   null,
            data:    normaliseMeteoData(data, dateStr, isToday, coords.title),
          },
        };
      });
    } catch (err) {
      console.error(`Fetch failed for date ${dateStr}:`, err);
      setLoadedData((prev) => ({
        ...prev,
        [dateStr]: { loading: false, error: 'Failed to load weather data', data: null },
      }));
    } finally {
      activeFetches.current.delete(fetchKey);
    }
  }, [days, coords.title]);

  // ── Prefetch active + ±2 neighbour days on index/coord change ────────────────
  useEffect(() => {
    const neighbors = [
      activeIndex,
      (activeIndex - 1 + TOTAL_DAYS) % TOTAL_DAYS,
      (activeIndex + 1) % TOTAL_DAYS,
      (activeIndex - 2 + TOTAL_DAYS) % TOTAL_DAYS,
      (activeIndex + 2) % TOTAL_DAYS,
    ];

    neighbors.forEach((idx) => {
      const dateStr = days[idx];
      if (!loadedData[dateStr] || loadedData[dateStr].error) {
        fetchDataForDate(dateStr, coords.lat, coords.lon);
      }
    });
  }, [activeIndex, coords, days, fetchDataForDate, loadedData]);

  // ── Drag / Swipe state ────────────────────────────────────────────────────────
  const [dragOffset, setDragOffset]   = useState(0);
  const startX       = useRef(0);
  const isDragging   = useRef(false);
  const lastWheelTime = useRef(0);

  /**
   * Commits the current dragOffset to an index change (or resets if below
   * threshold). Shared by both mouse and touch end handlers.
   */
  const commitDrag = useCallback((offset) => {
    if (offset > THRESHOLD_DEGREES) {
      setActiveIndex((prev) => (prev - 1 + TOTAL_DAYS) % TOTAL_DAYS);
    } else if (offset < -THRESHOLD_DEGREES) {
      setActiveIndex((prev) => (prev + 1) % TOTAL_DAYS);
    }
    setDragOffset(0);
  }, []);

  // ── Touch handlers ────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    startX.current     = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    setDragOffset((e.touches[0].clientX - startX.current) * ROTATION_SENSITIVITY);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    commitDrag(dragOffset);
  }, [commitDrag, dragOffset]);

  // ── Mouse handlers ────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('input, button, a, select, option, ul, li')) return;
    startX.current                = e.clientX;
    isDragging.current            = true;
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    setDragOffset((e.clientX - startX.current) * ROTATION_SENSITIVITY);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current             = false;
    document.body.style.userSelect = '';
    commitDrag(dragOffset);
  }, [commitDrag, dragOffset]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging.current) handleMouseUp();
  }, [handleMouseUp]);

  // ── Scroll Wheel Navigation ───────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    const now = Date.now();
    if (now - lastWheelTime.current < WHEEL_THROTTLE_MS) return;
    if (e.target.closest('.overflow-x-auto, .overflow-y-auto, .custom-scrollbar')) return;

    if (Math.abs(e.deltaY) > 20 || Math.abs(e.deltaX) > 20) {
      lastWheelTime.current = now;
      setActiveIndex((prev) =>
        e.deltaY > 0 || e.deltaX > 0
          ? (prev + 1) % TOTAL_DAYS
          : (prev - 1 + TOTAL_DAYS) % TOTAL_DAYS
      );
    }
  }, []);

  // ── City selection ────────────────────────────────────────────────────────────
  const handleSelectCity = useCallback((newCity) => {
    setCoords({ lat: newCity.lat, lon: newCity.lon, title: newCity.name });
    setLoadedData({});   // clear old city's cache
    setActiveIndex(0);   // reset to Today
  }, []);

  // ── Dynamic page background ───────────────────────────────────────────────────
  const activeWeather = loadedData[days[activeIndex]]?.data;
  const activeTheme   = activeWeather
    ? getSystemTheme(activeWeather.weatherCode)
    : 'from-slate-800 to-slate-950';

  return (
    <div
      className={`relative h-[100svh] w-full overflow-hidden bg-gradient-to-br ${activeTheme} transition-colors duration-1000 flex flex-col justify-between py-6 select-none`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {/* ─ Top Header: City Search & Day Nav ─ */}
      <div className="w-full flex flex-col items-center gap-4 z-30 select-none">
        <CitySearch onSelectCity={handleSelectCity} />

        {/* Day selector tabs */}
        <div className="flex gap-2 justify-center max-w-full px-4 overflow-x-auto no-scrollbar">
          {days.map((dayStr, idx) => {
            const isActive  = idx === activeIndex;
            const dateObj   = new Date(dayStr + 'T00:00:00');
            const dayName   = idx === 0
              ? 'TODAY'
              : dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

            return (
              <button
                key={dayStr}
                onClick={() => setActiveIndex(idx)}
                className={`px-3 py-1.5 text-[9px] tracking-widest font-light transition-all border ${
                  isActive
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 font-semibold'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                } rounded-lg`}
              >
                {dayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─ 3D Cylinder Container ─ */}
      <div className="relative flex-1 w-full flex items-center justify-center perspective-1200 overflow-hidden select-none z-10">

        {/* Carousel Wheel */}
        <div
          className="preserve-3d w-full h-[80vh] flex items-center justify-center transition-transform duration-700 cubic-bezier(0.25, 1, 0.5, 1)"
          style={{
            transform: `translateZ(calc(var(--card-width) * -1.207)) rotateY(${(-activeIndex * ROTATION_PER_CARD) + dragOffset}deg)`,
          }}
        >
          {days.map((dayStr, idx) => {
            const isActive   = idx === activeIndex;
            const isNeighbor = idx === (activeIndex - 1 + TOTAL_DAYS) % TOTAL_DAYS
                            || idx === (activeIndex + 1) % TOTAL_DAYS;
            const weatherItem = loadedData[dayStr];

            return (
              <div
                key={dayStr}
                className="absolute w-full max-w-[var(--card-width)] h-[80vh] preserve-3d"
                style={{
                  transform: `rotateY(${idx * ROTATION_PER_CARD}deg) translateZ(calc(var(--card-width) * 1.207))`,
                }}
              >
                <WeatherWindow
                  title={coords.title}
                  dateStr={dayStr}
                  active={isActive}
                  visible={isActive || isNeighbor}
                  weatherData={weatherItem?.data}
                  loadingData={weatherItem?.loading}
                  errorData={weatherItem?.error}
                />
              </div>
            );
          })}
        </div>

        {/* ─ Side Arrow Controls ─ */}
        <button
          onClick={() => setActiveIndex((prev) => (prev - 1 + TOTAL_DAYS) % TOTAL_DAYS)}
          className="absolute left-4 p-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 rounded-full text-white backdrop-blur-md transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95 z-20 shrink-0"
          title="Previous Day"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={() => setActiveIndex((prev) => (prev + 1) % TOTAL_DAYS)}
          className="absolute right-4 p-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 rounded-full text-white backdrop-blur-md transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95 z-20 shrink-0"
          title="Next Day"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
