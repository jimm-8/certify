import React, { useEffect, useRef, useState } from "react";
import requestService from "../../services/requestService";
import {
  BsX,
  BsCheckCircle,
  BsXCircle,
  BsPersonFill,
  BsFileEarmarkText,
  BsCalendar3,
  BsTag,
  BsBookFill,
  BsClock,
  BsHash,
} from "react-icons/bs";

const statusConfig = {
  PENDING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    ring: "ring-yellow-200",
  },
  APPROVED: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  PROCESSING: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  FOR_RELEASING: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    ring: "ring-purple-200",
  },
  RELEASED: { bg: "bg-gray-100", text: "text-gray-600", ring: "ring-gray-200" },
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-400">
      <Icon size={13} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
        {label}
      </p>
      <p className="text-sm text-gray-800 font-medium break-words">
        {value || "—"}
      </p>
    </div>
  </div>
);

const RequestModal = ({
  request,
  onClose,
  onApprove,
  onDecline,
  loading = false,
  readOnly = false,
}) => {
  const overlayRef = useRef(null);
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineNotes, setDeclineNotes] = useState("");
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!request) return;
    const handler = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [request, onClose]);

  useEffect(() => {
    if (!request) {
      setShowDeclineInput(false);
      setDeclineNotes("");
      setNotes([]);
      return;
    }
    if (request.status === "REJECTED") {
      requestService
        .getRequestNotes(request.id)
        .then(setNotes)
        .catch(() => setNotes([]));
    }
  }, [request]);

  const handleDeclineClick = () => {
    if (!showDeclineInput) {
      setShowDeclineInput(true); // first click: show input
    } else {
      onDecline?.(request, declineNotes); // second click: confirm
    }
  };

  /* lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = request ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [request]);

  if (!request) return null;

  const status = request.status?.toUpperCase() ?? "PENDING";
  const sc = statusConfig[status] ?? statusConfig.PENDING;
  const canAct = status === "PENDING" || status === "PROCESSING";

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  return (
    /* ── Backdrop ── */
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-4"
      style={{ animation: "fadeIn 150ms ease" }}
    >
      {/* ── Panel ── */}
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{ animation: "slideUp 200ms ease" }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 px-6 pt-3 pb-3 border-b border-gray-100">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Certificate Request
            </p>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              {request.certificate_type_name || "Request Details"}
            </h2>
          </div>

          <div className="flex items-center gap-2 mt-2  shrink-0">
            {/* Status badge */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}
            >
              {status}
            </span>
            {/* Close */}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <BsX size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-2 max-h-[60vh] overflow-y-auto">
          <DetailRow
            icon={BsHash}
            label="Reference No."
            value={request.reference_number}
          />
          <DetailRow
            icon={BsPersonFill}
            label="Student Name"
            value={request.student_name}
          />
          <DetailRow
            icon={BsBookFill}
            label="Program"
            value={request.program}
          />
          <DetailRow
            icon={BsBookFill}
            label="Major"
            value={request.major || "—"}
          />
          <DetailRow
            icon={BsBookFill}
            label="Year Graduated"
            value={request.year_graduated}
          />
          <DetailRow
            icon={BsFileEarmarkText}
            label="Purpose"
            value={request.purpose}
          />
          <DetailRow
            icon={BsPersonFill}
            label="Requestor Name"
            value={request.requestor_name}
          />
          <DetailRow
            icon={BsPersonFill}
            label="Requestor Relationship"
            value={request.requestor_relationship}
          />
          <DetailRow
            icon={BsCalendar3}
            label="Date Requested"
            value={
              request.created_at
                ? new Date(request.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"
            }
          />
          {request.remarks && (
            <DetailRow icon={BsTag} label="Remarks" value={request.remarks} />
          )}
          {request.updated_at && (
            <DetailRow
              icon={BsClock}
              label="Last Updated"
              value={new Date(request.updated_at).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          )}
          <DetailRow
            icon={BsPersonFill}
            label="Requestor Signature"
            value={
              request.signature_data ? (
                <img
                  src={
                    request.signature_data.startsWith("data:image")
                      ? request.signature_data
                      : `data:image/png;base64,${request.signature_data}` // ✅ add prefix if missing
                  }
                  alt="Requestor Signature"
                  className="w-48 h-20 object-contain border border-gray-200 rounded bg-white"
                  onError={(e) => {
                    e.target.style.display = "none"; // hide if still broken
                  }}
                />
              ) : (
                "No signature uploaded"
              )
            }
          />
          {request.status === "REJECTED" && (
            <div className="mt-2 rounded-md border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-red-400 font-semibold mb-2">
                Reason for Rejection
              </p>
              {notes.length > 0 ? (
                notes.map((n) => (
                  <div key={n.id} className="mb-2 last:mb-0">
                    <p className="text-xs text-red-700">{n.note}</p>
                    <p className="text-[10px] text-red-400 mt-0.5">
                      {new Date(n.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {n.user_name && ` · ${n.user_name}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-red-400 italic">
                  No reason provided.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          {/* Decline notes input — shown after clicking Decline */}
          {showDeclineInput && (
            <div className="mb-3">
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
                placeholder="Enter the reason for rejecting this request. This will be included in the email sent to the student."
                className="w-full text-xs text-gray-700 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-400 resize-none placeholder:text-gray-400"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowDeclineInput(false);
                setDeclineNotes("");
                onClose();
              }}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Close
            </button>

            {canAct && !readOnly && (
              <>
                <button
                  onClick={handleDeclineClick}
                  disabled={
                    loading || (showDeclineInput && !declineNotes.trim())
                  }
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <BsXCircle size={13} />
                  {showDeclineInput ? "Confirm Rejection" : "Decline"}
                </button>

                {!showDeclineInput && (
                  <button
                    onClick={() => onApprove?.(request)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#ee1133] border border-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <BsCheckCircle size={13} />
                    )}
                    Approve
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Keyframe animations (injected once) ── */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }               to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
};

export default RequestModal;
