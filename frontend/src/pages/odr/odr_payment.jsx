import React, { useState } from "react";
import paymentService from "../../services/paymentService";
import studentService from "../../services/studentService";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

const OdrPayment = () => {
  const [srCode, setSrCode] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [requestInfo, setRequestInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [orNumber, setOrNumber] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleStudentLookup = async () => {
    if (!srCode.trim()) {
      setLookupError("Please enter an SR Code.");
      return;
    }
    setLoading(true);
    setLookupError("");
    setStudentInfo(null);
    setRequestInfo(null);
    setSuccess(false);
    try {
      const data = await studentService.getStudentBySrCode(srCode.trim());
      setStudentInfo(data);
    } catch (err) {
      setLookupError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to find student.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLookup = async () => {
    if (!referenceNumber.trim()) {
      setLookupError("Please enter the reference number.");
      return;
    }
    setLoading(true);
    setLookupError("");
    setRequestInfo(null);
    setSuccess(false);
    try {
      const data = await paymentService.lookupByReference(
        referenceNumber.trim(),
      );
      setRequestInfo(data);
      setAmount(data.request_cost ? String(data.request_cost) : "");
      if (studentInfo?.sr_code && data.sr_code && data.sr_code !== studentInfo.sr_code) {
        setLookupError("SR Code does not match the request.");
        setRequestInfo(null);
      }
    } catch (err) {
      setLookupError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to find request.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!requestInfo) return;
    if (!amount || Number.isNaN(Number(amount))) {
      setSubmitError("Please enter a valid amount.");
      return;
    }
    setSubmitError("");
    setLoading(true);
    try {
      await paymentService.createPaymentByReference({
        reference_number: requestInfo.reference_number,
        amount: Number(amount),
        purpose: referenceNumber.trim(),
        payment_method: paymentMethod,
        payment_status: "PAID",
        or_number: orNumber || null,
      });
      setSuccess(true);
      setRequestInfo(null);
      setStudentInfo(null);
      setReferenceNumber("");
      setSrCode("");
      setAmount("");
      setPaymentMethod("Cash");
      setOrNumber("");
    } catch (err) {
      setSubmitError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to record payment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">
          ODR Payment (Cashier Simulation)
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Enter the SR Code first, then the reference number from the request.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={srCode}
            onChange={(e) => setSrCode(e.target.value)}
            placeholder="SR Code (e.g. 22-00001)"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={handleStudentLookup}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Find Student"}
          </button>
        </div>

        {lookupError && (
          <div className="mt-3 text-xs text-red-600 flex items-center gap-2">
            <FaExclamationCircle /> {lookupError}
          </div>
        )}

        {success && (
          <div className="mt-3 text-xs text-green-600 flex items-center gap-2">
            <FaCheckCircle /> Payment recorded successfully.
          </div>
        )}

        {studentInfo && (
          <div className="mt-5 border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Student Information
            </div>
            <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">SR Code:</span> {studentInfo.sr_code}
              </div>
              <div>
                <span className="font-medium">Name:</span>{" "}
                {studentInfo.last_name}, {studentInfo.first_name}
                {studentInfo.suffix ? ` ${studentInfo.suffix}` : ""}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Purpose / Reference Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                onBlur={handleRequestLookup}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRequestLookup();
                  }
                }}
                placeholder="Reference Number (e.g. 26-0328-00001)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Lookup is automatic when you finish typing the purpose/reference.
              </p>
            </div>

            {requestInfo && (
              <div className="mt-4 border border-gray-200 rounded-md p-3 text-xs text-gray-600 grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Reference No.:</span>{" "}
                  {requestInfo.reference_number}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {requestInfo.status}
                </div>
                <div>
                  <span className="font-medium">Student:</span>{" "}
                  {requestInfo.student_name}
                </div>
                <div>
                  <span className="font-medium">Certificate:</span>{" "}
                  {requestInfo.certificate_type_name}
                </div>
                <div>
                  <span className="font-medium">Requestor:</span>{" "}
                  {requestInfo.requestor_name}
                </div>
                <div>
                  <span className="font-medium">Amount:</span>{" "}
                  {requestInfo.request_cost !== null &&
                  requestInfo.request_cost !== undefined
                    ? `Php ${requestInfo.request_cost}`
                    : "N/A"}
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount (Php)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs"
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  OR Number (optional)
                </label>
                <input
                  type="text"
                  value={orNumber}
                  onChange={(e) => setOrNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs"
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-3 text-xs text-red-600 flex items-center gap-2">
                <FaExclamationCircle /> {submitError}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSubmitPayment}
                disabled={loading || !requestInfo}
                className="px-4 py-2 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OdrPayment;
