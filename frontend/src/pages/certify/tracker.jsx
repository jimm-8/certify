import React, { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import RequestModal from "../../components/common/requestModal";
import FeedbackDialog from "../../components/common/feedbackDialog";
import { filterCertifyEligibleRequests } from "../../utils/certifyRequestGuard";
import { getTokenPayload } from "../../utils/auth";
import paymentService from "../../services/paymentService";
import {
  BsSearch,
  BsCalendar3,
  BsChevronDown,
  BsEye,
  BsArrowRepeat,
  BsExclamationTriangleFill,
  BsCheckCircleFill,
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
  children,
  loading,
  confirmLabel,
  confirmDisabled,
  cancelLabel,
  onConfirm,
}) => {
  const percent =
    total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  return (
    <FeedbackDialog
      open={open}
      title={title}
      message={message}
      tone={tone}
      loading={loading}
      confirmLabel={confirmLabel}
      confirmDisabled={confirmDisabled}
      cancelLabel={cancelLabel}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {children}
      {total > 0 && (
        <div className="mt-4 space-y-2">
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
      )}
    </FeedbackDialog>
  );
};

const statusColors = {
  APPROVED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  FOR_RELEASING: "bg-purple-100 text-purple-700",
  RELEASED: "bg-gray-100 text-gray-600",
};

const statusLabels = {
  APPROVED: "Approved",
  PROCESSING: "Processing",
  FOR_RELEASING: "For Releasing",
  RELEASED: "Released",
};

const Tracker = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(filterOptions[4]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [bulkDialog, setBulkDialog] = useState({
    mode: "form",
    title: "Bulk Generate Certificates",
    message:
      "Generate certificates for the requests currently assigned to your tracker.",
    tone: "default",
    current: 0,
    total: 0,
    done: false,
  });
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "default",
  });
  const [validationMap, setValidationMap] = useState({});
  const [paymentMap, setPaymentMap] = useState({});

  const lastSnapshotRef = useRef("");
  const lastAutoQueueAttemptRef = useRef(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const ownerUsername = getTokenPayload()?.sub || "";

  useEffect(
    () => setCurrentPage(1),
    [search, selectedFilter, selectedType, selectedProgram],
  );

  const showFeedback = (title, message, tone = "default") => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
    });
  };

  const resetBulkDialog = () => {
    setBulkDialog({
      mode: "form",
      title: "Tracker",
      message: "Requests awaiting payment after certificate generation.",
      tone: "default",
      current: 0,
      total: 0,
      done: false,
    });
  };

  const maybeRefreshAutoQueue = async () => {
    const now = Date.now();
    if (now - lastAutoQueueAttemptRef.current < 30000) return;
    lastAutoQueueAttemptRef.current = now;
    try {
      await requestService.autoQueueApprovedRequests();
    } catch (error) {
      console.error("Tracker auto-queue refresh failed:", error);
    }
  };

  const fetchRequests = async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setLoading(true);
      await maybeRefreshAutoQueue();
      const data = await requestService.getAllRequests({
        page: 1,
        limit: 100,
        ownerUsername,
      });
      const items = filterCertifyEligibleRequests(
        Array.isArray(data) ? data : data.items || [],
      );
      const forReleasingItems = items.filter(
        (r) => r.status === "FOR_RELEASING",
      );
      const refs = forReleasingItems
        .map((r) => r.reference_number)
        .filter(Boolean);
      const paymentInfo =
        refs.length > 0
          ? await paymentService.getPaymentsByReferences(refs)
          : { items: [] };
      const nextPaymentMap = {};
      (paymentInfo?.items || []).forEach((item) => {
        nextPaymentMap[item.reference_number] = item;
      });
      const unpaidItems = forReleasingItems.filter(
        (r) =>
          String(
            nextPaymentMap[r.reference_number]?.payment_status || "",
          ).toUpperCase() !== "PAID",
      );
      const nextValidationMap = {};
      const snapshot = JSON.stringify(
        unpaidItems.map((r) => [
          r.id,
          r.status,
          r.updated_at,
          r.created_at,
          nextPaymentMap[r.reference_number]?.paid_at || null,
        ]),
      );
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setRequests(unpaidItems);
        setValidationMap(nextValidationMap);
        setPaymentMap(nextPaymentMap);
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

    return (
      matchesSearch &&
      matchesDate &&
      matchesType &&
      matchesProgram &&
      r.status === "FOR_RELEASING"
    );
  });

  const lastUpdatedLabel = lastUpdatedAt
    ? `${Math.max(0, Math.floor((nowTick - lastUpdatedAt) / 1000))}s ago`
    : "—";

  const handleView = (row) => setSelectedRequest(row);

  const getValidationFlags = () => [];

  const columns = [
    {
      name: "Validation",
      selector: (row) => getValidationFlags(row).length,
      sortable: true,
      width: "180px",
      cell: (row) => {
        const flags = getValidationFlags(row);
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <BsExclamationTriangleFill size={12} />
            <span>Awaiting Payment</span>
          </div>
        );
      },
    },
    {
      name: "Reference #",
      selector: (row) => row.reference_number,
      sortable: true,
      width: "150px",
    },
    {
      name: "Certificate Type",
      selector: (row) => row.certificate_type_name,
      sortable: true,
      width: "250px",
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
          .replace(/Bachelor of/gi, ""); // remove completely

        // Clean formatting
        program = program
          .replace(/\s*in\s*/i, " ") // remove "in"
          .replace(/\s+/g, " ")
          .trim();

        return program;
      },
      sortable: true,
      width: "230px",
    },
    {
      name: "Purpose",
      selector: (row) => row.purpose,
      sortable: true,
      width: "220px",
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
            onClick={() => handleView(row)}
            title="View Details"
            className="flex items-center px-3 py-1.5 text-xs font-medium text-[#ee1133] border border-blue-200 rounded-md hover:bg-blue-50 transition-colors duration-150"
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
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* LEFT — Bulk */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">
            Requests in this tab are ready for release and still awaiting
            payment.
          </span>
        </div>

        {/* RIGHT — Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
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
            onChange={(e) => setSelectedType(e.target.value)}
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
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs px-3 py-1.5 focus:outline-none w-40"
            />
            <div className="w-px self-stretch bg-gray-300" />
            <div className="px-3 py-1.5 cursor-pointer group">
              <BsSearch className="text-gray-400 group-hover:text-[#ee1133] transition-colors duration-150" />
            </div>
          </div>
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
        validationFlags={
          selectedRequest ? getValidationFlags(selectedRequest) : []
        }
      />

      <FeedbackDialog
        open={feedbackModal.open}
        title={feedbackModal.title}
        message={feedbackModal.message}
        tone={feedbackModal.tone}
        onClose={() =>
          setFeedbackModal((current) => ({ ...current, open: false }))
        }
      />
    </div>
  );
};

export default Tracker;
