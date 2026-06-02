const FIELD_LABELS = {
  status: "Status",
  request_cost: "Request Cost",
  student_name: "Student Name",
  sr_code: "SR code",
  program: "Program",
  major: "Major",
  year_graduated: "Year Graduated",
  course_description_selection: "Course Description Selection",
  grade_selection: "Grade Selection",
  auto_printed_at: "Print Status",
  payment_status: "Payment Status",
  notes: "Notes",
  pdf_path: "PDF Path",
};

const toTitleCase = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getAuditLogTarget = (log) => {
  if (log?.request_reference) {
    const details = [log.request_reference];
    if (log.student_name) details.push(log.student_name);
    return details.join(" / ");
  }
  if (log?.request_label && log?.student_name) {
    return `${log.request_label} / ${log.student_name}`;
  }
  if (log?.entity_type === "certificate_request" && log?.entity_id) {
    return `Request #${log.entity_id}`;
  }
  if (log?.entity_type) {
    return toTitleCase(log.entity_type);
  }
  return "System";
};

export const formatAuditLogAction = (log) => {
  const action = String(log?.action || "").toUpperCase();

  if (action === "AUTH_LOGIN") return "Signed In";
  if (action === "AUTH_PASSWORD_CHANGE") return "Changed Password";
  if (action === "REQUEST_APPROVED") return "Approved Request";
  if (action === "REQUEST_PROCESSED") return "Started Request Processing";
  if (action === "REQUEST_READY_FOR_RELEASE") return "Marked Ready for Release";
  if (action === "REQUEST_RELEASED") return "Released Request";
  if (action === "REQUEST_REJECTED") return "Rejected Request";
  if (action === "REQUEST_MARKED_PENDING") return "Marked Request Pending";
  if (action === "PAYMENT_RECORDED") return "Recorded Payment";
  if (action === "READY_EMAIL_SENT") return "Sent Ready Email";
  if (action === "REJECTION_EMAIL_SENT") return "Sent Rejection Email";
  if (action === "CERTIFICATE_DOWNLOADED") return "Downloaded Certificate";
  if (action === "TEMPLATE_EDITED") {
    return "Edited Template";
  }
  if (action === "REPORT_EXPORTED") return "Exported Report";
  if (action === "REQUEST_REVIEW_REQUIRED") return "Marked for Manual Review";
  if (action === "REQUEST_PRINTED") return "Printed Certificate";
  if (action === "NOTE_ADDED") return "Added Note";
  if (action === "COURSE_DESCRIPTION_SELECTION_UPDATED") {
    return "Updated Course Description Selection";
  }
  if (action === "GRADE_SELECTION_UPDATED") {
    return "Updated Grade Selection";
  }
  if (action === "STATUS_CHANGED") return "Changed Status";
  if (action === "DATA_UPDATED") {
    const field = FIELD_LABELS[log?.field_name] || toTitleCase(log?.field_name || "Details");
    return `Updated ${field}`;
  }
  if (action.startsWith("API_")) {
    const method = action.replace("API_", "");
    if (method === "POST") return "Created Record";
    if (method === "PATCH" || method === "PUT") return "Updated Record";
    if (method === "DELETE") return "Deleted Record";
    return `Used ${method} Endpoint`;
  }

  return toTitleCase(action);
};

export const formatAuditLogEntity = (log) => getAuditLogTarget(log);

export const formatAuditLogNotes = (log) => {
  const action = String(log?.action || "").toUpperCase();
  const target = getAuditLogTarget(log);
  const field = FIELD_LABELS[log?.field_name] || toTitleCase(log?.field_name || "Details");

  if (action === "REQUEST_APPROVED") {
    return `Request for ${target} was approved.`;
  }
  if (action === "REQUEST_PROCESSED") {
    return `Request for ${target} moved to processing.`;
  }
  if (action === "REQUEST_READY_FOR_RELEASE") {
    return `Request for ${target} was marked ready for release.`;
  }
  if (action === "REQUEST_RELEASED") {
    return `Request for ${target} was released.`;
  }
  if (action === "REQUEST_REJECTED") {
    return `Request for ${target} was rejected.`;
  }
  if (action === "REQUEST_MARKED_PENDING") {
    return `Request for ${target} was marked pending.`;
  }
  if (action === "PAYMENT_RECORDED") {
    return `Payment was recorded for ${target}.`;
  }
  if (action === "READY_EMAIL_SENT") {
    return `Ready email was sent for ${target}.`;
  }
  if (action === "REJECTION_EMAIL_SENT") {
    return `Rejection email was sent for ${target}.`;
  }
  if (action === "CERTIFICATE_DOWNLOADED") {
    return `Certificate for ${target} was downloaded.`;
  }
  if (action === "CERTIFICATE_GENERATED") {
    return `Certificate PDF was generated for ${target}.`;
  }
  if (action === "REQUEST_REVIEW_REQUIRED") {
    return `Request for ${target} was flagged for manual review.`;
  }
  if (action === "REQUEST_PRINTED") {
    return `Certificate for ${target} was marked as printed.`;
  }
  if (action === "NOTE_ADDED") {
    return log?.new_value || log?.notes || `A note was added for ${target}.`;
  }
  if (action === "COURSE_DESCRIPTION_SELECTION_UPDATED") {
    return `Course description selection was updated for ${target}.`;
  }
  if (action === "GRADE_SELECTION_UPDATED") {
    return `Grade selection was updated for ${target}.`;
  }
  if (action === "STATUS_CHANGED") {
    if (log?.old_value && log?.new_value) {
      return `${field} changed from ${toTitleCase(log.old_value)} to ${toTitleCase(log.new_value)} for ${target}.`;
    }
    if (log?.new_value) {
      return `${field} changed to ${toTitleCase(log.new_value)} for ${target}.`;
    }
  }
  if (action === "DATA_UPDATED") {
    if (log?.old_value || log?.new_value) {
      return `${field} changed from ${log.old_value || "-"} to ${log.new_value || "-"} for ${target}.`;
    }
    return `${field} was updated for ${target}.`;
  }

  return log?.notes || "-";
};

export const formatAuditLogChange = (log) => {
  if (log?.field_name === "status" && (log?.old_value || log?.new_value)) {
    return `${log.old_value || "-"} -> ${log.new_value || "-"}`;
  }
  if (log?.old_value || log?.new_value) {
    return `${log.old_value || "-"} -> ${log.new_value || "-"}`;
  }
  return "-";
};

export const formatAuditLogField = (log) =>
  FIELD_LABELS[log?.field_name] || (log?.field_name ? toTitleCase(log.field_name) : "-");
