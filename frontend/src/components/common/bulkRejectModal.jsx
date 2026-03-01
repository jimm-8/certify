import React from "react";

const BulkRejectModal = ({
  open,
  onClose,
  onConfirm,
  loading,
  notes,
  setNotes,
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
          Reject All Requests
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          This will reject{" "}
          <span className="font-medium text-gray-600">
            {affectedCount} request{affectedCount !== 1 ? "s" : ""}
          </span>
          . Please provide a reason — this will be included in the notification
          sent to each requestor.
        </p>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5 block">
            Reason for Rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter the reason for rejecting these requests..."
            className="w-full text-xs text-gray-700 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-400 resize-none placeholder:text-gray-400"
          />
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!notes.trim() || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Confirm Reject All
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkRejectModal;
