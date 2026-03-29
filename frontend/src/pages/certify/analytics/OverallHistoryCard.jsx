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
  <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-semibold">Overall History</span>
      <div className="relative">
        <button
          className="text-gray-400 text-lg tracking-widest cursor-pointer"
          onClick={() => setHistoryMenuOpen((v) => !v)}
        >
          ···
        </button>
        {historyMenuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setHistoryPeriod(opt.value);
                  setHistoryMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
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
              <span className="font-medium text-[#1A1D2E]">
                {item.certificate_type}
              </span>
              <span className="font-bold" style={{ color }}>
                {item.count}
              </span>
            </div>
            <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
      <div className="mt-2 pt-2.5 border-t border-gray-200 flex justify-between text-[11px] text-gray-400">
        <span>Total Processed</span>
        <span className="font-bold text-[#1A1D2E]">{totalProcessed}</span>
      </div>
    </div>
  </div>
);

export default OverallHistoryCard;
