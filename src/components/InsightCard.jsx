export default function InsightCard({ text }) {
  return (
    <div className="bg-white/10 shadow-md backdrop-blur-md p-6 md:p-8 rounded-md border border-white/30 transition-all duration-300 hover:bg-white/15 hover:border-white/40">
      <p className="text-2xl md:text-3xl text-white font-semibold leading-tight tracking-tight antialiased">
        {text}
      </p>
    </div>
  );
}