const normalizeRequestKind = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

const CERTIFICATE_REQUEST_KINDS = new Set([
  "certificate",
  "certificate request",
]);

export const isCertifyEligibleRequest = (request) => {
  if (!request || typeof request !== "object") return false;

  const explicitKind = [
    request.request_type,
    request.requestType,
    request.document_type,
    request.documentType,
    request.request_category,
    request.requestCategory,
    request.category,
    request.type,
  ]
    .map(normalizeRequestKind)
    .find(Boolean);

  if (explicitKind) {
    return CERTIFICATE_REQUEST_KINDS.has(explicitKind);
  }

  return Boolean(request.certificate_type_id || request.certificate_type_name);
};

export const filterCertifyEligibleRequests = (requests) =>
  (Array.isArray(requests) ? requests : []).filter(isCertifyEligibleRequest);
