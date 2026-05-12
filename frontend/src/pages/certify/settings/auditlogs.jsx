import React, { useEffect, useRef, useState } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import {
  BsCalendar3,
  BsChevronDown,
  BsSearch,
  BsChevronLeft,
} from "react-icons/bs";
import requestService from "../../../services/requestService";
import {
  formatAuditLogAction,
  formatAuditLogChange,
  formatAuditLogField,
  formatAuditLogNotes,
} from "../../../utils/auditLogFormatter";

const AuditLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState({
    label: "Last 7 days",
    days: 7,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const LoadingState = () => (
    <div className="py-10 text-xs text-gray-400 flex items-center justify-center gap-2">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      Loading audit logs...
    </div>
  );

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await requestService.getAllAuditLogs({
        page: 1,
        limit: 200,
      });
      const all = Array.isArray(data) ? data : data.items || [];
      setLogs(all);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
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

  const filteredLogs = logs
    .filter((log) => {
      const searchableValues = [
        log.user_name,
        log.action,
        log.field_name,
        log.old_value,
        log.new_value,
        log.notes,
        log.request_reference,
        log.request_label,
        log.student_name,
        formatAuditLogAction(log),
        formatAuditLogField(log),
        formatAuditLogNotes(log),
      ];
      const matchesSearch = searchableValues.some((val) =>
        String(val || "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
      const dateFrom = getDateFrom(selectedFilter.days);
      const matchesDate = dateFrom
        ? new Date(log.created_at).toISOString().split("T")[0] >= dateFrom
        : true;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const columns = [
    {
      id: "created_at",
      name: "Timestamp",
      selector: (row) => row.created_at,
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
      width: "160px",
    },
    {
      name: "User",
      selector: (row) => row.user_name || "System",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-gray-700">
          {row.user_name || "System"}
        </span>
      ),
      width: "170px",
    },
    {
      name: "Action",
      selector: (row) => formatAuditLogAction(row),
      sortable: true,
      grow: 2,
      cell: (row) => (
        <span className="text-[11px] font-semibold text-gray-700">
          {formatAuditLogAction(row)}
        </span>
      ),
      width: "180px",
    },
    {
      name: "Field",
      selector: (row) => formatAuditLogField(row),
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-gray-600">
          {formatAuditLogField(row)}
        </span>
      ),
      width: "120px",
    },
    {
      name: "Change",
      selector: (row) => formatAuditLogChange(row),
      grow: 2,
      cell: (row) => (
        <div className="text-xs text-gray-600 break-words">
          {formatAuditLogChange(row)}
        </div>
      ),
    },
    {
      name: "Notes",
      selector: (row) => formatAuditLogNotes(row),
      grow: 2,
      cell: (row) => (
        <span className="text-xs text-gray-500 line-clamp-2">
          {formatAuditLogNotes(row)}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="bg-white rounded-md border border-gray-200 shadow-sm mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
            className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors rounded"
          >
            <BsChevronLeft style={{ strokeWidth: "0.5" }} />
            <span>Audit Logs</span>
          </button>
          <div className="flex items-center gap-2">
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

            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
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
            data={filteredLogs}
            progressPending={loading}
            progressComponent={<LoadingState />}
            pagination
            customStyles={customStyles}
            highlightOnHover
            responsive
            defaultSortFieldId="created_at"
            defaultSortAsc={false}
            noDataComponent={
              <div className="py-10 text-xs text-gray-400">
                No audit logs found.
              </div>
            }
          />
        </div>
      </div>
    </>
  );
};

export default AuditLogs;
