import {
  filterCertifyEligibleRequests,
  isCertifyEligibleRequest,
} from "../certifyRequestGuard";

describe("certifyRequestGuard", () => {
  it("accepts explicit certificate request types", () => {
    expect(
      isCertifyEligibleRequest({
        id: 1,
        request_type: "certificate",
      }),
    ).toBe(true);

    expect(
      isCertifyEligibleRequest({
        id: 2,
        document_type: "certificate_request",
      }),
    ).toBe(true);
  });

  it("blocks non-certificate request types even when status is valid", () => {
    expect(
      isCertifyEligibleRequest({
        id: 3,
        request_type: "authentication",
        certificate_type_name: "Authentication",
      }),
    ).toBe(false);
  });

  it("falls back to certificate fields for existing certify records", () => {
    expect(
      isCertifyEligibleRequest({
        id: 4,
        certificate_type_name: "Certification",
      }),
    ).toBe(true);
  });

  it("filters mixed request collections", () => {
    expect(
      filterCertifyEligibleRequests([
        { id: 1, request_type: "certificate" },
        { id: 2, request_type: "good moral" },
        { id: 3, certificate_type_name: "Certification" },
      ]),
    ).toEqual([
      { id: 1, request_type: "certificate" },
      { id: 3, certificate_type_name: "Certification" },
    ]);
  });
});
