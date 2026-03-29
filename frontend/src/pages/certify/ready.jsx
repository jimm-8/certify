import React, { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";
import {
  BsSearch,
  BsCalendar3,
  BsChevronDown,
  BsEye,
  BsPrinter,
  BsCheckLg,
  BsDownload,
  BsX,
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

const Ready = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(filterOptions[4]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const lastSnapshotRef = useRef("");

  const fetchRequests = async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setLoading(true);
      const data = await requestService.getAllRequests({ page: 1, limit: 100 });
      const all = Array.isArray(data) ? data : data.items || [];
      const filtered = all.filter((r) => r.status === "FOR_RELEASING");
      const snapshot = JSON.stringify(
        filtered.map((r) => [r.id, r.status, r.updated_at, r.created_at]),
      );
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setRequests(filtered);
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

    return matchesSearch && matchesDate && matchesType && matchesProgram;
  });

  const lastUpdatedLabel = lastUpdatedAt
    ? `${Math.max(0, Math.floor((nowTick - lastUpdatedAt) / 1000))}s ago`
    : "—";

  const handleView = async (row) => {
    setPdfLoading(true);
    try {
      const blob = await requestService.downloadCertificate(row.id);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      setPdfUrl(url);
    } catch (error) {
      console.error("Failed to load certificate:", error);
      alert("Failed to load certificate preview.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePdf = () => {
    if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  const handlePrint = async (row) => {
    try {
      const blob = await requestService.downloadCertificate(row.id);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_${row.student_name}_${row.reference_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 3000);
    } catch (error) {
      console.error("Failed to download certificate:", error);
      alert("Failed to download certificate. Please try again.");
    }
  };

  const handleComplete = async (row) => {
    try {
      await requestService.updateStatus(row.id, "RELEASED");
      fetchRequests();
    } catch (error) {
      console.error("Failed to mark as released:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleBulkDownload = async () => {
    setBulkDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      await Promise.all(
        filteredRequests.map(async (r) => {
          try {
            const blob = await requestService.downloadCertificate(r.id);
            zip.file(
              `Certificate_${r.student_name}_${r.reference_number}.pdf`,
              blob,
            );
          } catch (err) {
            console.error(
              `Failed to fetch certificate for ${r.reference_number}:`,
              err,
            );
          }
        }),
      );

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificates_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 3000);
    } catch (error) {
      console.error("Bulk download failed:", error);
      alert("Failed to download certificates. Please try again.");
    } finally {
      setBulkDownloading(false);
    }
  };

  const handlePrintAll = async () => {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      for (const row of filteredRequests) {
        try {
          const blob = await requestService.downloadCertificate(row.id);
          const arrayBuffer = await blob.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Failed to load PDF for ${row.reference_number}:`, err);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const mergedBlob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(mergedBlob);

      // Open merged PDF and trigger print
      const win = window.open(url);
      win?.addEventListener("load", () => {
        win.print();
        setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      });
    } catch (error) {
      console.error("Failed to merge and print PDFs:", error);
      alert("Failed to print certificates. Please try again.");
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
      selector: (row) => row.created_at,
      cell: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
      sortable: true,
    },
    {
      name: "Release Date",
      selector: (row) => row.updated_at,
      cell: (row) =>
        row.status === "FOR_RELEASING" && row.updated_at
          ? new Date(row.updated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
      sortable: true,
    },
    {
      name: "Action",
      ignoreRowClick: true,
      minWidth: "180px",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleView(row)}
            title="View Details"
            className="flex items-center px-3 py-1.5 text-xs font-medium text-[#ee1133] border border-blue-200 rounded-md hover:bg-blue-50 transition-colors duration-150"
          >
            <BsEye size={13} />
          </button>

          <button
            onClick={() => handlePrint(row)}
            title="Download Certificate"
            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-150"
          >
            <BsPrinter size={13} />
          </button>

          <button
            onClick={() => handleComplete(row)}
            title="Mark as Released"
            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-150"
          >
            <BsCheckLg size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white w-full rounded-md border border-gray-200 shadow-sm -mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* LEFT — Bulk Download */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkDownload}
            disabled={bulkDownloading || filteredRequests.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {bulkDownloading ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <BsDownload size={13} />
            )}
            {bulkDownloading ? "Preparing ZIP..." : "Download All"}
          </button>

          <button
            onClick={handlePrintAll}
            disabled={filteredRequests.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 bg-white rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <BsPrinter size={13} />
            Print All
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
              No requests ready for releasing.
            </div>
          }
        />
      </div>
      <span className="text-[11px] text-gray-400">
        Last updated: {lastUpdatedLabel}
      </span>

      {/* PDF Viewer Modal */}
      {(pdfUrl || pdfLoading) && (
        <div
          onClick={handleClosePdf}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <p className="text-sm font-semibold text-gray-800">
                Certificate Preview
              </p>
              <button
                onClick={handleClosePdf}
                className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <BsX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {pdfLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-sm text-gray-400">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  Loading certificate...
                </div>
              ) : (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="Certificate Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ready;
