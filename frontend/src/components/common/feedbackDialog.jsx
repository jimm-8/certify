import React from "react";
import {
  CiCircleAlert,
  CiCircleCheck,
  CiCircleRemove,
  CiCircleInfo,
  CiCircleMore,
  CiVolumeHigh,
  CiVolumeMute,
} from "react-icons/ci";
import { LiaTimesSolid } from "react-icons/lia";

const toneClasses = {
  success:
    "border-[var(--school-green)]/30 bg-[var(--school-green)]/10 text-[var(--school-green)]",
  error:
    "border-[var(--school-crimson)]/25 bg-[var(--school-crimson)]/10 text-[var(--school-crimson)]",
  warning:
    "border-[var(--school-gold)]/40 bg-[var(--school-gold)]/15 text-[#9a6100]",
  info: "border-[var(--school-blue)]/25 bg-[var(--school-blue)]/10 text-[var(--school-blue)]",
  default:
    "border-[var(--school-gray)]/25 bg-[var(--school-ivory)] text-[var(--school-ink)]",
};

const FeedbackDialog = ({
  open,
  title,
  message,
  tone = "default",
  confirmLabel = "Got it",
  cancelLabel = "",
  loading = false,
  confirmDisabled = false,
  showSoundToggle = false,
  soundMuted = false,
  children,
  onConfirm,
  onClose,
  onSoundToggle,
}) => {
  if (!open) return null;

  const accentClass = toneClasses[tone] || toneClasses.default;

  const handleConfirm = () => {
    if (loading || confirmDisabled) return;
    if (onConfirm) onConfirm();
    else onClose?.();
  };

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]">
      <div
        className="relative w-full max-w-sm rounded-xl border border-[var(--school-border)] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SOUND TOGGLE — top-left */}
        {showSoundToggle && onSoundToggle && (
          <button
            type="button"
            onClick={onSoundToggle}
            className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-md border border-[var(--school-border)] px-1 py-1 text-xs font-medium text-gray-600 transition hover:bg-[var(--school-ivory)]"
            aria-label={soundMuted ? "Unmute alert sound" : "Mute alert sound"}
          >
            {soundMuted ? (
              <CiVolumeMute size={18} />
            ) : (
              <CiVolumeHigh size={18} />
            )}
            {soundMuted ? "Sound Off" : "Sound On"}
          </button>
        )}

        {/* CLOSE (X) — top-right */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute right-3 top-3 rounded-md border border-[var(--school-border)] p-1 text-gray-400 transition hover:bg-[var(--school-ivory)] hover:text-[var(--school-ink)] disabled:opacity-50"
        >
          <LiaTimesSolid size={15} />
        </button>

        {/* ICON */}
        <div className="mb-2 mt-6 flex w-full justify-center">
          <div
            className={`flex items-center justify-center rounded-md border p-2 ${accentClass}`}
          >
            {tone === "success" && <CiCircleCheck size={24} />}
            {tone === "error" && <CiCircleRemove size={24} />}
            {tone === "warning" && <CiCircleAlert size={24} />}
            {tone === "info" && <CiCircleInfo size={24} />}
            {tone === "default" && <CiCircleMore size={24} />}
          </div>
        </div>

        {/* TEXT */}
        <h2 className="text-center text-xl font-semibold text-[var(--school-ink)]">
          {title}
        </h2>
        {message && (
          <p className="text-xs text-center leading-6 text-gray-600">
            {message}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        {/* ACTIONS */}
        <div className="mt-5 flex flex-col-reverse gap-2">
          {cancelLabel && (
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full rounded-md border border-[var(--school-border)] bg-white px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-[var(--school-ivory)] disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || confirmDisabled}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-[var(--school-crimson)] bg-[var(--school-crimson)] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#b61d24] disabled:opacity-50"
          >
            {loading && (
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDialog;
