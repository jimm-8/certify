import React from "react";

const toneClasses = {
  success: "border-green-200 bg-green-50 text-green-700",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  default: "border-gray-200 bg-gray-50 text-gray-700",
};

const FeedbackDialog = ({
  open,
  title,
  message,
  tone = "default",
  confirmLabel = "OK",
  cancelLabel = "",
  loading = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  const accentClass = toneClasses[tone] || toneClasses.default;
  const handleBackdropClose = () => {
    if (loading) return;
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
      onClick={handleBackdropClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-xs font-medium ${accentClass}`}
        >
          {title}
        </div>
        <p className="text-sm leading-6 text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          {cancelLabel && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm || onClose}
            disabled={loading}
            className="rounded-md bg-[#ee1133] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDialog;
