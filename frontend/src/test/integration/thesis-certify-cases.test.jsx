// @vitest-environment jsdom
import React, { forwardRef, useImperativeHandle } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OdrNewRequest from "../../pages/odr/odr_new_request";
import Tracker from "../../pages/certify/tracker";
import Ready from "../../pages/certify/ready";
import History from "../../pages/certify/history";
import Reports from "../../pages/certify/reports";
import Login from "../../pages/auth/Login";
import RequireRole from "../../components/common/RequireRole";
import requestService from "../../services/requestService";
import paymentService from "../../services/paymentService";
import settingsService from "../../services/settingsService";
import authService from "../../services/authService";
import reportService from "../../services/reportService";

vi.mock("../../services/requestService", () => ({
  default: {
    createRequest: vi.fn(),
    getPrograms: vi.fn(),
    getCourseOptionsForOdr: vi.fn(),
    getAllRequests: vi.fn(),
    getCertificateTypes: vi.fn(),
    updateStatus: vi.fn(),
    downloadCertificate: vi.fn(),
    sendReadyEmail: vi.fn(),
    markPrinted: vi.fn(),
  },
}));

vi.mock("../../services/paymentService", () => ({
  default: {
    getPaymentsByReferences: vi.fn(),
  },
}));

vi.mock("../../services/settingsService", () => ({
  default: {
    getWetSignature: vi.fn(),
  },
}));

vi.mock("../../services/authService", () => ({
  default: {
    login: vi.fn(),
  },
}));

vi.mock("../../services/reportService", () => ({
  default: {
    getSummary: vi.fn(),
    downloadSummary: vi.fn(),
  },
}));

vi.mock("../../components/common/requestModal", () => ({
  default: () => null,
}));

vi.mock("../../components/common/feedbackDialog", () => ({
  default: ({
    open,
    title,
    message,
    children,
    confirmLabel = "OK",
    cancelLabel = "",
    onConfirm,
    onClose,
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {message ? <p>{message}</p> : null}
        {children}
        {cancelLabel ? <button onClick={onClose}>{cancelLabel}</button> : null}
        <button onClick={onConfirm || onClose}>{confirmLabel}</button>
      </div>
    ) : null,
}));

vi.mock("../../pages/certify/analytics/chartSetup", () => ({
  Chart: class {
    destroy() {}
  },
}));

vi.mock("../../pages/certify/analytics/DonutChart", () => ({
  default: () => <div>Mock Donut Chart</div>,
}));

vi.mock("react-data-table-component", () => ({
  default: ({
    columns,
    data,
    progressPending,
    progressComponent,
    noDataComponent,
  }) => {
    if (progressPending) return <div>{progressComponent}</div>;
    if (!data?.length) return <div>{noDataComponent}</div>;

    return (
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.name}>{column.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id ?? row.reference_number}>
              {columns.map((column, index) => {
                const content = column.cell
                  ? column.cell(row)
                  : typeof column.selector === "function"
                    ? column.selector(row)
                    : row[column.selector];
                return <td key={`${column.name}-${index}`}>{content}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

vi.mock("../../components/common/odr_step_counter", () => ({
  default: () => <div>Step Counter</div>,
}));

vi.mock("../../components/tables/odr_cert_types", () => ({
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
            id: 9,
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
          onCertTypeSelect({ id: 101, name: "Certification" });
          onUnitCostSelect("30.00");
        }}
      >
        Select Certification
      </button>
    </div>
  ),
}));

vi.mock("../../pages/odr/odr_reqest_form", () => {
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
        courseDescriptionSelection: [],
        gradeSelection: [],
      }),
    }));

    return <div>Request Form</div>;
  });

  MockForm.displayName = "MockOdrRequestForm";
  return { default: MockForm };
});

