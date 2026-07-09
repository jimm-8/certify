import DonutChart from "./DonutChart";

const StatusChartCard = ({
  legendItems,
  periodOptions,
  statusMenuOpen,
  setStatusMenuOpen,
  setStatusPeriod,
}) => (
  <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] min-h-60">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-semibold text-[#0B1B3A]">
        Request Status
      </span>
      <div className="relative">
        <button
          className="text-[#7B8596] text-lg tracking-widest cursor-pointer hover:text-[#0B1B3A]"
          onClick={() => setStatusMenuOpen((v) => !v)}
        >
          ···
        </button>
        {statusMenuOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E6EAF0] rounded-md shadow-lg z-10 overflow-hidden">
            <div className="px-3 py-1.5 text-[10px] text-[#7B8596] uppercase tracking-[0.2em] border-b border-[#EEF1F5]">
              Time Range
            </div>
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatusPeriod(opt.value);
                  setStatusMenuOpen(false);
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
    <div className="flex items-center gap-5">
      <div className="relative w-40 h-40 shrink-0">
        <DonutChart data={legendItems.map((l) => l.val)} />
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {legendItems.map((l, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs text-[#24324A]"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: l.color }}
              />
              <span>{l.label}</span>
            </div>
            <span className="font-semibold text-sm text-[#0B1B3A]">
              {l.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default StatusChartCard;
