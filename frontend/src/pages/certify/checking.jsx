import React, { useEffect, useState, useRef } from "react";
import requestService from "../../services/requestService";
import RequestModal from "../../components/common/requestModal";
import BulkRejectModal from "../../components/common/bulkRejectModal";
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

const ROWS_PER_PAGE = 15;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState({});

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

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    requestService.getCertificateTypes().then(setCertificateTypes).catch(console.error);
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
      String(val).toLowerCase().includes(search.toLowerCase())
    );
    const dateFrom = getDateFrom(selectedFilter.days);
    const matchesDate = dateFrom
      ? new Date(r.created_at).toISOString().split("T")[0] >= dateFrom
      : true;
    const matchesType = selectedType ? r.certificate_type_name === selectedType : true;
    const matchesProgram = selectedProgram ? r.program === selectedProgram : true;
    return matchesSearch && matchesDate && matchesType && matchesProgram;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / ROWS_PER_PAGE);
  const paginated = filteredRequests.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const handleApprove = async (req) => {
    setActionLoading((prev) => ({ ...prev, [`approve_${req.id}`]: true }));
    try {
      await requestService.updateStatus(req.id, "APPROVED", "All documents verified");
      fetchRequests();
    } catch (error) {
      console.error("Failed to approve:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`approve_${req.id}`]: false }));
    }
  };

  const handleReject = async (req) => {
    setActionLoading((prev) => ({ ...prev, [`reject_${req.id}`]: true }));
    try {
      await requestService.updateStatus(req.id, "REJECTED", "Rejected by checker");
      fetchRequests();
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`reject_${req.id}`]: false }));
    }
  };

  const handleEmail = (req) => {
    window.location.href = `mailto:${req.email || ""}?subject=Certificate Request Update`;
  };

  const handleModalApprove = async (req) => {
    setModalLoading(true);
    try {
      await requestService.updateStatus(req.id, "APPROVED", "All documents verified");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Failed to approve request:", error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalDecline = async (req, notes) => {
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
          requestService.updateStatus(r.id, "APPROVED", "All documents verified")
        )
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
          requestService.updateStatus(r.id, "REJECTED", bulkRejectNotes)
        )
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

  return (
    <div className="bg-white w-full rounded-md border border-gray-200 shadow-sm -mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3">
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
            onChange={(e) => { setSelectedProgram(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-1.5 bg-white text-xs text-gray-600 hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <option value="">All Programs</option>
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-1.5 bg-white text-xs text-gray-600 hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <option value="">All Certificate Types</option>
            {certificateTypes.map((ct) => (
              <option key={ct.id} value={ct.name}>{ct.name}</option>
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
                <div className="px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">Filter</div>
                {filterOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => { setSelectedFilter(option); setDropdownOpen(false); setCurrentPage(1); }}
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
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["SR Code", "Requester Name", "Section", "Campus", "Certificate Type", "Action"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-xs text-gray-400">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#ee1133]" />
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-xs text-gray-400">
                  No requests found.
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={row.id || i}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRequest(row)}
                >
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-500 whitespace-nowrap">
                    {row.reference_number || row.sr_code || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                    {row.student_name || row.requester_name || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                    {row.section || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                    {row.campus || "Alangilan"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">
                    {row.certificate_type_name || "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {/* Accept */}
                      <button
                        onClick={() => handleApprove(row)}
                        disabled={actionLoading[`approve_${row.id}`]}
                        className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading[`approve_${row.id}`] ? "..." : "Accept"}
                      </button>
                      {/* Reject */}
                      <button
                        onClick={() => handleReject(row)}
                        disabled={actionLoading[`reject_${row.id}`]}
                        className="px-3 py-1 text-xs font-semibold text-white bg-[#ee1133] rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading[`reject_${row.id}`] ? "..." : "Reject"}
                      </button>
                      {/* Email */}
                      <button
                        onClick={() => handleEmail(row)}
                        className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                      >
                        Email
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filteredRequests.length > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs text-gray-400">
            Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, filteredRequests.length)} of {filteredRequests.length} results
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              ‹ Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                      currentPage === item
                        ? "bg-[#ee1133] text-white border-[#ee1133]"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Next ›
            </button>
          </div>
        </div>
      )}

      <RequestModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onApprove={handleModalApprove}
        onDecline={handleModalDecline}
        loading={modalLoading}
      />

      <BulkRejectModal
        open={bulkRejectOpen}
        onClose={() => { setBulkRejectOpen(false); setBulkRejectNotes(""); }}
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