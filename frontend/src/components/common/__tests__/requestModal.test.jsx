// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RequestModal from "../requestModal";
import requestService from "../../../services/requestService";

vi.mock("../../../services/requestService", () => ({
  default: {
    getRequestNotes: vi.fn(),
  },
}));

describe("RequestModal", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders null when no request", () => {
    const { container } = render(<RequestModal request={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("adds suggested decline note from validation flags", async () => {
    const user = userEvent.setup();
    const request = {
      id: 1,
      status: "PENDING",
      certificate_type_name: "Certification",
      requestor_email: "student@example.com",
    };

    render(
      <RequestModal
        request={request}
        onClose={() => {}}
        onRejectAndSend={() => {}}
        validationFlags={["Missing SR code"]}
      />
    );

    await user.click(screen.getByRole("button", { name: /reject|decline/i }));
    const suggested = await screen.findByRole("button", {
      name: /SR code is missing/i,
    });
    await user.click(suggested);

    const textarea = screen.getByPlaceholderText(/reason for rejecting/i);
    expect(textarea).toHaveValue(
      "SR code is missing. Please provide a valid SR code."
    );
  });

  it("suggests verifying latin honor for honor graduate validation flags", async () => {
    const user = userEvent.setup();
    const request = {
      id: 2,
      status: "PENDING",
      certificate_type_name: "Certification of Honor Graduate",
      requestor_email: "student@example.com",
    };

    render(
      <RequestModal
        request={request}
        onClose={() => {}}
        onRejectAndSend={() => {}}
        validationFlags={[
          "No latin honor record found for this student for the requested honor graduate certificate.",
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: /reject|decline/i }));
    const suggested = await screen.findByRole("button", {
      name: /no latin honor record was found/i,
    });
    await user.click(suggested);

    const textarea = screen.getByPlaceholderText(/reason for rejecting/i);
    expect(textarea).toHaveValue(
      "No latin honor record was found. Request cannot be processed as an honor graduate certificate until the latin honor is verified."
    );
  });

  it("suggests graduation verification for cav validation flags", async () => {
    const user = userEvent.setup();
    const request = {
      id: 3,
      status: "PENDING",
      certificate_type_name:
        "Certification Authentication and Verification (CAV)",
      requestor_email: "student@example.com",
    };

    render(
      <RequestModal
        request={request}
        onClose={() => {}}
        onRejectAndSend={() => {}}
        validationFlags={[
          "Student is not yet graduated for the requested CAV certificate.",
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: /reject|decline/i }));
    const suggested = await screen.findByRole("button", {
      name: /student is not yet graduated\. request cannot be processed until graduation is confirmed/i,
    });
    await user.click(suggested);

    const textarea = screen.getByPlaceholderText(/reason for rejecting/i);
    expect(textarea).toHaveValue(
      "Student is not yet graduated. Request cannot be processed until graduation is confirmed."
    );
  });

  it("approves a course description request without prompting for course selection", async () => {
    const user = userEvent.setup();
    const request = {
      id: 22,
      status: "PENDING",
      certificate_type_name: "Course Description",
      requestor_email: "student@example.com",
    };
    const onApprove = vi.fn();

    render(
      <RequestModal
        request={request}
        onClose={() => {}}
        onApprove={onApprove}
        validationFlags={[]}
      />
    );

    expect(
      screen.queryByText(/course description selection/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith(request);
    });
  });

  it("sends rejection email for rejected request", async () => {
    const user = userEvent.setup();
    const request = {
      id: 5,
      status: "REJECTED",
      certificate_type_name: "Certification",
      requestor_email: "student@example.com",
    };

    requestService.getRequestNotes.mockResolvedValue([
      { note: "Fix student record" },
    ]);

    const onSendRejectionEmail = vi.fn();

    render(
      <RequestModal
        request={request}
        onClose={() => {}}
        onSendRejectionEmail={onSendRejectionEmail}
      />
    );

    const button = await screen.findByRole("button", {
      name: /send rejection email/i,
    });

    await user.click(button);

    await waitFor(() => {
      expect(onSendRejectionEmail).toHaveBeenCalledWith(
        request,
        "Fix student record"
      );
    });
  });
});
