import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import reportService from "../../services/reportService";
import { filterCertifyEligibleRequests } from "../../utils/certifyRequestGuard";
import formatApiError from "../../utils/formatApiError";
import FeedbackDialog from "../../components/common/feedbackDialog";
import {
  BsCalendar3,
  BsChevronDown,
  BsSearch,
  BsChevronLeft,
  BsFunnel,
  BsDownload,
} from "react-icons/bs";

const statusColors = {
  APPROVED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  FOR_RELEASING: "bg-green-100 text-green-700",
  RELEASED: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  PENDING: "bg-yellow-100 text-yellow-700",
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
      "&:hover": { backgroundColor: "#f9fafb" },
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

export default function AllRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedFilter, setSelectedFilter] = useState({
    label: "Last 7 days",
    days: 7,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "default",
  });

  const showFeedback = (title, message, tone = "default") => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
    });
  };

  const filterOptions = [
    { label: "Today", days: 0 },
    { label: "Last 3 days", days: 3 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "All time", days: null },
  ];

  const dynamicStatusOptions = useMemo(() => {
    const unique = [...new Set(requests.map((r) => r.status))].filter(Boolean);
    return ["ALL", ...unique.sort()];
  }, [requests]);

  const getDateFrom = (days) => {
    if (days === null) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target)
      ) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestService.getAllRequests({ page: 1, limit: 200 });
      setRequests(
        filterCertifyEligibleRequests(
          Array.isArray(data) ? data : data.items || [],
        ),
      );
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatProgram = (programValue) => {
    if (!programValue) return "-";

    return String(programValue)
      .replace(/Bachelor of Science/gi, "BS")
      .replace(/Bachelor of Arts/gi, "BA")
      .replace(/Bachelor of/gi, "")
      .replace(/\s*in\s*/i, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const formatDisplayDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const filtered = requests.filter((r) => {
    const matchesSearch = Object.values(r).some((val) =>
      String(val).toLowerCase().includes(search.toLowerCase()),
    );

    const dateFrom = getDateFrom(selectedFilter.days);
    const matchesDate = dateFrom
      ? new Date(r.created_at).toISOString().split("T")[0] >= dateFrom
      : true;

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

    return matchesSearch && matchesDate && matchesStatus;
  });

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    try {
      const blob = await reportService.downloadRequests({
        search,
        status_filter: statusFilter,
        date_days:
          selectedFilter.days === null ? "null" : String(selectedFilter.days),
      });
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      downloadBlob(blob, `all_requests_${timestamp}.xlsx`);
    } catch (error) {
      console.error("Failed to download requests export:", error);
      showFeedback(
        "Download Failed",
        formatApiError(error, "Failed to download requests export."),
        "error",
      );
    }
  };

  const columns = [
    {
      name: "Reference No.",
      selector: (row) => row.reference_number,
      sortable: true,
      width: "150px",
    },
    {
      name: "Certificate Type",
      selector: (row) => row.certificate_type_name,
      sortable: true,
      width: "400px",
    },
    {
      name: "Student Name",
      selector: (row) => row.student_name,
      sortable: true,
      width: "300px",
    },
    {
      name: "Program",
      selector: (row) => formatProgram(row.program),
      sortable: true,
      width: "280px",
    },
    {
      name: "Date Requested",
      selector: (row) => row.created_at,
      sortable: true,
      cell: (row) => formatDisplayDate(row.created_at),
      width: "180px",
    },
    {
      name: "Date Released",
      selector: (row) =>
        row.status === "RELEASED" ? row.updated_at || "" : "",
      sortable: true,
      cell: (row) =>
        row.status === "RELEASED" ? formatDisplayDate(row.updated_at) : "—",
      width: "180px",
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[row.status] || "bg-gray-100 text-gray-600"
          }`}
        >
          {row.status}
        </span>
      ),
      width: "150px",
    },
  ];

  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors rounded"
        >
          <BsChevronLeft style={{ strokeWidth: "0.5" }} />
          <span>All Requests</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex items-center gap-2  border border-gray-300   rounded-md px-3 py-1.5 text-xs bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <BsDownload size={14} />
            <span className="font-medium">Download Excel</span>
          </button>

          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-1.5 bg-white text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <BsFunnel size={16} className="text-gray-400" />
              <span className="font-medium">
                {statusFilter === "ALL" ? "All Statuses" : statusFilter}
              </span>
              <BsChevronDown size={14} className="text-gray-400" />
            </button>
            {statusDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  Select Status
                </div>
                {dynamicStatusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                      statusFilter === status
                        ? "bg-blue-600 text-white font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {status === "ALL" ? "Show All" : status}
                  </button>
                ))}
              </div>
            )}
          </div>

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
                <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  Time Range
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

          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs px-3 py-1.5 focus:outline-none w-44"
            />
            <div className="w-px self-stretch bg-gray-300" />
            <div className="px-3 py-1.5 cursor-pointer group">
              <BsSearch className="text-gray-400 group-hover:text-[#ee1133] transition-colors duration-150" />
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded mt-2">
        <DataTable
          columns={columns}
          data={filtered}
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
}
