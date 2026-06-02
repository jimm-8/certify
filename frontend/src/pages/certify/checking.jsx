import React, { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import RequestModal from "../../components/common/requestModal";
import FeedbackDialog from "../../components/common/feedbackDialog";
import { filterCertifyEligibleRequests } from "../../utils/certifyRequestGuard";
import { syncAutoValidationNotifications } from "../../utils/notificationCenter";
import { getTokenPayload } from "../../utils/auth";
import {
  BsSearch,
  BsCalendar3,
  BsChevronDown,
  BsExclamationTriangleFill,
  BsArrowUpRight,
  BsCheckCircleFill,
  BsArrowRepeat,
  BsEnvelopeArrowUp,
  BsEye,
} from "react-icons/bs";

const filterOptions = [
  { label: "Today", days: 0 },
  { label: "Last 3 days", days: 3 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "All time", days: null },
];

const getDateFrom = (days) => {
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
};

const customStyles = {
  headRow: {
    style: {
      backgroundColor: "#f9fafb",
      borderBottomWidth: "1px",
      borderBottomColor: "#e5e7eb",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
    },
  },
  rows: {
    style: {
      fontSize: "13px",
      color: "#374151",
      "&:hover": { backgroundColor: "#f9fafb", cursor: "pointer" },
    },
  },
  pagination: {
    style: {
      fontSize: "0.875rem",
      color: "#6b7280",
      borderTopWidth: "1px",
      borderTopColor: "#e5e7eb",
    },
  },
};

const LoadingState = () => (
  <div className="py-10 text-xs text-gray-400 flex items-center justify-center gap-2">
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
    Loading requests...
  </div>
);

const BulkStatusDialog = ({
  open,
  title,
  message,
  tone,
  current,
  total,
  done,
  onClose,
}) => {
  if (!open || total <= 0) return null;
  const percent = Math.min(Math.round((current / total) * 100), 100);

  return (
    <FeedbackDialog
      open={open}
      title={title}
      message={message}
      tone={tone}
      loading={!done}
      confirmLabel={done ? "Close" : "Working..."}
      onClose={onClose}
    >
      <div className="space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              done ? "bg-green-500" : "bg-[#ee1133]"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>
            {current} of {total} processed
          </span>
          <span className="font-semibold text-gray-700">{percent}%</span>
        </div>
      </div>
    </FeedbackDialog>
  );
};

const Checking = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(filterOptions[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [bulkApproveLoading, setBulkApproveLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [validationMap, setValidationMap] = useState({});
  const [validationLoading, setValidationLoading] = useState(false);
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);
  const [emailLoading, setEmailLoading] = useState({});
  const [composeEmailModal, setComposeEmailModal] = useState({
    open: false,
    request: null,
    subject: "",
    message: "",
  });
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const hasInitializedAnomalyNotificationsRef = useRef(false);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "default",
    loading: false,
    confirmLabel: "Got it",
  });
  const [bulkDialog, setBulkDialog] = useState({
    open: false,
    title: "",
    message: "",
    tone: "info",
    current: 0,
    total: 0,
    done: false,
  });
  const lastAutoQueueAttemptRef = useRef(0);
  const ownerUsername = getTokenPayload()?.sub || "";

  const showFeedback = (title, message, tone = "default", options = {}) => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
      loading: options.loading ?? false,
      confirmLabel: options.confirmLabel || "Got it",
    });
  };

  const showBulkDialog = ({
    title,
    message,
    tone = "info",
    current = 0,
    total = 0,
    done = false,
  }) => {
    setBulkDialog({
      open: true,
      title,
      message,
      tone,
      current,
      total,
      done,
    });
  };

  const getErrorDetail = (
    error,
    fallback = "Failed to process the certificate request.",
  ) =>
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    fallback;

  useEffect(
    () => setCurrentPage(1),
    [search, selectedFilter, selectedType, selectedProgram, showOnlyFlagged],
  );

  const isCourseDescriptionType = (name) =>
    String(name || "")
      .toLowerCase()
      .includes("course description");
  const isGradesType = (name) =>
    String(name || "")
      .toLowerCase()
      .includes("grades");
  const requiresCourseSelection = (name) =>
    isCourseDescriptionType(name) || isGradesType(name);

  const getValidationFlags = (req) => {
    const flags = [];
    const backend = validationMap?.[req?.id] || {};
    const merged = [].concat(backend.flags || []);

    merged.filter(Boolean).forEach((f) => {
      if (typeof f === "string") flags.push(f);
    });

    if (!req?.student_name) flags.push("Missing student name.");
    if (!req?.program) flags.push("Missing program.");
    if (!req?.certificate_type_name) flags.push("Missing certificate type.");
    if (!req?.created_at) flags.push("Missing request date.");
    if (!req?.requestor_name) flags.push("Missing requestor name.");

    const email = req?.requestor_email || req?.email;
    if (!email) {
      flags.push("Missing requestor email.");
    } else {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
      if (!emailOk) flags.push("Invalid requestor email.");
    }

    return Array.from(new Set(flags));
  };

  const fetchRequestsSnapshot = async () => {
    const data = await requestService.getAllRequests({
      page: 1,
      limit: 100,
      ownerUsername,
    });
    const all = filterCertifyEligibleRequests(
      Array.isArray(data) ? data : data.items || [],
    );
    const approved = all.filter((r) => r.status === "PROCESSING");
    let map = {};

    if (approved.length) {
      setValidationLoading(true);
      try {
        const res = await requestService.validateRequests(
          approved.map((r) => r.id),
        );
        const results = res?.results || [];
        map = results.reduce((acc, row) => {
          acc[row.request_id] = {
            exists: row.exists,
            flags: row.flags || [],
          };
          return acc;
        }, {});
      } catch (error) {
        console.error("Validation failed:", error);
      } finally {
        setValidationLoading(false);
      }
    }

    return {
      approved,
      validationMap: map,
    };
  };

  const maybeRefreshAutoQueue = async () => {
    const now = Date.now();
    if (now - lastAutoQueueAttemptRef.current < 30000) return;
    lastAutoQueueAttemptRef.current = now;
    try {
      await requestService.autoQueueApprovedRequests();
    } catch (error) {
      console.error("Auto-queue refresh failed:", error);
    }
  };

  const fetchRequests = async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setLoading(true);
      await maybeRefreshAutoQueue();
      const snapshot = await fetchRequestsSnapshot();
      setRequests(snapshot.approved);
      setValidationMap(snapshot.validationMap);
      setLastUpdatedAt(Date.now());
      return snapshot;
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      throw error;
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [ownerUsername]);

  useEffect(() => {
    const id = setInterval(() => fetchRequests({ silent: true }), 5000);
    return () => clearInterval(id);
  }, [ownerUsername]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    syncAutoValidationNotifications({
      requests,
      validationMap,
      silent: !hasInitializedAnomalyNotificationsRef.current,
    });
    hasInitializedAnomalyNotificationsRef.current = true;
  }, [requests, validationMap]);

  useEffect(() => {
    requestService
      .getCertificateTypes()
      .then(setCertificateTypes)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const programs = [...new Set(requests.map((r) => r.program).filter(Boolean))];

  const filteredRequests = requests.filter((r) => {
    const matchesSearch = Object.values(r).some((val) =>
      String(val).toLowerCase().includes(search.toLowerCase()),
    );
    const dateFrom = getDateFrom(selectedFilter.days);
    const matchesDate = dateFrom
      ? new Date(r.created_at).toISOString().split("T")[0] >= dateFrom
      : true;
    const matchesType = selectedType
      ? r.certificate_type_name === selectedType
      : true;
    const matchesProgram = selectedProgram
      ? r.program === selectedProgram
      : true;
    const flags = getValidationFlags(r);
    const matchesFlagged = showOnlyFlagged ? flags.length > 0 : true;
    return (
      matchesSearch &&
      matchesDate &&
      matchesType &&
      matchesProgram &&
      matchesFlagged
    );
  });

  const lastUpdatedLabel = lastUpdatedAt
    ? `${Math.max(0, Math.floor((nowTick - lastUpdatedAt) / 1000))}s ago`
    : "-";

  const isTimeoutLikeError = (error) =>
    error?.code === "ECONNABORTED" ||
    error?.name === "AbortError" ||
    /timeout/i.test(String(error?.message || ""));

  const wasRequestAdvanced = (snapshot, req) =>
    Boolean(req?.id) &&
    Boolean(snapshot) &&
    !snapshot.approved.some((item) => item.id === req.id);

  const handleAdvance = async (req) => {
    if (requiresCourseSelection(req.certificate_type_name)) {
      setSelectedRequest(req);
      return;
    }
    setActionLoading((prev) => ({ ...prev, [`advance_${req.id}`]: true }));
    try {
      await requestService.generateCertificate(req.id);
      await fetchRequests({ silent: true });
    } catch (error) {
      console.error("Failed to advance request:", error);
      if (isTimeoutLikeError(error)) {
        try {
          const snapshot = await fetchRequests({ silent: true });
          if (wasRequestAdvanced(snapshot, req)) {
            showFeedback(
              "Request Processed",
              "The request was processed successfully. The page has been refreshed to reflect the latest status.",
              "success",
            );
            return;
          }
        } catch (refreshError) {
          console.error(
            "Failed to verify request status after timeout:",
            refreshError,
          );
        }
      }
      showFeedback("Processing Failed", getErrorDetail(error), "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`advance_${req.id}`]: false }));
    }
  };

  const handleEmail = async (req) => {
    if (!req) return;
    const requestLabel =
      req.certificate_type_name || req.request_label || "certificate request";
    const referenceNumber = req.reference_number || "Pending Reference";
    setComposeEmailModal({
      open: true,
      request: req,
      subject: `About your certificate request ${referenceNumber}`,
      message:
        `Hello ${req.requestor_name || "Requestor"},\n\n` +
        `We are reviewing your ${requestLabel}. We need a few more details regarding your request.\n\n` +
        "Please reply with the information needed so we can continue processing it.\n\n" +
        "Thank you.",
    });
  };

  const closeComposeEmailModal = () => {
    setComposeEmailModal({
      open: false,
      request: null,
      subject: "",
      message: "",
    });
  };

  const handleComposeEmailSend = async () => {
    const req = composeEmailModal.request;
    if (!req) return;
    const subject = composeEmailModal.subject.trim();
    const message = composeEmailModal.message.trim();

    if (!subject) {
      showFeedback(
        "Missing Subject",
        "Please enter an email subject.",
        "error",
      );
      return;
    }
    if (!message) {
      showFeedback(
        "Missing Message",
        "Please enter an email message.",
        "error",
      );
      return;
    }

    setEmailLoading((prev) => ({ ...prev, [`checking_${req.id}`]: true }));
    showFeedback(
      "Sending Email",
      "Please wait while the email is being sent to the requestor.",
      "info",
      {
        loading: true,
        confirmLabel: "Sending...",
      },
    );
    try {
      await requestService.sendCheckingEmail(req.id, { subject, message });
      closeComposeEmailModal();
      showFeedback("Email Sent", "Message sent to the requestor.", "success");
    } catch (error) {
      console.error("Failed to send checking email:", error);
      showFeedback(
        "Email Failed",
        getErrorDetail(error, "Failed to send message to the requestor."),
        "error",
      );
    } finally {
      setEmailLoading((prev) => ({ ...prev, [`checking_${req.id}`]: false }));
    }
  };

  const handleModalApprove = async (req) => {
    if (!req) return;
    setModalLoading(true);
    showFeedback(
      "Generating Certificate",
      "Please wait while the certificate is being generated.",
      "info",
      {
        loading: true,
        confirmLabel: "Generating...",
      },
    );
    try {
      await requestService.generateCertificate(req.id);
      await fetchRequests({ silent: true });
      setSelectedRequest(null);
      showFeedback(
        "Certificate Generated",
        "Certificate request moved to tracker successfully.",
        "success",
      );
    } catch (error) {
      console.error("Failed to advance request:", error);
      if (isTimeoutLikeError(error)) {
        showFeedback(
          "Checking Request Status",
          "The server took too long to reply, so we're verifying whether the certificate was still generated.",
          "info",
          {
            loading: true,
            confirmLabel: "Checking...",
          },
        );
        try {
          const snapshot = await fetchRequests({ silent: true });
          if (wasRequestAdvanced(snapshot, req)) {
            setSelectedRequest(null);
            showFeedback(
              "Certificate Generated",
              "Certificate request was generated successfully. The page has been refreshed to reflect the latest status.",
              "success",
            );
            return;
          }
        } catch (refreshError) {
          console.error(
            "Failed to verify modal approval after timeout:",
            refreshError,
          );
        }
      }
      showFeedback(
        "Generation Failed",
        getErrorDetail(error, "Failed to generate the certificate request."),
        "error",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalDecline = async (req, notes) => {
    if (!req) return;
    setModalLoading(true);
    try {
      await requestService.updateStatus(
        req.id,
        "REJECTED",
        notes || "Request rejected during validation.",
      );
      setSelectedRequest({ ...req, status: "REJECTED" });
      fetchRequests();
    } catch (error) {
      console.error("Failed to reject request:", error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRejectAndSend = async (req, notes) => {
    if (!req) return;
    setModalLoading(true);
    setEmailLoading((prev) => ({ ...prev, [`reject_${req.id}`]: true }));
    showFeedback(
      "Sending Rejection Email",
      "Please wait while the rejection is recorded and the email is sent.",
      "info",
      {
        loading: true,
        confirmLabel: "Sending...",
      },
    );
    try {
      const finalNotes = notes || "Request rejected during validation.";
      await requestService.updateStatus(req.id, "REJECTED", finalNotes);
      await requestService.sendRejectionEmail(req.id, finalNotes);
      setSelectedRequest(null);
      await fetchRequests({ silent: true });
      showFeedback("Email Sent", "Rejection email sent.", "success");
    } catch (error) {
      console.error("Failed to reject request:", error);
      showFeedback("Email Failed", "Failed to send rejection email.", "error");
    } finally {
      setModalLoading(false);
      setEmailLoading((prev) => ({ ...prev, [`reject_${req.id}`]: false }));
    }
  };

  const handleSendRejectionEmail = async (req, notes) => {
    if (!req) return;
    setEmailLoading((prev) => ({ ...prev, [`reject_${req.id}`]: true }));
    try {
      await requestService.sendRejectionEmail(req.id, notes || "");
      showFeedback("Email Sent", "Rejection email sent.", "success");
    } catch (error) {
      console.error("Failed to send rejection email:", error);
      showFeedback("Email Failed", "Failed to send rejection email.", "error");
    } finally {
      setEmailLoading((prev) => ({ ...prev, [`reject_${req.id}`]: false }));
    }
  };

  const handleBulkApprove = async () => {
    if (
      filteredRequests.some((r) =>
        requiresCourseSelection(r.certificate_type_name),
      )
    ) {
      return;
    }
    setBulkApproveLoading(true);
    try {
      showBulkDialog({
        title: "Processing Requests",
        message: `0 of ${filteredRequests.length} request${filteredRequests.length !== 1 ? "s" : ""} processed.`,
        total: filteredRequests.length,
      });
      for (let i = 0; i < filteredRequests.length; i += 1) {
        const request = filteredRequests[i];
        await requestService.generateCertificate(request.id);
        showBulkDialog({
          title: "Processing Requests",
          message: `${i + 1} of ${filteredRequests.length} request${filteredRequests.length !== 1 ? "s" : ""} processed.`,
          total: filteredRequests.length,
          current: i + 1,
        });
      }
      fetchRequests();
      showBulkDialog({
        title: "Bulk Process Complete",
        message: `${filteredRequests.length} request${filteredRequests.length !== 1 ? "s were" : " was"} moved to tracker.`,
        tone: "success",
        current: filteredRequests.length,
        total: filteredRequests.length,
        done: true,
      });
    } catch (error) {
      console.error("Bulk advance failed:", error);
      showBulkDialog({
        title: "Bulk Process Failed",
        message: "Failed to update all selected requests.",
        tone: "error",
        current: 0,
        total: filteredRequests.length || 1,
        done: true,
      });
    } finally {
      setBulkApproveLoading(false);
    }
  };

  const columns = [
    {
      name: "Validation",
      selector: (row) => getValidationFlags(row).length,
      sortable: true,
      width: "160px",
      cell: (row) => {
        const flags = getValidationFlags(row);
        const needsReview = flags.length > 0;

        if (validationLoading && !validationMap?.[row.id]) {
          return (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
              <span>Checking...</span>
            </div>
          );
        }

        return needsReview ? (
          <div
            onClick={() => setSelectedRequest(row)}
            className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold cursor-pointer"
          >
            <BsExclamationTriangleFill size={12} />
            <span>Needs Review</span>
            <BsArrowUpRight size={12} />
          </div>
        ) : (
          <div
            onClick={() => setSelectedRequest(row)}
            className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold cursor-pointer"
          >
            <BsCheckCircleFill size={12} />
            <span>Clear</span>
          </div>
        );
      },
    },
    {
      name: "Reference #",
      selector: (row) => row.reference_number || row.sr_code || "-",
      sortable: true,
      cell: (row) => row.reference_number || row.sr_code || "-",
      width: "150px",
    },
    {
      name: "Requester Name",
      selector: (row) => row.student_name || row.requester_name || "-",
      sortable: true,
      width: "270px",
    },
    {
      name: "Campus",
      selector: (row) => row.campus || "Alangilan",
      sortable: true,
      width: "100px",
    },
    {
      name: "Certificate Type",
      selector: (row) => row.certificate_type_name || "-",
      sortable: true,
      width: "450px",
    },
    {
      name: "Date Requested",
      selector: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
      width: "150px",
    },
    {
      name: "Action",
      ignoreRowClick: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleAdvance(row)}
            disabled={actionLoading[`advance_${row.id}`]}
            className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {actionLoading[`advance_${row.id}`] ? (
              "..."
            ) : (
              <BsArrowRepeat size={18} />
            )}
          </button>
          <button
            onClick={() => handleEmail(row)}
            aria-label="Send checking email"
            disabled={emailLoading[`checking_${row.id}`]}
            className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {emailLoading[`checking_${row.id}`] ? (
              "..."
            ) : (
              <BsEnvelopeArrowUp size={18} />
            )}
          </button>
          <button
            onClick={() => setSelectedRequest(row)}
            className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            <BsEye size={18} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white w-full rounded-md border border-gray-200 shadow-sm -mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* LEFT — Bulk Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkApprove}
            disabled={
              bulkApproveLoading ||
              filteredRequests.length === 0 ||
              filteredRequests.some((r) =>
                requiresCourseSelection(r.certificate_type_name),
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {bulkApproveLoading && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Generate All
          </button>
        </div>

        {/* RIGHT — Filters */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] text-gray-600 border border-gray-300 rounded-md px-3 py-1.5 bg-white">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={showOnlyFlagged}
              onChange={(e) => setShowOnlyFlagged(e.target.checked)}
            />
            Show only flagged
          </label>
          <select
            value={selectedProgram}
            onChange={(e) => {
              setSelectedProgram(e.target.value);
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 bg-white text-xs text-gray-600 hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 bg-white text-xs text-gray-600 hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <option value="">All Certificate Types</option>
            {certificateTypes.map((ct) => (
              <option key={ct.id} value={ct.name}>
                {ct.name}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-1.5 bg-white text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <BsCalendar3 size={14} className="text-gray-400" />
              <span className="font-medium">{selectedFilter.label}</span>
              <BsChevronDown size={14} className="text-gray-400" />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  Filter
                </div>
                {filterOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => {
                      setSelectedFilter(option);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                      selectedFilter.label === option.label
                        ? "bg-blue-600 text-white font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className="text-xs px-3 py-1.5 focus:outline-none w-40"
            />
            <div className="w-px self-stretch bg-gray-300" />
            <div className="px-3 py-1.5 cursor-pointer group">
              <BsSearch className="text-gray-400 group-hover:text-[#ee1133] transition-colors duration-150" />
            </div>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      <div className="mb-2 -mt-2 flex items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500">
          This tab shows the requests currently assigned to your checking queue.
          When a request leaves this queue, the next queued request enters
          automatically when a slot is free.
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
            <BsCheckCircleFill size={11} /> Clear
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
            <BsExclamationTriangleFill size={11} /> Needs Review
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded mt-2">
        <div className="overflow-auto">
          <DataTable
            columns={columns}
            data={filteredRequests.slice(
              (currentPage - 1) * rowsPerPage,
              currentPage * rowsPerPage,
            )}
            progressPending={loading}
            progressComponent={<LoadingState />}
            pagination={false}
            customStyles={customStyles}
            highlightOnHover
            responsive
            onRowClicked={(row) => setSelectedRequest(row)}
            noDataComponent={
              <div className="py-10 text-xs text-gray-400">
                No requests found.
              </div>
            }
          />
        </div>

        {/* Pagination */}
        {filteredRequests.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
            <span>{filteredRequests.length} total records</span>
            <div className="flex items-center gap-2">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-xs"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} rows
                  </option>
                ))}
              </select>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                ‹
              </button>
              <span>
                Page {currentPage} of{" "}
                {Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage))}
              </span>
              <button
                disabled={
                  currentPage >=
                  Math.ceil(filteredRequests.length / rowsPerPage)
                }
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
      <span className="text-[11px] text-gray-400">
        Last updated: {lastUpdatedLabel}
      </span>

      <RequestModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onApprove={handleModalApprove}
        onDecline={handleModalDecline}
        onRejectAndSend={handleRejectAndSend}
        onSendRejectionEmail={handleSendRejectionEmail}
        loading={modalLoading}
        rejectionEmailLoading={
          selectedRequest ? emailLoading[`reject_${selectedRequest.id}`] : false
        }
        validationFlags={
          selectedRequest ? getValidationFlags(selectedRequest) : []
        }
      />
      {composeEmailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Compose Email
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                To:{" "}
                {composeEmailModal.request?.requestor_email ||
                  composeEmailModal.request?.email ||
                  "-"}
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label
                  htmlFor="checking-email-subject"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Subject
                </label>
                <input
                  id="checking-email-subject"
                  type="text"
                  value={composeEmailModal.subject}
                  onChange={(e) =>
                    setComposeEmailModal((current) => ({
                      ...current,
                      subject: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#ee1133] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="checking-email-message"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Message
                </label>
                <textarea
                  id="checking-email-message"
                  rows={10}
                  value={composeEmailModal.message}
                  onChange={(e) =>
                    setComposeEmailModal((current) => ({
                      ...current,
                      message: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#ee1133] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeComposeEmailModal}
                disabled={
                  composeEmailModal.request
                    ? emailLoading[`checking_${composeEmailModal.request.id}`]
                    : false
                }
                className="rounded-md border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComposeEmailSend}
                disabled={
                  composeEmailModal.request
                    ? emailLoading[`checking_${composeEmailModal.request.id}`]
                    : false
                }
                className="rounded-md bg-[#ee1133] px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {composeEmailModal.request &&
                emailLoading[`checking_${composeEmailModal.request.id}`]
                  ? "Sending..."
                  : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
      <BulkStatusDialog
        open={bulkDialog.open}
        title={bulkDialog.title}
        message={bulkDialog.message}
        tone={bulkDialog.tone}
        current={bulkDialog.current}
        total={bulkDialog.total}
        done={bulkDialog.done}
        onClose={() => {
          if (!bulkDialog.done) return;
          setBulkDialog((current) => ({ ...current, open: false }));
          setBulkApproveLoading(false);
        }}
      />
      <FeedbackDialog
        open={feedbackModal.open}
        title={feedbackModal.title}
        message={feedbackModal.message}
        tone={feedbackModal.tone}
        loading={feedbackModal.loading}
        confirmLabel={feedbackModal.confirmLabel}
        onClose={() =>
          setFeedbackModal((current) => ({ ...current, open: false }))
        }
      />
    </div>
  );
};

export default Checking;
