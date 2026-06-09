import {
  Sun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  Snowflake,
  CloudLightning,
} from 'lucide-react';

/**
 * Processes weather metrics and returns contextual insights.
 * @param {Object} data - The weather data object from our hook.
 * @returns {Array} insights - Array of objects with text and styling.
 */

export function getSystemTheme(weatherCode) {
  // WMO Weather Codes mapping to background gradients
  // Clear sky (0), Partly cloudy (1-3)
  if ([0, 1, 2, 3].includes(weatherCode)) return 'from-blue-600 to-blue-400';
  // Rain (51-67, 80-82)
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) return 'from-slate-700 to-slate-900';
  // Snow (71-77, 85-86)
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'from-blue-100 to-slate-300 text-slate-900';
  // Default/Overcast
  return 'from-slate-800 to-slate-950';
}

export function generateInsights(data) {
  const insights = [];
  if (!data) return insights;

  if (data.humidity > 85 && data.temp < 12) {
    insights.push("High humidity and chill detected. Keep joints warm.");
  }
  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82];
  if (rainCodes.includes(data.weatherCode)) {
    insights.push("Precipitation active. Waterproof footwear recommended.");
  }
  if (data.uvIndex >= 6) {
    insights.push("Strong solar radiation. Apply SPF 30+ protection.");
  }
  if (data.windSpeed > 25) {
    insights.push("Brisk winds detected. Layered clothing advised.");
  }

  if (insights.length === 0) {
    insights.push("Conditions are stable. Enjoy your day.");
  }

  return insights;
}

/** Maps a WMO weather code to its Lucide icon component. */
export function getWeatherIcon(code) {
  if (code === 0) return Sun;
  if ([1, 2, 3].includes(code)) return Cloud;
  if ([45, 48].includes(code)) return CloudFog;
  if ([51, 53, 55].includes(code)) return CloudDrizzle;
  if ([61, 63, 65, 80, 81, 82].includes(code)) return CloudRain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return Snowflake;
  if ([95, 96, 99].includes(code)) return CloudLightning;
  return Cloud;
}

/**
 * Returns a human-readable date label for a card header.
 */
export function getHeaderDateLabel(dateString) {
  const dateObj  = new Date(dateString + 'T00:00:00');
  const today    = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (dateObj.toDateString() === today.toDateString())    return 'TODAY';
  if (dateObj.toDateString() === tomorrow.toDateString()) return 'TOMORROW';
  return dateObj
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
}