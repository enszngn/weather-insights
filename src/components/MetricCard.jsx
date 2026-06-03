
// We pass in the Icon component, a label, the value, and the unit
export default function MetricCard({ Icon, label, value, unit }) {
  return (
    <div className="flex flex-col p-[clamp(0.75rem,3vw,1.5rem)] rounded-md bg-white/5 border border-white/10 backdrop-blur-md">
      {/* Icon and Label row */}
      <div className="flex items-center gap-2 mb-2 text-slate-200">
        <Icon size={18} strokeWidth={1.5} />
        <span className="text-[clamp(0.65rem,2vw,0.85rem)] uppercase tracking-widest font-medium">{label}</span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-1">
        <span className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold text-slate-50">{value}</span>
        <span className="text-[clamp(0.75rem,2vw,1rem)] text-slate-200">{unit}</span>
      </div>
    </div>
  );
}