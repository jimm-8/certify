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
  BsExclamationTriangleFill,
  BsCheckCircleFill,
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
  REJECTED: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200" },
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 border-b border-gray-100 py-2 last:border-0">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-400">
      <Icon size={13} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p className="break-words text-sm font-medium text-gray-800">
        {value || "-"}
      </p>
    </div>
  </div>
);

const RequestModal = ({
  request,
  onClose,
  onApprove,
  onRejectAndSend,
  loading = false,
  readOnly = false,
  validationFlags = [],
  onSendRejectionEmail,
  rejectionEmailLoading = false,
}) => {
  const overlayRef = useRef(null);
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineNotes, setDeclineNotes] = useState("");
  const [notes, setNotes] = useState([]);
  const [rejectionEmailNotes, setRejectionEmailNotes] = useState("");

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
      setRejectionEmailNotes("");
      return;
    }

    if (request.status === "REJECTED") {
      setShowDeclineInput(false);
      requestService
        .getRequestNotes(request.id)
        .then(setNotes)
        .catch(() => setNotes([]));
    }
  }, [request]);

  useEffect(() => {
    if (!request || request.status !== "REJECTED") return;
    const latest = notes.length ? notes[0]?.note : "";
    setRejectionEmailNotes(latest || "");
  }, [request, notes]);

  useEffect(() => {
    document.body.style.overflow = request ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [request]);

  if (!request) return null;

  const status = request.status?.toUpperCase() ?? "PENDING";
  const sc = statusConfig[status] ?? statusConfig.PENDING;
  const canAct =
    status === "PENDING" || status === "PROCESSING" || status === "APPROVED";
  const isRejected = status === "REJECTED";
  const normalizedValidation = Array.isArray(validationFlags)
    ? validationFlags
    : [];
  const hasValidationFlags = normalizedValidation.length > 0;

  const buildSuggestedNotes = (flags) => {
    const suggestions = [];
    const pushUnique = (text) => {
      if (!text) return;
      if (!suggestions.includes(text)) suggestions.push(text);
    };

    flags.forEach((flag) => {
      const lower = String(flag).toLowerCase();
      if (lower.includes("invalid input detected in")) {
        const label = String(flag)
          .replace(/invalid input detected in\s*/i, "")
          .replace(/\.$/, "")
          .trim()
          .toLowerCase();
        const pretty = label.length > 0 ? label : "the provided fields";
        pushUnique(
          `Please provide valid ${pretty} (avoid random characters or unsafe symbols).`,
        );
        return;
      }
      if (lower.includes("missing sr code")) {
        pushUnique("SR code is missing. Please provide a valid SR code.");
        return;
      }
      if (lower.includes("student record not found")) {
        pushUnique(
          "Student record not found in the registry. Please verify the SR code and student details.",
        );
        return;
      }
      if (lower.includes("student name does not match")) {
        pushUnique(
          "Student name does not match the registry. Please correct the student name.",
        );
        return;
      }
      if (lower.includes("program does not match")) {
        pushUnique(
          "Program does not match the registry. Please correct the program information.",
        );
        return;
      }
      if (lower.includes("campus could not be verified")) {
        pushUnique(
          "Campus could not be verified. Please confirm the campus details.",
        );
        return;
      }
      if (lower.includes("year graduated must be a 4-digit year")) {
        pushUnique(
          "Year graduated must be a 4-digit year (e.g., 2024). Please correct it.",
        );
        return;
      }
      if (lower.includes("graduation year is 2022 or below")) {
        pushUnique(
          "Graduation year is 2022 or below. Please verify the graduation year.",
        );
        return;
      }
      if (lower.includes("student is not yet graduated")) {
        pushUnique(
          "Student is not yet graduated. Request cannot be processed until graduation is confirmed.",
        );
        return;
      }
      if (lower.includes("no latin honor record found")) {
        pushUnique(
          "No latin honor record was found. Request cannot be processed as an honor graduate certificate until the latin honor is verified.",
        );
        return;
      }
      if (lower.includes("requested gwa certificate")) {
        pushUnique(
          "GWA certificates are only for graduated students. Please confirm the student's graduation record first.",
        );
        return;
      }
      if (lower.includes("requested cav certificate")) {
        pushUnique(
          "CAV certificates are only for graduated students. Please confirm the student's graduation record first.",
        );
        return;
      }
      if (lower.includes("requested honor graduate certificate")) {
        pushUnique(
          "Honor graduate certificates require a matching graduation record and latin honor record. Please verify both first.",
        );
      }
    });

    if (!suggestions.length && flags.length) {
      pushUnique(
        "Please review the flagged details and resubmit with corrected information.",
      );
    }
    return suggestions;
  };

  const suggestedNotes = buildSuggestedNotes(normalizedValidation);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const handleDeclineClick = () => {
    setShowDeclineInput((current) => !current);
  };

  const appendDeclineNote = (text) => {
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setDeclineNotes((prev) => {
      if (!prev) return trimmed;
      if (prev.includes(trimmed)) return prev;
      return `${prev}\n${trimmed}`;
    });
  };

  const handleApproveClick = async () => {
    if (!request || !onApprove) return;
    await onApprove(request);
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
      style={{ animation: "fadeIn 150ms ease" }}
    >
      <div
        className="relative w-full max-w-2xl overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl"
        style={{ animation: "slideUp 200ms ease" }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 pb-3 pt-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Certificate Request
            </p>
            <h2 className="text-base font-semibold leading-tight text-gray-900">
              {request.certificate_type_name || "Request Details"}
            </h2>
          </div>

          <div className="mt-2 flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}
            >
              {status}
            </span>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <BsX size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-7 py-2">
          <div className="rounded-md border border-amber-500 bg-amber-50 px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
                Validation Status
              </p>
              {hasValidationFlags ? (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <BsExclamationTriangleFill size={11} /> Needs Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <BsCheckCircleFill size={11} /> Clear
                </span>
              )}
            </div>
            <div className="ml-2 text-xs text-amber-700">
              {hasValidationFlags ? (
                <ul className="list-disc space-y-1 pl-4">
                  {normalizedValidation.map((flag, idx) => (
                    <li key={`${flag}-${idx}`}>{flag}</li>
                  ))}
                </ul>
              ) : (
                <p className="ml-2 text-[11px] text-emerald-700">
                  No anomalies detected from the automatic checks.
                </p>
              )}
            </div>
          </div>

          <DetailRow icon={BsHash} label="Reference No." value={request.reference_number} />
          <DetailRow icon={BsHash} label="SR-Code" value={request.sr_code || "-"} />
          <DetailRow icon={BsPersonFill} label="Student Name" value={request.student_name} />
          <DetailRow icon={BsBookFill} label="Program" value={request.program} />
          <DetailRow icon={BsBookFill} label="Major" value={request.major || "-"} />
          <DetailRow
            icon={BsBookFill}
            label="Year Graduated"
            value={request.year_graduated || "-"}
          />
          <DetailRow icon={BsFileEarmarkText} label="Purpose" value={request.purpose} />
          <DetailRow icon={BsPersonFill} label="Requestor Name" value={request.requestor_name} />
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
                : "-"
            }
          />
          {request.remarks && <DetailRow icon={BsTag} label="Remarks" value={request.remarks} />}
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
                  loading="lazy"
                  src={
                    request.signature_data.startsWith("data:image")
                      ? request.signature_data
                      : `data:image/png;base64,${request.signature_data}`
                  }
                  alt="Requestor Signature"
                  className="h-20 w-48 rounded border border-gray-200 bg-white object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                "No signature uploaded"
              )
            }
          />

          {request.status === "REJECTED" && (
            <div className="mt-2 rounded-md border border-red-100 bg-red-50 px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-red-400">
                Reason for Rejection
              </p>
              {notes.length > 0 ? (
                notes.map((n) => (
                  <div key={n.id} className="mb-2 last:mb-0">
                    <p className="text-xs text-red-700">{n.note}</p>
                    <p className="mt-0.5 text-[10px] text-red-400">
                      {new Date(n.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {n.user_name && ` | ${n.user_name}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs italic text-red-400">No reason provided.</p>
              )}
            </div>
          )}

          {showDeclineInput && (
            <div className="mb-3 mt-3">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {suggestedNotes.length > 0 && (
                  <div className="pointer-events-none absolute left-2 right-2 top-2 z-10 flex max-h-16 flex-wrap gap-2 overflow-y-auto pr-1">
                    {suggestedNotes.map((note, idx) => (
                      <button
                        key={`${note}-${idx}`}
                        type="button"
                        onClick={() => appendDeclineNote(note)}
                        className="pointer-events-auto rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 transition-colors hover:bg-red-100"
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  rows={5}
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  placeholder="Enter the reason for rejecting this request. This will be included in the email sent to the student."
                  className="w-full resize-none overflow-y-auto rounded-md border border-gray-300 px-3 pb-2 pt-12 text-xs text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-300"
                />
              </div>
            </div>
          )}

          {isRejected && !readOnly && (
            <div className="mb-3">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Rejection Email Note
              </label>
              <textarea
                rows={3}
                value={rejectionEmailNotes}
                onChange={(e) => setRejectionEmailNotes(e.target.value)}
                placeholder="Optional message to include in the rejection email."
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-300"
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowDeclineInput(false);
                setDeclineNotes("");
                onClose();
              }}
              disabled={loading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors disabled:opacity-50"
            >
              Close
            </button>

            {isRejected && !readOnly && (
              <button
                onClick={() => onSendRejectionEmail?.(request, rejectionEmailNotes)}
                disabled={loading || rejectionEmailLoading || !request?.requestor_email}
                className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {rejectionEmailLoading ? "..." : "Send Rejection Email"}
              </button>
            )}

            {canAct && !readOnly && (
              <>
                <button
                  onClick={handleDeclineClick}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  <BsXCircle size={13} />
                  {showDeclineInput ? "Cancel" : "Reject"}
                </button>

                {showDeclineInput ? (
                  <button
                    onClick={() => onRejectAndSend?.(request, declineNotes)}
                    disabled={loading || rejectionEmailLoading || !declineNotes.trim()}
                    className="flex items-center gap-1.5 rounded-md border border-red-600 bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectionEmailLoading ? "..." : "Send Rejection Email"}
                  </button>
                ) : (
                  <button
                    onClick={handleApproveClick}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-md border border-[#ee1133] bg-[#ee1133] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    <BsCheckCircle size={13} />
                    Approve
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }               to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
};

export default RequestModal;
