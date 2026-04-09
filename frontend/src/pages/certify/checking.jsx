import React, { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import RequestModal from "../../components/common/requestModal";
import { BsSearch, BsCalendar3, BsChevronDown } from "react-icons/bs";

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
      fontSize: "0.75rem",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
    },
  },
  rows: {
    style: {
      fontSize: "0.875rem",
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const isCourseDescriptionType = (name) =>
    String(name || "").toLowerCase().includes("course description");
  const isGradesType = (name) =>
    String(name || "").toLowerCase().includes("grades");
  const requiresCourseSelection = (name) =>
    isCourseDescriptionType(name) || isGradesType(name);

  const fetchRequests = async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setLoading(true);
      const data = await requestService.getAllRequests({ page: 1, limit: 100 });
      const all = Array.isArray(data) ? data : data.items || [];
      setRequests(all.filter((r) => r.status === "APPROVED"));
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
    return matchesSearch && matchesDate && matchesType && matchesProgram;
  });

  const lastUpdatedLabel = lastUpdatedAt
    ? `${Math.max(0, Math.floor((nowTick - lastUpdatedAt) / 1000))}s ago`
    : "-";

  const handleAdvance = async (req) => {
    if (requiresCourseSelection(req.certificate_type_name)) {
      setSelectedRequest(req);
      return;
    }
    const nextStatus = "PROCESSING";
    setActionLoading((prev) => ({ ...prev, [`advance_${req.id}`]: true }));
    try {
      await requestService.updateStatus(
        req.id,
        nextStatus,
        "Request moved to processing",
      );
      fetchRequests();
    } catch (error) {
      console.error("Failed to advance request:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`advance_${req.id}`]: false }));
    }
  };

  const handleEmail = (req) => {
    const to = req.requestor_email || req.email || "";
    const subject = "Certificate Request Update";
    const gmailUrl =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&to=${encodeURIComponent(to)}` +
      `&su=${encodeURIComponent(subject)}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  };

  const handleModalApprove = async (req) => {
    const nextStatus = "PROCESSING";
    setModalLoading(true);
    try {
      await requestService.updateStatus(
        req.id,
        nextStatus,
        "Request moved to processing",
      );
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Failed to advance request:", error);
    } finally {
      setModalLoading(false);
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
      await Promise.all(
        filteredRequests.map((r) =>
          requestService.updateStatus(
            r.id,
            "PROCESSING",
            "Request moved to processing",
          ),
        ),
      );
      fetchRequests();
    } catch (error) {
      console.error("Bulk advance failed:", error);
    } finally {
      setBulkApproveLoading(false);
    }
  };

  const columns = [
    {
      name: "SR Code",
      selector: (row) => row.reference_number || row.sr_code || "-",
      sortable: true,
      cell: (row) => row.reference_number || row.sr_code || "-",
      width: "180px",
    },
    {
      name: "Requester Name",
      selector: (row) => row.student_name || row.requester_name || "-",
      sortable: true,
    },
    {
      name: "Campus",
      selector: (row) => row.campus || "Alangilan",
      sortable: true,
    },
    {
      name: "Certificate Type",
      selector: (row) => row.certificate_type_name || "-",
      sortable: true,
    },
    {
      name: "Date Requested",
      selector: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
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
            {actionLoading[`advance_${row.id}`] ? "..." : "Process"}
          </button>
          <button
            onClick={() => handleEmail(row)}
            className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
          >
            Email
          </button>
          <button
            onClick={() => setSelectedRequest(row)}
            className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            View
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
            Process All
          </button>
          {filteredRequests.some((r) =>
            requiresCourseSelection(r.certificate_type_name),
          ) && (
            <span className="text-[11px] text-gray-400">
              Course Description and Certification of Grades require selecting
              courses individually.
            </span>
          )}
        </div>

        {/* RIGHT — Filters */}
        <div className="flex items-center gap-2">
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

      {/* Table */}
      <div className="border border-gray-200 rounded mt-2">
        <DataTable
          columns={columns}
          data={filteredRequests}
          progressPending={loading}
          progressComponent={<LoadingState />}
          pagination
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
      <span className="text-[11px] text-gray-400">
        Last updated: {lastUpdatedLabel}
      </span>

      <RequestModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onApprove={handleModalApprove}
        loading={modalLoading}
      />
    </div>
  );
};

export default Checking;
