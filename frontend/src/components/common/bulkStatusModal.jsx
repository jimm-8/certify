import React from "react";

const bulkStatusTarget = {
  PROCESSING: { value: "FOR_RELEASING", label: "For Releasing" },
  FOR_RELEASING: { value: "COMPLETED", label: "Completed" },
};

const BulkStatusModal = ({
  open,
  onClose,
  bulkStatus,
  setBulkStatus,
  onApply,
  loading,
  affectedCount,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Bulk Change Status
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Select which group to update. Only requests matching the selected
          status will be affected.
        </p>

        {/* From → To Row */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1 block">
              All
            </label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              <option value="">Select status...</option>
              <option value="PROCESSING">Processing</option>
              <option value="FOR_RELEASING">For Releasing</option>
            </select>
          </div>

          <div className="mt-4 text-gray-400 text-sm">→</div>

          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1 block">
              Change to
            </label>
            <div className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-1.5 text-xs text-gray-500">
              {bulkStatus ? bulkStatusTarget[bulkStatus]?.label : "—"}
            </div>
          </div>
        </div>

        {/* Count */}
        {bulkStatus && (
          <p className="text-xs text-gray-400 mt-3">
            {affectedCount} request{affectedCount !== 1 ? "s" : ""} will be
            updated.
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={!bulkStatus || loading || affectedCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkStatusModal;
