import DonutChart from "./DonutChart";

const StatusChartCard = ({
  legendItems,
  periodOptions,
  statusMenuOpen,
  setStatusMenuOpen,
  setStatusPeriod,
}) => (
  <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-semibold">Request Status</span>
      <div className="relative">
        <button
          className="text-gray-400 text-lg tracking-widest cursor-pointer"
          onClick={() => setStatusMenuOpen((v) => !v)}
        >
          ···
        </button>
        {statusMenuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatusPeriod(opt.value);
                  setStatusMenuOpen(false);
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
    <div className="flex items-center gap-5">
      <div className="relative w-40 h-40 shrink-0">
        <DonutChart data={legendItems.map((l) => l.val)} />
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {legendItems.map((l, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: l.color }}
              />
              <span>{l.label}</span>
            </div>
            <span className="font-bold text-sm">{l.val}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default StatusChartCard;
