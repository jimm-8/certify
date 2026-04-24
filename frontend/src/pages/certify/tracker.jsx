import React, { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import RequestModal from "../../components/common/requestModal";
import FeedbackDialog from "../../components/common/feedbackDialog";
import { filterCertifyEligibleRequests } from "../../utils/certifyRequestGuard";
import {
  BsSearch,
  BsCalendar3,
  BsChevronDown,
  BsEye,
  BsArrowRepeat,
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

const bulkStatusTarget = {
  PROCESSING: "FOR_RELEASING",
  FOR_RELEASING: "RELEASED",
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
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [bulkDialog, setBulkDialog] = useState({
    mode: "form",
    title: "Bulk Change Status",
    message:
      "Select which group to update. Only requests matching the selected status will be affected.",
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

  const lastSnapshotRef = useRef("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
      title: "Bulk Change Status",
      message:
        "Select which group to update. Only requests matching the selected status will be affected.",
      tone: "default",
      current: 0,
      total: 0,
      done: false,
    });
  };

  const fetchRequests = async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setLoading(true);
      const data = await requestService.getAllRequests({ page: 1, limit: 100 });
      const items = filterCertifyEligibleRequests(
        Array.isArray(data) ? data : data.items || [],
      );
      const snapshot = JSON.stringify(
        items.map((r) => [r.id, r.status, r.updated_at, r.created_at]),
      );
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setRequests(items);
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
  }, []);

  useEffect(() => {
    const id = setInterval(() => fetchRequests({ silent: true }), 5000);
    return () => clearInterval(id);
  }, []);

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
      r.status === "PROCESSING"
    );
  });

  const lastUpdatedLabel = lastUpdatedAt
    ? `${Math.max(0, Math.floor((nowTick - lastUpdatedAt) / 1000))}s ago`
    : "—";

  const affectedCount = filteredRequests.filter(
    (r) => r.status === bulkStatus,
  ).length;

  const handleView = (row) => setSelectedRequest(row);

  const handleMarkProcessing = async (row) => {
    try {
      setStatusLoadingId(row.id);
      const newStatus = "FOR_RELEASING";
      const updated = await requestService.updateStatus(row.id, newStatus);
      setRequests((prev) =>
        prev.map((item) => (item.id === row.id ? updated : item)),
      );
      if (selectedRequest?.id === row.id) {
        setSelectedRequest(updated);
      }
      fetchRequests();
      showFeedback("Status Updated", "Request status updated successfully.", "success");
    } catch (error) {
      console.error("Failed to update status:", error);
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update status.";
      showFeedback("Update Failed", detail, "error");
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus) return;
    setBulkLoading(true);
    const targets = filteredRequests.filter((r) => r.status === bulkStatus);
    setBulkDialog({
      mode: "progress",
      title: "Updating Status",
      message: `0 of ${targets.length} request${targets.length !== 1 ? "s" : ""} processed.`,
      tone: "info",
      current: 0,
      total: targets.length,
      done: false,
    });
    try {
      for (let i = 0; i < targets.length; i += 1) {
        await requestService.updateStatus(
          targets[i].id,
          bulkStatusTarget[bulkStatus],
        );
        setBulkDialog({
          mode: "progress",
          title: "Updating Status",
          message: `${i + 1} of ${targets.length} request${targets.length !== 1 ? "s" : ""} processed.`,
          tone: "info",
          current: i + 1,
          total: targets.length,
          done: false,
        });
      }
      fetchRequests();
      setBulkDialog({
        mode: "done",
        title: "Bulk Update Complete",
        message: `${targets.length} request${targets.length !== 1 ? "s were" : " was"} updated successfully.`,
        tone: "success",
        current: targets.length,
        total: targets.length,
        done: true,
      });
    } catch (error) {
      console.error("Bulk status change failed:", error);
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Bulk status change failed.";
      setBulkDialog({
        mode: "done",
        title: "Bulk Update Failed",
        message: detail,
        tone: "error",
        current: bulkDialog.current,
        total: targets.length || 1,
        done: true,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const columns = [
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
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      width: "120px",
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status] || "bg-gray-100 text-gray-600"}`}
        >
          {statusLabels[row.status] || row.status}
        </span>
      ),
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
          {row.status === "PROCESSING" && (
            <button
              onClick={() => handleMarkProcessing(row)}
              title="Mark as For Releasing"
              disabled={statusLoadingId === row.id}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusLoadingId === row.id ? (
                <span className="w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <BsArrowRepeat size={18} />
              )}
            </button>
          )}
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
          <button
            onClick={() => setBulkModalOpen(true)}
            disabled={filteredRequests.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Change Status
          </button>
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
        readOnly={true}
      />

      <BulkStatusDialog
        open={bulkModalOpen}
        title={bulkDialog.title}
        message={bulkDialog.message}
        tone={bulkDialog.tone}
        current={bulkDialog.current}
        total={bulkDialog.total}
        done={bulkDialog.done}
        loading={bulkLoading}
        confirmLabel={
          bulkDialog.mode === "form"
            ? "Apply"
            : bulkDialog.done
              ? "Close"
              : "Working..."
        }
        cancelLabel={bulkDialog.mode === "form" ? "Cancel" : ""}
        confirmDisabled={
          bulkDialog.mode === "form" ? !bulkStatus || affectedCount === 0 : false
        }
        onClose={() => {
          if (bulkLoading) return;
          setBulkModalOpen(false);
          setBulkStatus("");
          resetBulkDialog();
        }}
        onConfirm={
          bulkDialog.mode === "form"
            ? handleBulkStatusChange
            : () => {
                setBulkModalOpen(false);
                setBulkStatus("");
                resetBulkDialog();
              }
        }
      >
        {bulkDialog.mode === "form" && (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  All
                </label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
                >
                  <option value="">Select status...</option>
                  <option value="PROCESSING">Processing</option>
                </select>
              </div>
              <div className="mt-4 text-sm text-gray-400">to</div>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Change to
                </label>
                <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                  {bulkStatus
                    ? statusLabels[bulkStatusTarget[bulkStatus]] ||
                      bulkStatusTarget[bulkStatus]
                    : "Select a status first"}
                </div>
              </div>
            </div>
            {bulkStatus && (
              <p className="mt-3 text-xs text-gray-400">
                {affectedCount} request{affectedCount !== 1 ? "s" : ""} will be updated.
              </p>
            )}
          </div>
        )}
      </BulkStatusDialog>

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
