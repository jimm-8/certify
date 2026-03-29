import LineChart from "./LineChart";

const TrendChartCard = ({
  trend,
  chartLegend,
  periodOptions,
  trendMenuOpen,
  setTrendMenuOpen,
  setTrendPeriod,
}) => (
  <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-semibold">Requests Over Time</span>
      <div className="relative">
        <button
          className="text-gray-400 text-lg tracking-widest cursor-pointer"
          onClick={() => setTrendMenuOpen((v) => !v)}
        >
          ···
        </button>
        {trendMenuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setTrendPeriod(opt.value);
                  setTrendMenuOpen(false);
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
    <div className="c-line-wrap">
      <LineChart trend={trend} />
    </div>
    <div className="flex gap-3 mt-2 flex-wrap">
      {chartLegend.map((c, i) => (
        <div key={i} className="flex items-center gap-1 text-xs text-gray-400">
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
