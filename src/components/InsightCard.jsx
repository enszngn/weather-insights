export default function InsightCard({ text }) {
  return (
    <div className="bg-white/10 shadow-md backdrop-blur-md p-[clamp(1rem,4vw,2rem)] rounded-md border border-white/30 transition-all duration-300 hover:bg-white/15 hover:border-white/40">
      <p className="text-[clamp(1.1rem,2.8vw,1.75rem)] text-white font-semibold leading-tight tracking-tight antialiased">
        {text}
      </p>
    </div>
  );
}