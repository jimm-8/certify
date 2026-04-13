import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import RequestModal from "../requestModal";
import requestService from "../../../services/requestService";

vi.mock("../../../services/requestService", () => ({
  default: {
    getRequestNotes: vi.fn(),
    getRequestTakenCourses: vi.fn(),
    updateCourseDescriptionSelection: vi.fn(),
    updateGradeSelection: vi.fn(),
  },
}));

describe("RequestModal", () => {
  afterEach(() => {
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

  it("requires course selection before approving course description", async () => {
    const user = userEvent.setup();
    const request = {
      id: 22,
      status: "PENDING",
      certificate_type_name: "Course Description",
      requestor_email: "student@example.com",
    };

    requestService.getRequestTakenCourses.mockResolvedValue([
      {
        course_code: "CS101",
        course_title: "Intro",
        units: 3,
        grade: "1.5",
      },
    ]);
    requestService.updateCourseDescriptionSelection.mockResolvedValue({});

    const onApprove = vi.fn();

    render(
      <RequestModal
        request={request}
        onClose={() => {}}
        onApprove={onApprove}
        validationFlags={[]}
      />
    );

    const approve = await screen.findByRole("button", { name: /approve/i });
    expect(approve).toBeDisabled();

    const checkbox = await screen.findByRole("checkbox");
    await user.click(checkbox);

    expect(approve).toBeEnabled();
    await user.click(approve);

    await waitFor(() => {
      expect(requestService.updateCourseDescriptionSelection).toHaveBeenCalled();
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
