const COLORS = ["#7C6FF7", "#4899F7", "#2DC78D", "#F4A837", "#F72D6B"];

const OverallHistoryCard = ({
  certHistory,
  maxHistory,
  totalProcessed,
  periodOptions,
  historyMenuOpen,
  setHistoryMenuOpen,
  setHistoryPeriod,
}) => (
  <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] min-h-60">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-semibold text-[#0B1B3A]">
        Overall History
      </span>
      <div className="relative">
        <button
          className="text-[#7B8596] text-lg tracking-widest cursor-pointer hover:text-[#0B1B3A]"
          onClick={() => setHistoryMenuOpen((v) => !v)}
        >
          ···
        </button>
        {historyMenuOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E6EAF0] rounded-md shadow-lg z-10 overflow-hidden">
            <div className="px-3 py-1.5 text-[10px] text-[#7B8596] uppercase tracking-[0.2em] border-b border-[#EEF1F5]">
              Time Range
            </div>
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setHistoryPeriod(opt.value);
                  setHistoryMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-[#24324A] hover:bg-[#F6F1E5] font-semibold"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    <div className="flex flex-col gap-2.5">
      {certHistory.map((item, i) => {
        const color = COLORS[i % COLORS.length];
        const pct = Math.round((item.count / maxHistory) * 100);
        return (
          <div key={i}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-medium text-[#1F2A44]">
                {item.certificate_type}
              </span>
              <span className="font-bold" style={{ color }}>
                {item.count}
              </span>
            </div>
            <div className="bg-[#EEF1F5] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
      <div className="mt-2 pt-2.5 border-t border-[#E6EAF0] flex justify-between text-[11px] text-[#7B8596]">
        <span>Total Processed</span>
        <span className="font-bold text-[#0B1B3A]">{totalProcessed}</span>
      </div>
    </div>
  </div>
);

export default OverallHistoryCard;
