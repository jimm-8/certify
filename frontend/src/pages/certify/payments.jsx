import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import paymentService from "../../services/paymentService";

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

const Payments = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [orNumber, setOrNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestService.getAllRequests({
        page: 1,
        limit: 200,
        status: "PENDING",
      });
      setRequests(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return requests;
    return requests.filter((r) =>
      [
        r.reference_number,
        r.student_name,
        r.requestor_name,
        r.certificate_type_name,
        r.program,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(needle)),
    );
  }, [requests, search]);

  const openPaymentModal = (row) => {
    setSelectedRequest(row);
    setAmount(row.request_cost ? String(row.request_cost) : "");
    setPaymentMethod("Cash");
    setOrNumber("");
    setError("");
    setModalOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedRequest) return;
    if (!amount || Number.isNaN(Number(amount))) {
      setError("Please enter a valid amount.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await paymentService.createPayment({
        request_id: selectedRequest.id,
        amount: Number(amount),
        payment_method: paymentMethod,
        payment_status: "PAID",
        or_number: orNumber || null,
      });
      setModalOpen(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to record payment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      name: "Reference No.",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Student Name",
      selector: (row) => row.student_name,
      sortable: true,
    },
    {
      name: "Certificate Type",
      selector: (row) => row.certificate_type_name,
      sortable: true,
    },
    {
      name: "Amount",
      selector: (row) =>
        row.request_cost !== null && row.request_cost !== undefined
          ? `Php ${row.request_cost}`
          : "-",
      sortable: true,
    },
    {
      name: "Action",
      ignoreRowClick: true,
      cell: (row) => (
        <button
          onClick={() => openPaymentModal(row)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors"
        >
          Record Payment
        </button>
      ),
    },
  ];

  return (
    <div className="bg-white w-full rounded-md border border-gray-200 shadow-sm -mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            Cashier Payments
          </h2>
          <p className="text-xs text-gray-500">
            Record payments for pending requests.
          </p>
        </div>
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs px-3 py-1.5 focus:outline-none w-52"
          />
        </div>
      </div>

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
              No pending requests found.
            </div>
          }
        />
      </div>

      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md shadow-lg w-full max-w-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Record Payment
            </h3>
            <div className="text-xs text-gray-500 mb-3">
              {selectedRequest.reference_number} - {selectedRequest.student_name}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount (Php)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs"
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  OR Number (optional)
                </label>
                <input
                  type="text"
                  value={orNumber}
                  onChange={(e) => setOrNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs"
                />
              </div>
              {error && (
                <div className="text-xs text-red-500">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={submitting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
