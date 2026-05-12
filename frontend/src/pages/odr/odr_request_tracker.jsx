import React, { useState } from "react";
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

  const handleTrack = async (e) => {
    e.preventDefault();

    // Validation
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

    // Clear previous error and data
    setError(null);
    setRequestData(null);
    setLoading(true);

    try {
      // Call API
      const data = await requestService.trackRequest(referenceNumber, pin);
      setRequestData(data);
    } catch (err) {
      // Handle errors
      if (err.response) {
        // Server responded with error
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
        // Network error
        setError(
          "Cannot connect to server. Please check your internet connection.",
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div className="max-w-full border-green-400 border-2 rounded-md bg-green-50 p-4 m-1 mb-4">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <FaCheckCircle className="text-2xl" />
            <h3 className="text-xl font-semibold">Request Found!</h3>
          </div>

          <div className="bg-white rounded-md p-4 border border-gray-200">
            {/* Status Badge */}
            <div className="mb-4">
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                  requestData.status,
                )}`}
              >
                {requestData.status.replace(/_/g, " ")}
              </span>
            </div>

            {/* Request Details */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Reference Number</p>
                <p className="font-semibold">{requestData.reference_number}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Requested Document</p>
                <p className="font-semibold">
                  {requestData.request_label || requestData.certificate_type}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="font-semibold">{requestData.student_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Submitted Date</p>
                <p className="font-semibold">
                  {formatDate(requestData.submitted_date)}
                </p>
              </div>

              {requestData.updated_date && (
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-semibold">
                    {formatDate(requestData.updated_date)}
                  </p>
                </div>
              )}
            </div>

            {/* Status Timeline (Optional - you can expand this) */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {requestData.status === "SUBMITTED" &&
                  "Your request has been received and is waiting for handling."}
                {requestData.status === "PENDING" &&
                  "Your request is waiting for registrar review."}
                {requestData.status === "APPROVED" &&
                  "Your request has been approved and will be processed soon."}
                {requestData.status === "PROCESSING" &&
                  "Your certificate is being generated."}
                {requestData.status === "FOR_RELEASING" &&
                  "Your certificate is ready for pickup!"}
                {requestData.status === "RELEASED" &&
                  "Your certificate has been released."}
                {requestData.status === "REJECTED" &&
                  "Your request was rejected. Please contact the registrar's office."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OdrRequestTracker;
