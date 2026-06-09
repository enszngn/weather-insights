import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';

export default function CitySearch({ onSelectCity }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced API call for city suggestions
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Geocoding suggestions error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelect = (item) => {
    const cityName = item.name;
    const countryName = item.country ? `, ${item.country}` : '';
    const stateName = item.admin1 ? ` (${item.admin1})` : '';
    const fullName = `${cityName}${stateName}${countryName}`;

    onSelectCity({
      lat: item.latitude,
      lon: item.longitude,
      name: fullName,
    });
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-[320px] sm:max-w-[380px] mx-auto z-50 px-4" ref={dropdownRef}>
      {/* Search Input Container */}
      <div className="relative flex items-center bg-white/5 border border-white/20 backdrop-blur-md px-3 py-2 shadow-lg transition-all duration-300 focus-within:bg-white/10 focus-within:border-white/40">
        <Search className="text-white/40 h-4 w-4 mr-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH CITY..."
          className="bg-transparent border-none text-white w-full text-xs font-light tracking-[0.25em] uppercase outline-none placeholder:text-white/30"
        />
        {loading && <Loader2 className="animate-spin text-white/50 h-4 w-4 ml-1" />}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute top-full left-4 right-4 mt-1 bg-slate-950/90 border border-white/25 backdrop-blur-xl shadow-2xl overflow-y-auto max-h-56 divide-y divide-white/10 z-50">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 text-xs tracking-wider text-white/85 hover:bg-white/10 transition-colors duration-200 uppercase font-light flex items-center gap-2"
              >
                <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                <span className="truncate">
                  {item.name}
                  {item.admin1 && <span className="text-white/40 text-[10px]"> ({item.admin1})</span>}
                  {item.country && <span className="text-cyan-300 font-normal">, {item.country_code?.toUpperCase() || item.country}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
