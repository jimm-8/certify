// @vitest-environment jsdom
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import OdrRequestForm from "../odr_reqest_form";

vi.mock("../../../services/requestService", () => ({
  default: {
    getCourseOptionsForOdr: vi.fn(),
  },
}));

describe("OdrRequestForm", () => {
  it("captures a free-text purpose entry", async () => {
    const user = userEvent.setup();
    const ref = createRef();

    render(
      <OdrRequestForm
        ref={ref}
        programs={[{ name: "BSCS", major: "" }]}
        selectedOffice="pablo_borbon"
      />
    );

    const purposeField = screen.getByLabelText(/purpose\/s of request/i);
    expect(purposeField.tagName).toBe("TEXTAREA");

    await user.type(
      purposeField,
      "For transfer requirements, include only Gen Ed subjects."
    );

    expect(ref.current.getFormData).toBeDefined();
    expect(purposeField).toHaveValue(
      "For transfer requirements, include only Gen Ed subjects."
    );
  });

  it("shows an error for a future graduation year", async () => {
    const user = userEvent.setup();
    const currentYear = new Date().getFullYear();

    render(
      <OdrRequestForm
        programs={[{ name: "BSCS", major: "" }]}
        selectedOffice="pablo_borbon"
      />
    );

    const yearField = screen.getByLabelText(/year graduated/i);
    await user.type(yearField, String(currentYear + 1));
    await user.tab();

    expect(
      screen.getByText(`Year graduated cannot be later than ${currentYear}.`)
    ).toBeInTheDocument();
  });
});
