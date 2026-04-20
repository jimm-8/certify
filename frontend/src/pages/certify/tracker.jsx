import React, { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import RequestModal from "../../components/common/requestModal";
import BulkStatusModal from "../../components/common/bulkStatusModal";
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
  const [statusError, setStatusError] = useState("");
  const [statusToast, setStatusToast] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const lastSnapshotRef = useRef("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(
    () => setCurrentPage(1),
    [search, selectedFilter, selectedType, selectedProgram],
  );

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
      r.status !== "PENDING" &&
      r.status !== "REJECTED" &&
      r.status !== "FOR_RELEASING" &&
      r.status !== "RELEASED"
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
    setStatusError("");
    try {
      setStatusLoadingId(row.id);
      setStatusToast({ type: "loading", message: "Updating status..." });
      const newStatus =
        row.status === "APPROVED" ? "PROCESSING" : "FOR_RELEASING";
      const updated = await requestService.updateStatus(row.id, newStatus);
      setRequests((prev) =>
        prev.map((item) => (item.id === row.id ? updated : item)),
      );
      if (selectedRequest?.id === row.id) {
        setSelectedRequest(updated);
      }
      fetchRequests();
      setStatusToast({ type: "success", message: "Status updated." });
    } catch (error) {
      console.error("Failed to update status:", error);
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update status.";
      setStatusError(detail);
      setStatusToast({ type: "error", message: detail });
    } finally {
      setStatusLoadingId(null);
      setTimeout(() => setStatusToast(null), 2500);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus) return;
    setBulkLoading(true);
    setStatusError("");
    try {
      setStatusToast({ type: "loading", message: "Updating requests..." });
      await Promise.all(
        filteredRequests
          .filter((r) => r.status === bulkStatus)
          .map((r) =>
            requestService.updateStatus(r.id, bulkStatusTarget[bulkStatus]),
          ),
      );
      setBulkModalOpen(false);
      setBulkStatus("");
      fetchRequests();
      setStatusToast({ type: "success", message: "Bulk update completed." });
    } catch (error) {
      console.error("Bulk status change failed:", error);
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Bulk status change failed.";
      setStatusError(detail);
      setStatusToast({ type: "error", message: detail });
    } finally {
      setBulkLoading(false);
      setTimeout(() => setStatusToast(null), 2500);
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
          {(row.status === "APPROVED" || row.status === "PROCESSING") && (
            <button
              onClick={() => handleMarkProcessing(row)}
              title={
                row.status === "APPROVED"
                  ? "Mark as Processing"
                  : "Mark as For Releasing"
              }
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

      <BulkStatusModal
        open={bulkModalOpen}
        onClose={() => {
          setBulkModalOpen(false);
          setBulkStatus("");
        }}
        bulkStatus={bulkStatus}
        setBulkStatus={setBulkStatus}
        onApply={handleBulkStatusChange}
        loading={bulkLoading}
        affectedCount={affectedCount}
      />

      {(statusLoadingId || bulkLoading) && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-md px-6 py-4 shadow-lg flex items-center gap-3">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-700">Updating status...</span>
          </div>
        </div>
      )}

      {statusToast && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`px-4 py-3 rounded-md shadow-lg text-sm ${
              statusToast.type === "success"
                ? "bg-green-600 text-white"
                : statusToast.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-gray-900 text-white"
            }`}
          >
            {statusToast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracker;
