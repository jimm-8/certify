import LineChart from "./LineChart";

const TrendChartCard = ({
  trend,
  chartLegend,
  periodOptions,
  trendMenuOpen,
  setTrendMenuOpen,
  setTrendPeriod,
}) => (
  <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-semibold text-[#0B1B3A]">
        Requests Over Time
      </span>
      <div className="relative">
        <button
          className="text-[#7B8596] text-lg tracking-widest cursor-pointer hover:text-[#0B1B3A]"
          onClick={() => setTrendMenuOpen((v) => !v)}
        >
          ···
        </button>
        {trendMenuOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E6EAF0] rounded-md shadow-lg z-10 overflow-hidden">
            <div className="px-3 py-1.5 text-[10px] text-[#7B8596] uppercase tracking-[0.2em] border-b border-[#EEF1F5]">
              Time Range
            </div>
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setTrendPeriod(opt.value);
                  setTrendMenuOpen(false);
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
    <div className="c-line-wrap">
      <LineChart trend={trend} />
    </div>
    <div className="flex gap-3 mt-2 flex-wrap text-[#52607A]">
      {chartLegend.map((c, i) => (
        <div key={i} className="flex items-center gap-1 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: c.color }}
          />
          {c.label}
        </div>
      ))}
    </div>
  </div>
);

export default TrendChartCard;
