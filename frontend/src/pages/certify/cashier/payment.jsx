import { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../../services/requestService";
import paymentService from "../../../services/paymentService";
import { BsCalendar3, BsChevronDown, BsSearch } from "react-icons/bs";
import { filterCertifyEligibleRequests } from "../../../utils/certifyRequestGuard";
import FeedbackDialog from "../../../components/common/feedbackDialog";

const statusColors = {
  APPROVED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  FOR_RELEASING: "bg-green-100 text-green-700",
  RELEASED: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
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

export default function PaymentTagging() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState({
    label: "Last 7 days",
    days: 7,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [actionLoading, setActionLoading] = useState({});
  const [unpaidIds, setUnpaidIds] = useState(new Set());
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [paymentMap, setPaymentMap] = useState({});
  const [showOrModal, setShowOrModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [orNumberInput, setOrNumberInput] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRequests = async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setLoading(true);
      const [allData, unpaidData] = await Promise.all([
        requestService.getAllRequests({ page: 1, limit: 200 }),
        paymentService.getUnpaidRequests({ page: 1, limit: 500 }),
      ]);
      const allRequests = filterCertifyEligibleRequests(
        Array.isArray(allData) ? allData : allData.items || [],
      );
      const unpaidList = Array.isArray(unpaidData)
        ? unpaidData
        : unpaidData.items || [];
      const unpaidSet = new Set(unpaidList.map((r) => r.id));
      const refs = allRequests.map((r) => r.reference_number).filter(Boolean);
      const paymentInfo = await paymentService.getPaymentsByReferences(refs);
      const map = {};
      (paymentInfo?.items || []).forEach((item) => {
        map[item.reference_number] = item;
      });
      setUnpaidIds(unpaidSet);
      setPaymentMap(map);
      setRequests(allRequests);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    const id = setInterval(() => fetchRequests({ silent: true }), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(num);
  };

  const handleRecordPayment = async (row) => {
    if (!row?.id) return;
    setActionLoading((prev) => ({ ...prev, [row.id]: true }));
    try {
      await paymentService.createPayment({
        request_id: row.id,
        amount:
          row.request_cost !== null && row.request_cost !== undefined
            ? Number(row.request_cost)
            : null,
        payment_method: "CASH",
        payment_status: "PAID",
        or_number: orNumberInput.trim(),
      });
      await fetchRequests();
    } catch (err) {
      console.error("Failed to record payment:", err);
      showFeedback("Payment Failed", "Failed to record payment.", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [row.id]: false }));
    }
  };

  const openOrModal = (row) => {
    setSelectedRow(row);
    setOrNumberInput("");
    setShowOrModal(true);
  };

  const closeOrModal = () => {
    setShowOrModal(false);
    setSelectedRow(null);
    setOrNumberInput("");
  };

  const confirmOrAndRecord = async () => {
    if (!selectedRow?.id) return;
    if (!orNumberInput.trim()) {
      showFeedback("OR Number Required", "Please enter OR Number.", "warning");
      return;
    }
    const rowToRecord = selectedRow;
    closeOrModal();
    await handleRecordPayment(rowToRecord);
  };

  const filtered = requests
    .filter((r) => {
      const query = search.toLowerCase();
      const searchFields = [
        r.reference_number,
        r.student_name,
        r.certificate_type_name,
        r.program,
        r.sr_code,
        r.requestor_name,
      ];
      const matchesSearch = searchFields.some((val) =>
        String(val || "")
          .toLowerCase()
          .includes(query),
      );
      const dateFrom = getDateFrom(selectedFilter.days);
      const matchesDate = dateFrom
        ? new Date(r.created_at).toISOString().split("T")[0] >= dateFrom
        : true;
      const matchesUnpaid = showOnlyUnpaid ? unpaidIds.has(r.id) : true;
      return matchesSearch && matchesDate && matchesUnpaid;
    })
    .sort((a, b) => {
      const aUnpaid = unpaidIds.has(a.id);
      const bUnpaid = unpaidIds.has(b.id);
      if (aUnpaid === bUnpaid) return 0;
      return aUnpaid ? -1 : 1;
    });

  const columns = [
    {
      name: "Reference No.",
      selector: (row) => row.reference_number,
      sortable: true,
      width: "150px",
    },
    {
      name: "Student Name",
      selector: (row) => row.student_name,
      sortable: true,
      width: "200px",
    },
    {
      name: "Certificate Type",
      selector: (row) => row.certificate_type_name,
      sortable: true,
      width: "280px",
    },
    {
      name: "Date Requested",
      selector: (row) => row.created_at,
      sortable: true,
      width: "150px",
      cell: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
    },
    {
      name: "Date Paid",
      selector: (row) => paymentMap[row.reference_number]?.paid_at,
      sortable: true,
      width: "130px",
      cell: (row) => {
        const paidAt = paymentMap[row.reference_number]?.paid_at;
        return paidAt
          ? new Date(paidAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—";
      },
    },
    {
      name: "Amount Due",
      selector: (row) => row.request_cost,
      sortable: true,
      cell: (row) => formatMoney(row.request_cost),
      width: "130px",
    },
    {
      name: "Status",
      selector: (row) => (unpaidIds.has(row.id) ? "UNPAID" : "PAID"),
      sortable: true,
      width: "120px",
      cell: (row) => {
        const isUnpaid = unpaidIds.has(row.id);
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isUnpaid
                ? "bg-yellow-100 text-yellow-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isUnpaid ? "UNPAID" : "PAID"}
          </span>
        );
      },
    },
    {
      name: "OR No.",
      selector: (row) => row.or_number || "",
      sortable: false,
      width: "150px",
      cell: (row) => (unpaidIds.has(row.id) ? "—" : row.or_number || "—"),
    },
    {
      name: "Action",
      button: true,
      cell: (row) => {
        const status = String(row.status || "").toUpperCase();
        const isUnpaid = unpaidIds.has(row.id);
        const canRecord =
          status === "PROCESSING" &&
          isUnpaid &&
          row.request_cost !== null &&
          row.request_cost !== undefined;
        return (
          <button
            onClick={() => openOrModal(row)}
            disabled={!canRecord || actionLoading[row.id]}
            className={`px-3 py-1.5 text-xs font-medium text-nowrap rounded-md border transition-colors ${
              canRecord
                ? "bg-[#ee1133] border-[#ee1133] text-white hover:bg-red-700"
                : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {actionLoading[row.id] ? "Recording..." : "Record Payment"}
          </button>
        );
      },
    },
  ];

  const LoadingState = () => (
    <div className="py-10 text-xs text-gray-400 flex items-center justify-center gap-2">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      Loading requests...
    </div>
  );

  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <button className="text-lg font-bold  text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors  rounded">
          <span>Payment Tagging</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOnlyUnpaid((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              showOnlyUnpaid
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {showOnlyUnpaid ? "Unpaid Only" : "All Requests"}
          </button>
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
          progressComponent={<LoadingState />}
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
      <span className="text-[11px] text-gray-400">
        Last updated:{" "}
        {lastUpdatedAt
          ? `${Math.max(0, Math.floor((nowTick - lastUpdatedAt) / 1000))}s ago`
          : "—"}
      </span>

      {showOrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] px-4">
          <div className="w-full max-w-sm rounded-lg bg-white border border-gray-200 shadow-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800">
              Enter OR Number
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Please enter the official receipt number before recording payment.
            </p>
            <input
              type="text"
              value={orNumberInput}
              onChange={(e) => setOrNumberInput(e.target.value)}
              placeholder="OR Number"
              className="mt-3 w-full text-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-400"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeOrModal}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrAndRecord}
                className="px-3 py-1.5 text-xs font-medium text-nowrap text-white bg-[#ee1133] border border-[#ee1133] rounded-md hover:bg-red-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
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
