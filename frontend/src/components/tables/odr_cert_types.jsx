import React from "react";
import DataTable from "react-data-table-component";

const columns = [
  {
    name: "",
    cell: () => <input type="checkbox" />,
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

const data = [
  {
    copies: 2,
    requested_documents: "Birth Certificate",
    unit_cost: "₱150.00",
  },
  {
    copies: 1,
    requested_documents: "Marriage Certificate",
    unit_cost: "₱200.00",
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

const OdrCertTypes = ({ selectedOffice }) => {
  return (
    <div className="ml-5 inline-block mt-3">
      <DataTable
        columns={columns}
        data={selectedOffice ? data : []}
        customStyles={customStyles}
        dense
        persistTableHead
        noDataComponent={
          <p className="text-center text-gray-500 text-xs py-3 px-4">
            * 2 pages is the minimum number of pages for TOR (Transcript of
            Records).
          </p>
        }
      />
    </div>
  );
};

export default OdrCertTypes;
