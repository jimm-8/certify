import React, { useEffect, useState } from "react";
import {
  FaRegFile,
  FaSearch,
  FaRegClock,
  FaRegEnvelope,
  FaBullhorn,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
} from "react-icons/fa";
import CARDBG from "../../assets/card_bg.webp";
import requestService from "../../services/requestService";

const OdrRequestTracker = () => {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestData, setRequestData] = useState(null);

  const trackRequest = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setError(null);
        setRequestData(null);
        setLoading(true);
      }
      const data = await requestService.trackRequest(referenceNumber, pin);
      setRequestData(data);
    } catch (err) {
      if (silent) return;
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail;

        if (status === 404) {
          setError(
            "Request not found. Please check your reference number and PIN.",
          );
        } else if (status === 400) {
          setError(detail || "Invalid request. Please try again.");
        } else {
          setError("An error occurred. Please try again later.");
        }
      } else if (err.request) {
        setError(
          "Cannot connect to server. Please check your internet connection.",
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();

    if (!referenceNumber.trim()) {
      setError("Please enter a reference number");
      return;
    }

    if (!pin.trim()) {
      setError("Please enter your PIN");
      return;
    }

    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits");
      return;
    }

    await trackRequest();
  };

  useEffect(() => {
    if (
      !requestData ||
      !referenceNumber.trim() ||
      !pin.trim() ||
      !["APPROVED", "PROCESSING"].includes(requestData.status)
    ) {
      return undefined;
    }

    const id = setInterval(() => {
      trackRequest({ silent: true });
    }, 5000);

    return () => clearInterval(id);
  }, [requestData, referenceNumber, pin]);

  const getStatusColor = (status) => {
    const colors = {
      SUBMITTED: "text-yellow-700 bg-yellow-100",
      PENDING: "text-yellow-600 bg-yellow-100",
      APPROVED: "text-blue-600 bg-blue-100",
      PROCESSING: "text-purple-600 bg-purple-100",
      FOR_RELEASING: "text-indigo-600 bg-indigo-100",
      RELEASED: "text-green-600 bg-green-100",
      REJECTED: "text-red-600 bg-red-100",
    };
    return colors[status] || "text-gray-600 bg-gray-100";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getQueueSummary = () => {
    if (!requestData?.queue_position || !requestData?.queue_total) return null;
    return `Overall queue position: #${requestData.queue_position} of ${requestData.queue_total}.`;
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 p-1 md:grid-cols-2 xl:grid-cols-3">
        {/* office hours */}
        <div
          style={{ backgroundImage: `url(${CARDBG})` }}
          className="min-h-[220px] rounded-md border border-gray-400 bg-contain bg-bottom bg-no-repeat p-3 md:min-h-[240px] xl:h-[260px]"
        >
          <p className="flex items-center gap-2 p-2 text-lg font-medium text-gray-500 sm:text-xl">
            <FaRegClock className="text-gray-500" />
            Office Hours
          </p>
          <hr />
          <p className="ml-5 mt-3 text-base sm:text-lg">Monday to Friday</p>
          <p className="ml-5 text-base sm:text-lg">8:00 AM to 5:00 PM</p>
        </div>

        {/* contact us */}
        <div
          style={{ backgroundImage: `url(${CARDBG})` }}
          className="rounded-md border border-gray-400 bg-contain bg-bottom bg-no-repeat p-3"
        >
          <p className="flex items-center gap-2 p-2 text-lg font-medium text-gray-500 sm:text-xl">
            <FaRegEnvelope className="text-gray-500" />
            Contact Us
          </p>
          <hr />
          <p className="text-sm ml-5 mt-3">
            <a
              href="mailto:registrar.pb@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.pb@g.batstate-u.edu.ph
            </a>
          </p>

          <p className="text-sm ml-5">
            <a
              href="mailto:registrar.alangilan@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.alangilan@g.batstate-u.edu.ph
            </a>
          </p>

          <p className="text-sm ml-5">
            <a
              href="mailto:registrar.lipa@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.lipa@g.batstate-u.edu.ph
            </a>
          </p>

          <p className="text-sm ml-5">
            <a
              href="mailto:registrar.nasugbu@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.nasugbu@g.batstate-u.edu.ph
            </a>
          </p>

          <p className="text-sm ml-5">
            <a
              href="mailto:registrar.malvar@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.malvar@g.batstate-u.edu.ph
            </a>
          </p>
        </div>

        {/* advisory */}
        <div
          style={{ backgroundImage: `url(${CARDBG})` }}
          className="rounded-md border border-gray-400 bg-contain bg-bottom bg-no-repeat p-3"
        >
          <p className="flex items-center gap-2 p-2 text-lg font-medium text-gray-500 sm:text-xl">
            <FaBullhorn className="text-gray-500" />
            Advisory
          </p>
          <hr />
          <p className="text-sm mt-3">
            Your document request PIN (4 digit) together with the REFERENCE NO.
            is now required for tracking. You can find the PIN on the
            confirmation email sent to you. You can ask the assistance of the
            Registration Services office if you accidentally deleted the email.
          </p>
        </div>
      </div>
      <div className="max-w-full border-[#17a2b8] border-2 rounded-md bg-[#d1ecf1] p-3 m-1">
        <p className="flex items-start text-[#0c5460] gap-2">
          <FaInfoCircle className="mt-1 text-xl" />
          <span>
            To track the status of your document request, please enter the{" "}
            <span className="font-bold">REFERENCE NUMBER</span> and{" "}
            <span className="font-bold">PIN</span> below.
          </span>
        </p>
      </div>

      <div className="w-full max-w-full translate-y-4 p-1">
        <div className="mb-10 flex flex-col overflow-hidden rounded-md border border-gray-900 bg-white lg:flex-row lg:items-stretch">
          {/* Reference Number Section */}
          <div className="flex flex-col border-b border-gray-300 sm:flex-row lg:flex-1 lg:border-b-0 lg:border-r">
            <label className="whitespace-nowrap border-b border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 sm:border-b-0 sm:border-r">
              Reference Number
            </label>
            <input
              type="text"
              placeholder="Reference No."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              disabled={loading}
              className="w-full min-w-0 px-3 py-2 text-sm outline-none"
            />
          </div>

          {/* PIN Section */}
          <div className="flex flex-col border-b border-gray-300 sm:flex-row lg:flex-1 lg:border-b-0 lg:border-r">
            <label className="border-b border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 sm:border-b-0 sm:border-r">
              PIN
            </label>
            <input
              type="password"
              placeholder="4 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              maxLength={4}
              inputMode="numeric"
              className="w-full min-w-0 px-3 py-2 text-sm outline-none"
            />
          </div>

          {/* Track Button */}
          <button
            onClick={handleTrack} // Add this!
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-gray-100 px-3 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 lg:px-4"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" size={16} />
                Tracking...
              </>
            ) : (
              <>
                <FaSearch size={16} />
                Track
              </>
            )}
          </button>
        </div>
      </div>
      {/* Error Message */}
      {error && (
        <div className="max-w-full border-red-400 border-2 rounded-md bg-red-50 p-3 m-1 mb-4">
          <p className="flex items-start text-red-700 gap-2">
            <FaTimesCircle className="mt-1 text-xl" />
            <span>{error}</span>
          </p>
        </div>
      )}

      {/* Success - Display Request Data */}
      {requestData && (
        <div className="max-w-full border-green-400 border-2 rounded-md bg-green-50 p-3 m-1 mb-4">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <FaCheckCircle className="text-2xl" />
            <h3 className="text-xl font-semibold">Request Found!</h3>
          </div>

          <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <FaRegFile className="text-gray-400 text-2xl" />
                <div>
                  <p className="text-sm text-gray-500 mb-0.5">
                    Document Request
                  </p>
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 border border-gray-200 rounded px-2 py-0.5">
                    {requestData.reference_number}
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(requestData.status)}`}
              >
                {["APPROVED", "PROCESSING"].includes(requestData.status) && (
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                )}
                {requestData.status.replace(/_/g, " ")}
              </span>
            </div>

            {/* Step Progress Track */}
            <div className="flex items-center px-5 pt-5 pb-1">
              {[
                { key: "SUBMITTED", label: "Submitted" },
                { key: "APPROVED", label: "Approved" },
                { key: "PROCESSING", label: "Processing" },
                { key: "FOR_RELEASING", label: "For releasing" },
                { key: "RELEASED", label: "Released" },
              ].map((step, i, arr) => {
                const order = [
                  "SUBMITTED",
                  "APPROVED",
                  "PROCESSING",
                  "FOR_RELEASING",
                  "RELEASED",
                ];
                const currentIdx = order.indexOf(requestData.status);
                const stepIdx = order.indexOf(step.key);
                const isDone = stepIdx < currentIdx;
                const isActive = stepIdx === currentIdx;
                const isRejected = requestData.status === "REJECTED";

                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs z-10 flex-shrink-0
                  ${
                    isDone
                      ? "bg-blue-500 border-blue-500 text-white"
                      : isActive && !isRejected
                        ? "bg-blue-100 border-blue-500"
                        : isRejected && isActive
                          ? "bg-red-100 border-red-400"
                          : "bg-white border-gray-300"
                  }`}
                      >
                        {isDone && (
                          // <FaCheckCircle className="text-white text-[8px]" />
                          <></>
                        )}
                      </div>
                      <p
                        className={`text-[10px] mt-1 text-center leading-tight
                  ${
                    isDone
                      ? "text-gray-500"
                      : isActive && !isRejected
                        ? "text-blue-600 font-medium"
                        : isRejected && isActive
                          ? "text-red-500"
                          : "text-gray-400"
                  }`}
                      >
                        {step.label}
                      </p>
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 -mt-5 ${stepIdx < currentIdx ? "bg-blue-500" : "bg-gray-200"}`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Single-Row Details */}
            <div className="grid grid-cols-4 border-t border-gray-200 mt-3">
              {[
                { label: "Student name", value: requestData.student_name },
                {
                  label: "Document type",
                  value:
                    requestData.request_label || requestData.certificate_type,
                },
                {
                  label: "Submitted",
                  value: new Date(
                    requestData.submitted_date,
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }),
                },
                {
                  label: "Last updated",
                  value: requestData.updated_date
                    ? new Date(requestData.updated_date).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "short", day: "numeric" },
                      )
                    : "—",
                },
              ].map((item, i, arr) => (
                <div
                  key={item.label}
                  className={`px-4 py-3 ${i < arr.length - 1 ? "border-r border-gray-200" : ""}`}
                >
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                    {item.label}
                  </p>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Queue Section */}
            {requestData.queue_position && requestData.queue_total && (
              <div className="flex items-center gap-6 px-5 py-4 border-t border-gray-200">
                {/* Big Queue Number */}
                <div className="flex-shrink-0 w-24 text-center bg-gray-50 border border-gray-200 rounded-lg py-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                    Queue no.
                  </p>
                  <p className="text-4xl font-medium text-blue-600 leading-none">
                    #{requestData.queue_position}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    of {requestData.queue_total}
                  </p>
                </div>

                {/* Bar + Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      {requestData.queue_scope === "waiting" &&
                        "Waiting for an available processor"}
                      {requestData.queue_scope === "processor" &&
                        "Your position in the processor queue"}
                      {requestData.queue_scope === "processing" &&
                        "Your position in processing"}
                      {!requestData.queue_scope && "Your queue position"}
                    </p>
                    <p className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {requestData.queue_position - 1} ahead of you
                    </p>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${(requestData.queue_position / requestData.queue_total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                    <FaSpinner className="animate-spin text-[10px]" />
                    Auto-refreshes every 5 seconds
                  </p>
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className="flex items-start gap-2 px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
              <FaInfoCircle className="mt-0.5 flex-shrink-0" />
              <span>
                {requestData.status === "SUBMITTED" &&
                  "Your request has been received and is waiting for handling."}
                {requestData.status === "PENDING" &&
                  "Your request is waiting for registrar review."}
                {requestData.status === "APPROVED" &&
                  "Your request has been approved and will be processed soon."}
                {requestData.status === "PROCESSING" &&
                  "Your certificate is being generated."}
                {requestData.status === "FOR_RELEASING" &&
                  "Your certificate is ready for release!"}
                {requestData.status === "RELEASED" &&
                  "Your certificate has been released."}
                {requestData.status === "REJECTED" &&
                  "Your request was rejected. Please contact the registrar's office."}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OdrRequestTracker;
