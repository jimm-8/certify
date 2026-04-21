import React, { forwardRef, useImperativeHandle } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import OdrNewRequest from "../odr_new_request";
import requestService from "../../../services/requestService";

vi.mock("../../../services/requestService", () => ({
  default: {
    createRequest: vi.fn(),
    getPrograms: vi.fn(),
  },
}));

vi.mock("../../../components/common/odr_step_counter", () => ({
  default: () => <div>Step Counter</div>,
}));

vi.mock("../../../components/tables/odr_cert_types", () => ({
  default: ({
    onDocumentSelect,
    onCertTypeSelect,
    onUnitCostSelect,
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          onDocumentSelect({
            id: 4,
            request_type: "document",
            requested_documents: "Diploma",
            unit_cost: "400.00",
          });
          onCertTypeSelect(null);
          onUnitCostSelect("400.00");
        }}
      >
        Select Diploma
      </button>
      <button
        type="button"
        onClick={() => {
          onDocumentSelect({
            id: 3,
            request_type: "certificate",
            requested_documents: "Certification",
            unit_cost: "30.00",
          });
          onUnitCostSelect("30.00");
        }}
      >
        Select Certification
      </button>
    </div>
  ),
}));

vi.mock("../odr_reqest_form", () => {
  const MockForm = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
      getFormData: () => ({
        name: "Jane Requestor",
        currentAddress: "Batangas City",
        relationshipToStudent: "Self",
        contactNumber: "09171234567",
        emailAddress: "jane@example.com",
        purposeOfRequest: "Employment",
        srcCode: "22-00001",
        fullname: "Jane Student",
        program: "BSCS",
        major: "",
        yearGraduated: "2025",
      }),
    }));

    return <div>Request Form</div>;
  });

  MockForm.displayName = "MockOdrRequestForm";

  return { default: MockForm };
});

vi.mock("../../../components/common/odr_signature_pad", () => {
  const MockSignaturePad = forwardRef(({ onSignatureChange }, ref) => {
    useImperativeHandle(ref, () => ({
      clear: vi.fn(),
    }));

    return (
      <button
        type="button"
        onClick={() => onSignatureChange("data:image/png;base64,ZmFrZQ==")}
      >
        Add Signature
      </button>
    );
  });

  MockSignaturePad.displayName = "MockSignaturePad";

  return { default: MockSignaturePad };
});

describe("OdrNewRequest", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits a non-certificate document request without certificate_type_id", async () => {
    const user = userEvent.setup();
    requestService.getPrograms.mockResolvedValue([]);
    requestService.createRequest.mockResolvedValue({
      reference_number: "26-0420-00001",
      pin: "1234",
      message: "Document request submitted successfully!",
      submitted_date: new Date().toISOString(),
    });

    render(<OdrNewRequest />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.selectOptions(screen.getByLabelText(/office/i), "pablo_borbon");
    await user.click(screen.getByRole("button", { name: /select diploma/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.click(screen.getByRole("button", { name: /add signature/i }));
    await user.click(screen.getByLabelText(/i hereby confirm/i));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(requestService.createRequest).toHaveBeenCalledTimes(1);
    });

    expect(requestService.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        request_type: "document",
        requested_document_name: "Diploma",
        certificate_type_id: null,
      }),
    );
  });
});
