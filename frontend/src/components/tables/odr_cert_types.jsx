import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";

const REQUEST_OPTIONS = [
  {
    id: 1,
    copies: 1,
    request_type: "document",
    requested_documents: "Authentication",
    unit_cost: "20.00 per Page",
  },
  {
    id: 2,
    copies: 1,
    request_type: "certificate",
    requested_documents: "Certificate of Transfer Credentials",
    unit_cost: "100.00",
  },
  {
    id: 3,
    copies: 1,
    request_type: "certificate",
    requested_documents: "Certification",
    unit_cost: "30.00",
  },
  {
    id: 4,
    copies: 1,
    request_type: "document",
    requested_documents: "Diploma",
    unit_cost: "400.00",
  },
  {
    id: 5,
    copies: 1,
    request_type: "document",
    requested_documents: "Form 137",
    unit_cost: "100.00",
  },
  {
    id: 6,
    copies: 1,
    request_type: "document",
    requested_documents: "Graduation Fee",
    unit_cost: "1, 000.00",
  },
  {
    id: 7,
    copies: 1,
    request_type: "document",
    requested_documents: "Second Copy of Registration Form",
    unit_cost: "15.00",
  },
  {
    id: 8,
    copies: 2,
    request_type: "document",
    requested_documents: "Transcript of Records (TOR)",
    unit_cost: "50.00 per Page",
  },
];

const TRANSFER_CREDENTIALS_NAME = "Certificate of Transfer Credentials";

const OdrCertTypes = ({
  selectedOffice,
  onDocumentSelect,
  selectedDocument,
  onCertTypeSelect,
  selectedCertType,
  onUnitCostSelect,
}) => {
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const certificationChecked =
    selectedDocument?.requested_documents === "Certification";

  const getTransferCredentialsType = () =>
    certificateTypes.find(
      (c) =>
        String(c.name || "").trim().toLowerCase() ===
        TRANSFER_CREDENTIALS_NAME.toLowerCase(),
    );

  useEffect(() => {
    const fetchCertificateTypes = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await requestService.getCertificateTypes();
        setCertificateTypes(data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to fetch certificate types",
        );
        console.error("Error fetching certificate types:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificateTypes();
  }, []);

  const handleCheckboxChange = (row) => {
    const isSelecting = selectedDocument?.id !== row.id;

    if (!isSelecting) {
      onDocumentSelect?.(null);
      onCertTypeSelect(null);
      onUnitCostSelect?.(null);
      return;
    }

    onDocumentSelect?.(row);
    onUnitCostSelect?.(row.unit_cost);

    if (row.requested_documents === TRANSFER_CREDENTIALS_NAME) {
      onCertTypeSelect(getTransferCredentialsType() || null);
      return;
    }

    if (row.requested_documents !== "Certification") {
      onCertTypeSelect(null);
    }
  };

  const columns = [
    {
      name: "",
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedDocument?.id === row.id}
          onChange={() => handleCheckboxChange(row)}
        />
      ),
      width: "64px",
      center: true,
    },
    {
      name: "COPIES",
      selector: (row) => row.copies,
      minWidth: "110px",
      center: true,
    },
    {
      name: "REQUESTED DOCUMENTS",
      selector: (row) => row.requested_documents,
      minWidth: "220px",
      cell: (row) => (
        <div className="py-2 text-center whitespace-normal break-words leading-snug">
          {row.requested_documents}
        </div>
      ),
      center: true,
    },
    {
      name: "UNIT COST (in Php)",
      selector: (row) => row.unit_cost,
      minWidth: "150px",
      cell: (row) => (
        <div className="py-2 text-center whitespace-normal break-words leading-snug">
          {row.unit_cost}
        </div>
      ),
      center: true,
    },
  ];

  const customStyles = {
    table: {
      style: {
        tableLayout: "fixed",
      },
    },
    headCells: {
      style: {
        backgroundColor: "#f3f4f6",
        borderRight: "1px solid #bcbfc4",
        borderTop: "1px solid #bcbfc4",
        borderBottom: "1px solid #bcbfc4",
        fontWeight: 600,
        fontSize: "0.875rem",
        minHeight: "36px",
        textTransform: "uppercase",
        "&:first-of-type": {
          borderLeft: "1px solid #bcbfc4",
        },
      },
    },
    cells: {
      style: {
        borderRight: "1px solid #bcbfc4",
        borderBottom: "1px solid #bcbfc4",
        fontSize: "0.875rem",
        "&:first-of-type": {
          borderLeft: "1px solid #bcbfc4",
        },
      },
    },
  };

  return (
    <div className="mt-3 w-full max-w-full px-0 sm:px-5">
      <div className="w-full overflow-x-auto rounded-md">
        <div className="min-w-[34rem]">
          <DataTable
            columns={columns}
            data={selectedOffice ? REQUEST_OPTIONS : []}
            customStyles={customStyles}
            dense
            responsive
            persistTableHead
            noDataComponent={<></>}
          />
        </div>
      </div>

      {certificationChecked && (
        <div className="mt-4 w-full">
          <p className="mb-2 text-sm font-medium sm:text-base">
            Type of Certification
          </p>
          {loading ? (
            <p className="text-gray-500 text-sm">
              Loading certificate types...
            </p>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : (
            <select
              name="certificationType"
              id="certificationType"
              value={selectedCertType?.id || ""}
              onChange={(e) => {
                const cert = certificateTypes.find(
                  (c) => c.id === Number.parseInt(e.target.value, 10),
                );
                onCertTypeSelect(cert || null);
              }}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              required
            >
              <option value="">Select a certificate type</option>
              {certificateTypes
                .filter(
                  (cert) =>
                    String(cert.name || "").trim().toLowerCase() !==
                    TRANSFER_CREDENTIALS_NAME.toLowerCase(),
                )
                .map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.name}
                  </option>
                ))}
            </select>
          )}
        </div>
      )}
      <p className="px-2 py-3 text-center text-xs text-gray-500 sm:px-4">
        * 2 pages is the minimum number of pages for TOR (Transcript of
        Records).
      </p>
    </div>
  );
};

export default OdrCertTypes;
