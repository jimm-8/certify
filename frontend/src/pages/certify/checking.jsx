import React, { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import RequestModal from "../../components/common/requestModal";
import BulkRejectModal from "../../components/common/bulkRejectModal";
import { BsSearch, BsCalendar3, BsChevronDown, BsEye } from "react-icons/bs";

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

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-600",
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
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectLoading, setBulkRejectLoading] = useState(false);
  const [bulkRejectNotes, setBulkRejectNotes] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestService.getAllRequests({
        page: 1,
        limit: 100,
        status: "pending",
      });
      setRequests(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
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

  const handleView = (row) => setSelectedRequest(row);

  const handleApprove = async (req) => {
    setModalLoading(true);
    try {
      await requestService.updateStatus(
        req.id,
        "APPROVED",
        "All documents verified",
      );
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Failed to approve request:", error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDecline = async (req, notes) => {
    setModalLoading(true);
    try {
      await requestService.updateStatus(req.id, "REJECTED", notes);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Failed to decline request:", error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    setBulkApproveLoading(true);
    try {
      await Promise.all(
        filteredRequests.map((r) =>
          requestService.updateStatus(
            r.id,
            "APPROVED",
            "All documents verified",
          ),
        ),
      );
      fetchRequests();
    } catch (error) {
      console.error("Bulk approve failed:", error);
    } finally {
      setBulkApproveLoading(false);
    }
  };

  const handleBulkReject = async () => {
    setBulkRejectLoading(true);
    try {
      await Promise.all(
        filteredRequests.map((r) =>
          requestService.updateStatus(r.id, "REJECTED", bulkRejectNotes),
        ),
      );
      setBulkRejectOpen(false);
      setBulkRejectNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Bulk reject failed:", error);
    } finally {
      setBulkRejectLoading(false);
    }
  };

  const columns = [
    {
      name: "Reference No.",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Certificate Type",
      selector: (row) => row.certificate_type_name,
      sortable: true,
    },
    {
      name: "Student Name",
      selector: (row) => row.student_name,
      sortable: true,
    },
    { name: "Program", selector: (row) => row.program, sortable: true },
    { name: "Purpose", selector: (row) => row.purpose, sortable: true },
    {
      name: "Date Requested",
      selector: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status] || "bg-gray-100 text-gray-600"}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      name: "Action",
      ignoreRowClick: true,
      cell: (row) => (
        <button
          onClick={() => handleView(row)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ee1133] border border-blue-200 rounded-md hover:bg-blue-50 transition-colors duration-150"
        >
          <BsEye size={13} />
        </button>
      ),
    },
  ];

  return (
    <div className="bg-white w-full rounded-md border border-gray-200 shadow-sm -mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* LEFT — Bulk Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkApprove}
            disabled={bulkApproveLoading || filteredRequests.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {bulkApproveLoading && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Approve All
          </button>

          <button
            onClick={() => setBulkRejectOpen(true)}
            disabled={filteredRequests.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            Reject All
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
        <DataTable
          columns={columns}
          data={filteredRequests}
          progressPending={loading}
          pagination
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

      <RequestModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onApprove={handleApprove}
        onDecline={handleDecline}
        loading={modalLoading}
      />

      <BulkRejectModal
        open={bulkRejectOpen}
        onClose={() => {
          setBulkRejectOpen(false);
          setBulkRejectNotes("");
        }}
        onConfirm={handleBulkReject}
        loading={bulkRejectLoading}
        notes={bulkRejectNotes}
        setNotes={setBulkRejectNotes}
        affectedCount={filteredRequests.length}
      />
    </div>
  );
};

export default Checking;
