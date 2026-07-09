import React, { useEffect, useRef, useState } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import settingsService from "../../services/settingsService";
import paymentService from "../../services/paymentService";
import {
  BsSearch,
  BsCalendar3,
  BsChevronDown,
  BsEye,
  BsPrinter,
  BsCheckLg,
} from "react-icons/bs";
import { FaXmark } from "react-icons/fa6";
import {
  readPrintQueueState,
  writePrintQueueState,
} from "../../utils/printQueue";
import { filterCertifyEligibleRequests } from "../../utils/certifyRequestGuard";
import FeedbackDialog from "../../components/common/feedbackDialog";
import { getTokenPayload } from "../../utils/auth";

const filterOptions = [
  { label: "Today", days: 0 },
  { label: "Last 3 days", days: 3 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "All time", days: null },
];

const isPaidPayment = (payment) =>
  String(payment?.payment_status || "").toUpperCase() === "PAID";

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
  <div className="flex items-center justify-center gap-2 py-10 text-xs text-gray-400">
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

const Ready = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(filterOptions[4]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState({});
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({
    sent: 0,
    total: 0,
  });
  const [wetSignature, setWetSignature] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [bulkEmailDone, setBulkEmailDone] = useState(false);
  const [bulkReleasing, setBulkReleasing] = useState(false);
  const [bulkReleaseProgress, setBulkReleaseProgress] = useState({
    done: 0,
    total: 0,
  });
  const [bulkReleaseDone, setBulkReleaseDone] = useState(false);
  const [bulkDialog, setBulkDialog] = useState({
    open: false,
    title: "",
    message: "",
    tone: "info",
    current: 0,
    total: 0,
    done: false,
  });
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "default",
    loading: false,
    confirmLabel: "Got it",
    cancelLabel: "",
  });
  const [paymentMap, setPaymentMap] = useState({});
  const ownerUsername = getTokenPayload()?.sub || "";

  const showFeedback = (title, message, tone = "default", extra = {}) => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
      loading: false,
      confirmLabel: "Got it",
      cancelLabel: "",
      ...extra,
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

  const lastSnapshotRef = useRef("");

  useEffect(
    () => setCurrentPage(1),
    [search, selectedFilter, selectedType, selectedProgram],
  );

  const fetchRequests = async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setLoading(true);
      const data = await requestService.getAllRequests({
        page: 1,
        limit: 100,
        ownerUsername,
      });
      const all = filterCertifyEligibleRequests(
        Array.isArray(data) ? data : data.items || [],
      );
      const forReleasing = all.filter((r) => r.status === "FOR_RELEASING");
      const refs = forReleasing.map((r) => r.reference_number).filter(Boolean);
      const paymentInfo =
        refs.length > 0
          ? await paymentService.getPaymentsByReferences(refs)
          : { items: [] };
      const nextPaymentMap = {};
      (paymentInfo?.items || []).forEach((item) => {
        nextPaymentMap[item.reference_number] = item;
      });
      const filtered = forReleasing.filter((r) =>
        isPaidPayment(nextPaymentMap[r.reference_number]),
      );
      const snapshot = JSON.stringify(
        filtered.map((r) => [
          r.id,
          r.status,
          r.updated_at,
          r.created_at,
          nextPaymentMap[r.reference_number]?.paid_at || null,
        ]),
      );
      setPaymentMap(nextPaymentMap);
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setRequests(filtered);
      }
      setLastUpdatedAt(Date.now());
    } catch (error) {
      console.error("Failed to fetch requests:", error);
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
    console.log("READY requests:", requests);
  }, [requests]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    requestService
      .getCertificateTypes()
      .then(setCertificateTypes)
      .catch(console.error);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSetting = async () => {
      try {
        const data = await settingsService.getWetSignature();
        if (!mounted) return;
        setWetSignature(Boolean(data?.use_wet_signature));
      } catch (err) {
        // ignore; default false
      }
    };
    loadSetting();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
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

    return matchesSearch && matchesDate && matchesType && matchesProgram;
  });

  const releasableRequests = filteredRequests.filter(
    (r) => r.ready_email_sent_at,
  );

  const lastUpdatedLabel = lastUpdatedAt
    ? `${Math.max(0, Math.floor((nowTick - lastUpdatedAt) / 1000))}s ago`
    : "—";

  const getPrintStatusLabel = (row) => {
    const printStatus = String(row.auto_print_status || "").toUpperCase();
    if (row.auto_printed_at || printStatus === "COMPLETED") return "Confirmed";
    if (printStatus === "SUBMITTED" || printStatus === "SENDING") {
      return "In Printer";
    }
    if (printStatus === "FAILED") return "Failed";
    if (row.auto_print_requested_at) return "Queued";
    return "No";
  };

  const handleView = async (row) => {
    setPdfLoading(true);
    try {
      const blob = await requestService.downloadCertificate(row.id);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      setPdfUrl(url);
    } catch (error) {
      console.error("Failed to load certificate:", error);
      showFeedback(
        "Preview Failed",
        "Failed to load certificate preview.",
        "error",
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePdf = () => {
    if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  const handleComplete = async (row) => {
    try {
      await requestService.updateStatus(row.id, "RELEASED");
      fetchRequests();
    } catch (error) {
      console.error("Failed to mark as released:", error);
      showFeedback(
        "Release Failed",
        "Failed to update status. Please try again.",
        "error",
      );
    }
  };

  const handleSendReadyEmail = async (row) => {
    setEmailLoading((prev) => ({ ...prev, [row.id]: true }));
    try {
      await requestService.sendReadyEmail(row.id);
      fetchRequests();
      showFeedback(
        "Task Successful",
        "Ready-for-release email sent successfully.",
        "success",
      );
    } catch (error) {
      console.error("Failed to send ready email:", error);
      showFeedback(
        "Email Failed",
        "Failed to send email. Please try again.",
        "error",
      );
    } finally {
      setEmailLoading((prev) => ({ ...prev, [row.id]: false }));
    }
  };

  const handleBulkSendReadyEmails = async () => {
    const targets = filteredRequests.filter((r) => !r.ready_email_sent_at);

    if (targets.length === 0) {
      showFeedback(
        "Nothing To Send",
        "All ready emails have already been sent.",
        "info",
      );
      return;
    }

    setBulkEmailing(true);
    setBulkEmailProgress({ sent: 0, total: targets.length });
    showBulkDialog({
      title: "Sending Emails",
      message: `0 of ${targets.length} email${targets.length !== 1 ? "s" : ""} processed.`,
      total: targets.length,
    });

    for (let i = 0; i < targets.length; i += 1) {
      const row = targets[i];

      try {
        await requestService.sendReadyEmail(row.id);
      } catch (error) {
        console.error(error);
      }

      setBulkEmailProgress({
        sent: i + 1,
        total: targets.length,
      });
      showBulkDialog({
        title: "Sending Emails",
        message: `${i + 1} of ${targets.length} email${targets.length !== 1 ? "s" : ""} processed.`,
        total: targets.length,
        current: i + 1,
      });
    }

    setBulkEmailProgress({
      sent: targets.length,
      total: targets.length,
    });

    setBulkEmailDone(true);
    fetchRequests();
    showBulkDialog({
      title: "Bulk Send Complete",
      message: `${targets.length} ready email${targets.length !== 1 ? "s were" : " was"} processed.`,
      tone: "success",
      current: targets.length,
      total: targets.length,
      done: true,
    });
  };

  const handleBulkMarkReleased = async () => {
    const targets = releasableRequests;

    if (targets.length === 0) {
      showFeedback(
        "Nothing To Release",
        "No requests are eligible to be marked as released.",
        "info",
      );
      return;
    }

    setBulkReleasing(true);
    setBulkReleaseProgress({ done: 0, total: targets.length });
    showBulkDialog({
      title: "Updating Release Status",
      message: `0 of ${targets.length} request${targets.length !== 1 ? "s" : ""} processed.`,
      total: targets.length,
    });

    const failed = [];

    for (let i = 0; i < targets.length; i += 1) {
      const row = targets[i];
      try {
        await requestService.updateStatus(row.id, "RELEASED");
      } catch (error) {
        console.error(error);
        failed.push(row.reference_number || row.id);
      }

      setBulkReleaseProgress({
        done: i + 1,
        total: targets.length,
      });
      showBulkDialog({
        title: "Updating Release Status",
        message: `${i + 1} of ${targets.length} request${targets.length !== 1 ? "s" : ""} processed.`,
        total: targets.length,
        current: i + 1,
      });
    }

    setBulkReleaseProgress({
      done: targets.length,
      total: targets.length,
    });

    setBulkReleaseDone(true);
    fetchRequests();
    showBulkDialog({
      title:
        failed.length > 0 ? "Bulk Release Incomplete" : "Bulk Release Complete",
      message:
        failed.length > 0
          ? `Released ${targets.length - failed.length} of ${targets.length} request(s). Please retry the failed items.`
          : `${targets.length} request${targets.length !== 1 ? "s were" : " was"} marked as released.`,
      tone: failed.length > 0 ? "warning" : "success",
      current: targets.length,
      total: targets.length,
      done: true,
    });
  };

  const handlePrintAll = async () => {
    if (filteredRequests.length === 0) return;

    writePrintQueueState({
      active: true,
      status: "preparing",
      processed: 0,
      total: filteredRequests.length,
      failed: 0,
      lastPrintedAt: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    });

    try {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();
      let failed = 0;

      for (let i = 0; i < filteredRequests.length; i += 1) {
        const row = filteredRequests[i];
        try {
          const blob = await requestService.downloadCertificate(row.id);
          const arrayBuffer = await blob.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Failed to load PDF for ${row.reference_number}:`, err);
          failed += 1;
        } finally {
          writePrintQueueState({
            ...readPrintQueueState(),
            processed: i + 1,
            failed,
          });
        }
      }

      const mergedBytes = await mergedPdf.save();
      const mergedBlob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(mergedBlob);

      const win = window.open(url);
      if (!win) {
        throw new Error("Print preview window could not be opened.");
      }

      const markPrinted = () => {
        writePrintQueueState({
          ...readPrintQueueState(),
          active: false,
          status: "done",
          processed: filteredRequests.length,
          lastPrintedAt: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        });
        Promise.allSettled(
          filteredRequests.map((row) => requestService.markPrinted(row.id)),
        ).then(() => {
          fetchRequests({ silent: true });
        });
        setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      };

      const handlePrintWindowReady = () => {
        writePrintQueueState({
          ...readPrintQueueState(),
          active: true,
          status: "printing",
          processed: filteredRequests.length,
          total: filteredRequests.length,
          failed,
          lastPrintedAt: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        });

        win.addEventListener("afterprint", markPrinted, { once: true });
        win.print();
      };

      if (win.document?.readyState === "complete") {
        handlePrintWindowReady();
      } else {
        win.addEventListener("load", handlePrintWindowReady, { once: true });
      }
    } catch (error) {
      console.error("Failed to merge and print PDFs:", error);
      writePrintQueueState({
        ...readPrintQueueState(),
        active: false,
        status: "error",
        lastPrintedAt: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      });
      showFeedback(
        "Print Failed",
        "Failed to print certificates. Please try again.",
        "error",
      );
    }
  };

  const columns = [
    {
      name: "Reference No.",
      selector: (row) => row.reference_number,
      sortable: true,
      width: "140px",
    },
    {
      name: "OR No.",
      selector: (row) => paymentMap[row.reference_number]?.or_number || "",
      sortable: true,
      cell: (row) => paymentMap[row.reference_number]?.or_number || "-",
      width: "110px",
    },
    {
      name: "Certificate Type",
      selector: (row) => row.certificate_type_name,
      sortable: true,
      width: "370px",
    },
    {
      name: "Student Name",
      selector: (row) => row.student_name,
      sortable: true,
      width: "200px",
    },
    {
      name: "Program",
      selector: (row) => {
        let program = row.program;

        program = program
          .replace(/Bachelor of Science/gi, "BS")
          .replace(/Bachelor of Arts/gi, "BA")
          .replace(/Bachelor of/gi, "");

        program = program
          .replace(/\s*in\s*/i, " ")
          .replace(/\s+/g, " ")
          .trim();

        return program;
      },
      sortable: true,
      width: "200px",
    },
    {
      name: "Purpose",
      selector: (row) => row.purpose,
      sortable: true,
      width: "220px",
    },
    {
      name: "Date Requested",
      selector: (row) => row.created_at,
      cell: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
      sortable: true,
      width: "150px",
    },
    {
      name: "Release Date",
      selector: (row) => row.updated_at,
      cell: (row) =>
        row.status === "FOR_RELEASING" && row.updated_at
          ? new Date(row.updated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
      sortable: true,
      width: "150px",
    },
    {
      name: "Is Printed",
      selector: (row) => getPrintStatusLabel(row),
      cell: (row) => getPrintStatusLabel(row),
      sortable: true,
      width: "120px",
    },
    {
      name: "Action",
      ignoreRowClick: true,
      minWidth: "150px",
      frozen: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleView(row)}
            title="View Details"
            className="flex items-center rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-[#ee1133] transition-colors duration-150 hover:bg-blue-50"
          >
            <BsEye size={13} />
          </button>

          {row.ready_email_sent_at && (
            <button
              onClick={() => handleComplete(row)}
              title="Mark as Released"
              className="flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50"
            >
              <BsCheckLg size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mb-4 min-h-[calc(100vh-10rem)] w-full rounded-md border border-gray-200 bg-white p-2 shadow-sm -mt-3">
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
          setBulkEmailing(false);
          setBulkEmailDone(false);
          setBulkReleaseDone(false);
          setBulkReleasing(false);
        }}
      />
      <FeedbackDialog
        open={feedbackModal.open}
        title={feedbackModal.title}
        message={feedbackModal.message}
        tone={feedbackModal.tone}
        loading={feedbackModal.loading}
        confirmLabel={feedbackModal.confirmLabel}
        cancelLabel={feedbackModal.cancelLabel}
        onClose={() =>
          setFeedbackModal((current) => ({ ...current, open: false }))
        }
      />

      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintAll}
            disabled={filteredRequests.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <BsPrinter size={13} />
            Print All
          </button>

          <button
            onClick={handleBulkMarkReleased}
            disabled={bulkReleasing || releasableRequests.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <BsCheckLg size={13} />
            Mark All Released
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50"
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
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50"
          >
            <option value="">All Certificate Types</option>
            {certificateTypes.map((ct) => (
              <option key={ct.id} value={ct.name}>
                {ct.name}
              </option>
            ))}
          </select>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
            >
              <BsCalendar3 size={14} className="text-gray-400" />
              <span className="font-medium">{selectedFilter.label}</span>
              <BsChevronDown size={14} className="text-gray-400" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-3 py-1.5 text-xs uppercase tracking-wide text-gray-400">
                  Filter
                </div>
                {filterOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => {
                      setSelectedFilter(option);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs transition-colors ${
                      selectedFilter.label === option.label
                        ? "bg-blue-600 font-medium text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center overflow-hidden rounded-md border border-gray-300">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-40 px-3 py-1.5 text-xs focus:outline-none"
            />
            <div className="w-px self-stretch bg-gray-300" />
            <div className="group cursor-pointer px-3 py-1.5">
              <BsSearch className="text-gray-400 transition-colors duration-150 group-hover:text-[#ee1133]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded border border-gray-200">
        <div className="overflow-auto">
          <div style={{ minWidth: "1690px" }}>
            <DataTable
              columns={columns}
              data={filteredRequests.slice(
                (currentPage - 1) * rowsPerPage,
                currentPage * rowsPerPage,
              )}
              progressPending={loading}
              progressComponent={<LoadingState />}
              pagination={false}
              customStyles={{
                ...customStyles,
                headCells: {
                  style: {
                    "&:last-child": {
                      position: "sticky",
                      right: 0,
                      backgroundColor: "#f9fafb",
                      zIndex: 1,
                      borderLeft: "1px solid #e5e7eb",
                      boxShadow: "-4px 0 8px rgba(0,0,0,0.06)",
                    },
                  },
                },
                cells: {
                  style: {
                    "&:last-child": {
                      position: "sticky",
                      right: 0,
                      backgroundColor: "#ffffff",
                      zIndex: 1,
                      borderLeft: "1px solid #e5e7eb",
                      boxShadow: "-4px 0 8px rgba(0,0,0,0.06)",
                    },
                  },
                },
              }}
              highlightOnHover
              responsive={false}
              fixedHeader
              noDataComponent={
                <div className="py-10 text-xs text-gray-400">
                  No requests ready for releasing.
                </div>
              }
            />
          </div>
        </div>

        {filteredRequests.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
            <span>{filteredRequests.length} total records</span>
            <div className="flex items-center gap-2">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
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
                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
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
                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
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

      {(pdfUrl || pdfLoading) && (
        <div
          onClick={handleClosePdf}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3 shrink-0">
              <p className="text-sm font-semibold text-gray-800">
                Certificate Preview
              </p>
              <button
                onClick={handleClosePdf}
                className="rounded-md border-gray-200 text-lg transition-colors hover:text-[#B22222]"
              >
                <FaXmark />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {pdfLoading ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-400">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  Loading certificate...
                </div>
              ) : (
                <iframe
                  src={pdfUrl}
                  className="h-full w-full border-0"
                  title="Certificate Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ready;