vi.mock("../../components/common/odr_signature_pad", () => {
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

const makeRequest = (overrides = {}) => ({
  id: 1,
  status: "RELEASED",
  request_type: "certificate",
  reference_number: "REF-001",
  certificate_type_id: 101,
  certificate_type_name: "Certification",
  student_name: "Jane Student",
  requestor_name: "Jane Requestor",
  requestor_email: "jane@example.com",
  purpose: "Employment",
  program: "Bachelor of Science in Computer Science",
  created_at: new Date("2026-04-20T08:00:00Z").toISOString(),
  updated_at: new Date("2026-04-25T08:00:00Z").toISOString(),
  ready_email_sent_at: new Date("2026-04-24T08:00:00Z").toISOString(),
  ...overrides,
});

const makeReportSummary = () => ({
  descriptive: {
    requests_today: 2,
    total_requests: 24,
    pending: 4,
    processing: 6,
    released_total: 10,
    release_rate: 42,
    avg_processing_time_label: "2.5 days",
    sla_days: 2,
    pdf_generation_samples: 8,
    avg_pdf_generation_time_label: "320 ms",
    rejection_rate: 8,
    certificate_types: [{ name: "Certification", count: 10 }],
    programs: [{ name: "Bachelor of Science in Computer Science", count: 7 }],
    status_breakdown: {
      SUBMITTED: 1,
      APPROVED: 3,
      PROCESSING: 6,
      FOR_RELEASING: 4,
      RELEASED: 10,
    },
    daily_requests: [{ date: "2026-04-21", count: 5 }],
  },
  diagnostic: {
    aging_buckets: { under_3_days: 10, days_4_to_7: 8, over_7_days: 6 },
    bottleneck_by_status: { PROCESSING: 3, FOR_RELEASING: 2 },
    bottleneck_by_program: [
      {
        program: "Bachelor of Science in Computer Science",
        count: 3,
        avg_age_days: 5,
      },
    ],
    bottleneck_by_certificate: [
      {
        certificate_type: "Certification",
        count: 4,
        avg_age_days: 6,
      },
    ],
    stalled_requests: [
      {
        reference_number: "REF-STALL-1",
        student_name: "Delayed Student",
        status: "PROCESSING",
        age_days: 11,
      },
    ],
  },
  predictive: {
    methodology: { linear_trend_window_days: 7 },
    forecast_next_7_days: [
      {
        date: "2026-04-29",
        linear: 5,
        moving_avg: 4,
        exp_smoothing: 4,
        blended: 4,
      },
      {
        date: "2026-04-30",
        linear: 6,
        moving_avg: 5,
        exp_smoothing: 5,
        blended: 5,
      },
    ],
  },
});

const buildToken = (payload) => {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `header.${encoded}.signature`;
};

const renderWithRouter = (ui, initialEntries = ["/"]) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

const completeOdrSubmission = async (user) => {
  await user.click(screen.getByRole("button", { name: /next/i }));
  await user.selectOptions(screen.getByLabelText(/office/i), "pablo_borbon");
  await user.click(screen.getByRole("button", { name: /select diploma/i }));
  await user.click(screen.getByRole("button", { name: /^next$/i }));
  await user.click(screen.getByRole("button", { name: /add signature/i }));
  await user.click(screen.getByLabelText(/i hereby confirm/i));
  await user.click(screen.getByRole("button", { name: /submit/i }));
};

describe("Thesis CERTIFY functional and error-handling cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    requestService.getPrograms.mockResolvedValue([]);
    requestService.getAllRequests.mockResolvedValue([]);
    requestService.getCertificateTypes.mockResolvedValue([]);
    requestService.updateStatus.mockResolvedValue({});
    requestService.downloadCertificate.mockResolvedValue(new Blob(["pdf"]));
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });
    settingsService.getWetSignature.mockResolvedValue({
      use_wet_signature: false,
    });
    reportService.getSummary.mockResolvedValue(makeReportSummary());
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("EH-001 records a certificate request with complete student data", async () => {
    const user = userEvent.setup();
    requestService.createRequest.mockResolvedValue({
      reference_number: "26-0428-0001",
      pin: "1234",
      message: "Request submitted successfully!",
    });

    render(<OdrNewRequest />);
    await completeOdrSubmission(user);

    await waitFor(() => {
      expect(requestService.createRequest).toHaveBeenCalledTimes(1);
    });

    expect(requestService.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        request_type: "document",
        requested_document_name: "Diploma",
        certificate_type_id: null,
        student_name: "Jane Student",
      }),
    );
  });

  it("EH-002 flags incomplete request details before submission", async () => {
    const user = userEvent.setup();
    render(<OdrNewRequest />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    expect(
      await screen.findByText(/please select an office to continue/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/please select a document type to continue/i),
    ).toBeInTheDocument();
    expect(requestService.createRequest).not.toHaveBeenCalled();
  });

  it.fails(
    "EH-003 should block duplicate certificate requests from the same student",
    async () => {
      const user = userEvent.setup();
      requestService.createRequest.mockResolvedValue({
        reference_number: "26-0428-0002",
        pin: "2222",
        message: "Request submitted successfully!",
      });

      render(<OdrNewRequest />);
      await completeOdrSubmission(user);
      await completeOdrSubmission(user);

      await waitFor(() => {
        expect(requestService.createRequest).toHaveBeenCalledTimes(1);
      });
    },
  );

  it("EH-007 validates invalid request data and shows a specific error", async () => {
    const user = userEvent.setup();
    requestService.createRequest.mockRejectedValue({
      response: {
        status: 422,
        data: {
          detail: [
            {
              msg: "String should have at least 5 characters",
            },
          ],
        },
      },
    });

    render(<OdrNewRequest />);
    await completeOdrSubmission(user);

    expect(
      await screen.findByText(/string should have at least 5 characters/i),
    ).toBeInTheDocument();
  });

  it("EH-009 blocks unauthorized access to the registrar module", async () => {
    renderWithRouter(
      <Routes>
        <Route
          path="/tracker"
          element={
            <RequireRole roles={["registrar"]}>
              <div>Registrar Tracker</div>
            </RequireRole>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      ["/tracker"],
    );

    expect(await screen.findByText(/login page/i)).toBeInTheDocument();
    expect(screen.queryByText(/registrar tracker/i)).not.toBeInTheDocument();
  });

  it("EH-009 allows login with valid registrar credentials", async () => {
    const user = userEvent.setup();
    authService.login.mockResolvedValue({ access_token: "token" });

    renderWithRouter(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>,
      ["/login"],
    );

    await user.type(screen.getByPlaceholderText(/enter username/i), "registrar");
    await user.type(screen.getByPlaceholderText(/enter password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/dashboard page/i)).toBeInTheDocument();
  });

  it("EH-009 denies login with invalid registrar credentials", async () => {
    const user = userEvent.setup();
    authService.login.mockRejectedValue({
      response: { data: "Invalid username or password" },
    });

    renderWithRouter(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>,
      ["/login"],
    );

    await user.type(screen.getByPlaceholderText(/enter username/i), "registrar");
    await user.type(screen.getByPlaceholderText(/enter password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid username or password/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/dashboard page/i)).not.toBeInTheDocument();
  });

  it("EH-009 blocks registrar staff from cashier routes even via direct URL", async () => {
    localStorage.setItem(
      "access_token",
      buildToken({
        sub: "staff.user",
        role: "registrar_staff",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );

    renderWithRouter(
      <Routes>
        <Route
          path="/payment-tagging"
          element={
            <RequireRole roles={["superadmin", "registrar_head", "cashier"]}>
              <div>Cashier Payment Tagging</div>
            </RequireRole>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>,
      ["/payment-tagging"],
    );

    expect(await screen.findByText(/dashboard page/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/cashier payment tagging/i),
    ).not.toBeInTheDocument();
  });

  it("EH-009 blocks registrar staff from audit logs via direct URL", async () => {
    localStorage.setItem(
      "access_token",
      buildToken({
        sub: "staff.user",
        role: "registrar_staff",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );

    renderWithRouter(
      <Routes>
        <Route
          path="/settings/audit-logs"
          element={
            <RequireRole roles={["superadmin", "registrar_head"]}>
              <div>Audit Logs Page</div>
            </RequireRole>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>,
      ["/settings/audit-logs"],
    );

    expect(await screen.findByText(/dashboard page/i)).toBeInTheDocument();
    expect(screen.queryByText(/audit logs page/i)).not.toBeInTheDocument();
  });

  it("EH-009 blocks registrar staff from user management via direct URL", async () => {
    localStorage.setItem(
      "access_token",
      buildToken({
        sub: "staff.user",
        role: "registrar_staff",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );

    renderWithRouter(
      <Routes>
        <Route
          path="/admin/users"
          element={
            <RequireRole roles={["superadmin", "registrar_head"]}>
              <div>User Management Page</div>
            </RequireRole>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>,
      ["/admin/users"],
    );

    expect(await screen.findByText(/dashboard page/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/user management page/i),
    ).not.toBeInTheDocument();
  });

  it("EH-010 moves a processing request forward in the registrar workflow", async () => {
    const user = userEvent.setup();
    const processingRequest = makeRequest({
      id: 10,
      status: "PROCESSING",
      reference_number: "PROC-001",
    });

    requestService.getAllRequests.mockResolvedValue([processingRequest]);
    requestService.updateStatus.mockResolvedValue({
      ...processingRequest,
      status: "FOR_RELEASING",
    });

    render(<Tracker />);

    const action = await screen.findByTitle(/mark as for releasing/i);
    await user.click(action);

    await waitFor(() => {
      expect(requestService.updateStatus).toHaveBeenCalledWith(
        10,
        "FOR_RELEASING",
      );
    });
  });

  it("EH-011 does not show release action before registrar release prerequisites are met", async () => {
    const request = makeRequest({
      id: 11,
      status: "FOR_RELEASING",
      reference_number: "REL-LOCKED-001",
      ready_email_sent_at: null,
    });

    requestService.getAllRequests.mockResolvedValue([request]);

    render(<Ready />);

    expect(await screen.findByText(/rel-locked-001/i)).toBeInTheDocument();
    expect(screen.queryByTitle(/mark as released/i)).not.toBeInTheDocument();
  });

  it("EH-012 releases a certificate after registrar action", async () => {
    const user = userEvent.setup();
    const request = makeRequest({
      id: 12,
      status: "FOR_RELEASING",
      reference_number: "REL-READY-001",
    });

    requestService.getAllRequests.mockResolvedValue([request]);
    requestService.updateStatus.mockResolvedValue({
      ...request,
      status: "RELEASED",
    });

    render(<Ready />);

    const action = await screen.findByTitle(/mark as released/i);
    await user.click(action);

    await waitFor(() => {
      expect(requestService.updateStatus).toHaveBeenCalledWith(12, "RELEASED");
    });
  });

  it("EH-011 restricts certificate visibility in history to released requests only", async () => {
    requestService.getAllRequests.mockResolvedValue([
      makeRequest({ id: 13, reference_number: "REL-001", status: "RELEASED" }),
      makeRequest({
        id: 14,
        reference_number: "PROC-002",
        status: "PROCESSING",
        ready_email_sent_at: null,
      }),
    ]);
    paymentService.getPaymentsByReferences.mockResolvedValue({
      items: [{ reference_number: "REL-001", or_number: "OR-12345" }],
    });

    render(<History />);

    expect(await screen.findByText(/rel-001/i)).toBeInTheDocument();
    expect(screen.queryByText(/proc-002/i)).not.toBeInTheDocument();
  });

  it("EH-013 displays historical records of processed certificates", async () => {
    requestService.getAllRequests.mockResolvedValue([
      makeRequest({ id: 15, reference_number: "HIST-001" }),
    ]);
    paymentService.getPaymentsByReferences.mockResolvedValue({
      items: [{ reference_number: "HIST-001", or_number: "OR-67890" }],
    });

    render(<History />);

    expect(await screen.findByText(/hist-001/i)).toBeInTheDocument();
    expect(screen.getByText(/or-67890/i)).toBeInTheDocument();
    expect(screen.getByText(/jane student/i)).toBeInTheDocument();
  });

  it("EH-008 shows an error when certificate retrieval times out during preview", async () => {
    const user = userEvent.setup();
    requestService.getAllRequests.mockResolvedValue([
      makeRequest({ id: 16, reference_number: "TIMEOUT-001" }),
    ]);
    paymentService.getPaymentsByReferences.mockResolvedValue({
      items: [{ reference_number: "TIMEOUT-001", or_number: "OR-77777" }],
    });
    requestService.downloadCertificate.mockRejectedValue(
      new Error("timeout exceeded"),
    );

    render(<History />);

    const previewButton = await screen.findByTitle(/preview certificate/i);
    await user.click(previewButton);

    expect(await screen.findByText(/preview failed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/failed to load certificate preview/i),
    ).toBeInTheDocument();
  });

  it("EH-014 loads the reports dashboard with stored certificate analytics", async () => {
    renderWithRouter(
      <Routes>
        <Route path="/reports" element={<Reports />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>,
      ["/reports"],
    );

    expect(await screen.findByText(/^total requests$/i)).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getAllByText(/^released$/i).length).toBeGreaterThan(0);
  });

  it.fails(
    "EH-014 should provide a quarterly consolidated report option",
    async () => {
      renderWithRouter(
        <Routes>
          <Route path="/reports" element={<Reports />} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>,
        ["/reports"],
      );

      await screen.findByText(/total requests/i);
      expect(
        screen.getByRole("option", { name: /quarter/i }),
      ).toBeInTheDocument();
    },
  );
});
