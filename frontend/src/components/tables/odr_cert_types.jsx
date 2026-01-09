import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import requestService from "../../services/requestService";

const OdrCertTypes = ({
  selectedOffice,
  onCertTypeSelect,
  selectedCertType,
}) => {
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCerts, setSelectedCerts] = useState({});
  const [certificationChecked, setCertificationChecked] = useState(false);

  useEffect(() => {
    const fetchCertificateTypes = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await requestService.getCertificateTypes();
        setCertificateTypes(data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to fetch certificate types"
        );
        console.error("Error fetching certificate types:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificateTypes();
  }, []);

  const handleCheckboxChange = (certId, documentName) => {
    const newChecked = !selectedCerts[certId];

    setSelectedCerts((prev) => ({
      ...prev,
      [certId]: !prev[certId],
    }));

    // Check if "Certification" was clicked
    if (documentName === "Certification") {
      setCertificationChecked((prev) => !prev);
      if (!newChecked) {
        onCertTypeSelect(null);
      }
    }
  };

  const data = [
    {
      id: 1,
      copies: 1,
      requested_documents: "Authentication",
      unit_cost: "20.00 per Page",
    },
    {
      id: 2,
      copies: 1,
      requested_documents: "Certificate of Transfer Credentials",
      unit_cost: "100.00",
    },
    {
      id: 3,
      copies: 1,
      requested_documents: "Certification",
      unit_cost: "30.00",
    },
    {
      id: 4,
      copies: 1,
      requested_documents: "Diploma",
      unit_cost: "400.00",
    },
    {
      id: 5,
      copies: 1,
      requested_documents: "Form 137",
      unit_cost: "100.00",
    },
    {
      id: 6,
      copies: 1,
      requested_documents: "Graduation Fee",
      unit_cost: "1, 000.00",
    },
    {
      id: 7,
      copies: 1,
      requested_documents: "Second Copy of Registration Form",
      unit_cost: "15.00",
    },
    {
      id: 8,
      copies: 2,
      requested_documents: "Transcript of Records (TOR)",
      unit_cost: "50.00 per Page",
    },
  ];

  const columns = [
    {
      name: "",
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedCerts[row.id] || false}
          onChange={() => handleCheckboxChange(row.id, row.requested_documents)}
        />
      ),
      width: "80px",
      center: true,
    },
    {
      name: "COPIES",
      selector: (row) => row.copies,
      width: "200px",
      center: true,
    },
    {
      name: "REQUESTED DOCUMENTS",
      selector: (row) => row.requested_documents,
      width: "350px",
      center: true,
    },
    {
      name: "UNIT COST (in Php)",
      selector: (row) => row.unit_cost,
      width: "220px",
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
    <div className="ml-5 inline-block mt-3">
      <DataTable
        columns={columns}
        data={selectedOffice ? data : []}
        customStyles={customStyles}
        dense
        persistTableHead
        noDataComponent={<></>}
      />

      {certificationChecked && (
        <div className="mt-4 w-full">
          <p className="mb-2">Type of Certification</p>
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
                console.log("Selected cert type ID:", e.target.value); // ✅ Debug log
                const cert = certificateTypes.find(
                  (c) => c.id === parseInt(e.target.value)
                );
                console.log("Found cert object:", cert); // ✅ Debug log
                onCertTypeSelect(cert);
              }}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              required // ✅ Add required attribute
            >
              <option value="">Select a certificate type</option>
              {certificateTypes.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <p className="text-center text-gray-500 text-xs py-3 px-4">
        * 2 pages is the minimum number of pages for TOR (Transcript of
        Records).
      </p>
    </div>
  );
};

export default OdrCertTypes;
