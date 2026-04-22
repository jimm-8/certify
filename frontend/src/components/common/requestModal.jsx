import React, { useEffect, useRef, useState } from "react";
import requestService from "../../services/requestService";
import {
  BsX,
  BsCheckCircle,
  BsXCircle,
  BsPersonFill,
  BsFileEarmarkText,
  BsCalendar3,
  BsTag,
  BsBookFill,
  BsClock,
  BsHash,
  BsExclamationTriangleFill,
  BsCheckCircleFill,
} from "react-icons/bs";

const statusConfig = {
  PENDING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    ring: "ring-yellow-200",
  },
  APPROVED: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  PROCESSING: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  FOR_RELEASING: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    ring: "ring-purple-200",
  },
  RELEASED: { bg: "bg-gray-100", text: "text-gray-600", ring: "ring-gray-200" },
  REJECTED: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200" },
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-400">
      <Icon size={13} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
        {label}
      </p>
      <p className="text-sm text-gray-800 font-medium break-words">
        {value || "—"}
      </p>
    </div>
  </div>
);

const RequestModal = ({
  request,
  onClose,
  onApprove,
  onRejectAndSend,
  loading = false,
  readOnly = false,
  validationFlags = [],
  onSendRejectionEmail,
  rejectionEmailLoading = false,
}) => {
  const overlayRef = useRef(null);
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineNotes, setDeclineNotes] = useState("");
  const [notes, setNotes] = useState([]);
  const [rejectionEmailNotes, setRejectionEmailNotes] = useState("");
  const [courseOptions, setCourseOptions] = useState([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourseCodes, setSelectedCourseCodes] = useState([]);
  const [savingSelection, setSavingSelection] = useState(false);
  const [selectionTouched, setSelectionTouched] = useState(false);
  const [courseYearFilter, setCourseYearFilter] = useState("");
  const [courseSemesterFilter, setCourseSemesterFilter] = useState("");
  const [gradeSearch, setGradeSearch] = useState("");
  const [selectedGradeKeys, setSelectedGradeKeys] = useState([]);
  const [gradeSelectionTouched, setGradeSelectionTouched] = useState(false);
  const [savingGradesSelection, setSavingGradesSelection] = useState(false);
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const isCourseDescription = (request?.certificate_type_name || "")
    .toLowerCase()
    .includes("course description");
  const isCertificationOfGrades = (request?.certificate_type_name || "")
    .toLowerCase()
    .includes("grades");

  useEffect(() => {
    if (!request) return;
    const handler = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [request, onClose]);

  useEffect(() => {
    if (!request) {
      setShowDeclineInput(false);
      setDeclineNotes("");
      setNotes([]);
      setRejectionEmailNotes("");
      setCourseOptions([]);
      setCourseError("");
      setCourseSearch("");
      setSelectedCourseCodes([]);
      setSelectionTouched(false);
      setCourseYearFilter("");
      setCourseSemesterFilter("");
      setGradeSearch("");
      setSelectedGradeKeys([]);
      setGradeSelectionTouched(false);
      setYearFilter("");
      setSemesterFilter("");
      return;
    }
    if (request.status === "REJECTED") {
      setShowDeclineInput(false);
      requestService
        .getRequestNotes(request.id)
        .then(setNotes)
        .catch(() => setNotes([]));
    }
  }, [request]);

  useEffect(() => {
    if (!request) return;
    if (request.status !== "REJECTED") return;
    const latest = notes.length ? notes[0]?.note : "";
    setRejectionEmailNotes(latest || "");
  }, [request, notes]);

  useEffect(() => {
    if (!request || (!isCourseDescription && !isCertificationOfGrades)) return;

    const parseSelection = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    };

    if (isCourseDescription) {
      setSelectedCourseCodes(
        parseSelection(request.course_description_selection),
      );
      setSelectionTouched(false);
    }
    if (isCertificationOfGrades) {
      setSelectedGradeKeys(parseSelection(request.grade_selection));
      setGradeSelectionTouched(false);
    }
    setCourseError("");
    setCourseLoading(true);
    requestService
      .getRequestTakenCourses(request.id)
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setCourseOptions(items);
      })
      .catch((err) => {
        const detail =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Failed to load courses.";
        setCourseError(detail);
      })
      .finally(() => setCourseLoading(false));
  }, [request, isCourseDescription, isCertificationOfGrades]);

  const handleDeclineClick = () => {
    if (!showDeclineInput) {
      setShowDeclineInput(true);
      return;
    }
    setShowDeclineInput(false);
  };

  /* lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = request ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [request]);

  useEffect(() => {
    if (readOnly || !isCertificationOfGrades || !request) return;
    const query = gradeSearch.trim().toLowerCase();
    const buildKey = (row) =>
      `${row.course_code || ""}||${row.academic_year || ""}||${row.semester || ""}`;
    const keys = courseOptions
      .filter((row) => {
        if (query) {
          const haystack = [
            row.course_code,
            row.course_title,
            row.grade,
            row.units,
            row.academic_year,
            row.semester,
            row.year_level,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (yearFilter && String(row.year_level) !== String(yearFilter)) {
          return false;
        }
        if (semesterFilter && String(row.semester) !== String(semesterFilter)) {
          return false;
        }
        return true;
      })
      .map((row) => buildKey(row));
    setSelectedGradeKeys(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter, semesterFilter]);

  useEffect(() => {
    if (readOnly || !isCourseDescription || !request) return;
    const codes = courseDescriptionOptions
      .filter((row) => {
        if (
          courseYearFilter &&
          String(row.year_level) !== String(courseYearFilter)
        ) {
          return false;
        }
        if (
          courseSemesterFilter &&
          String(row.semester) !== String(courseSemesterFilter)
        ) {
          return false;
        }
        return true;
      })
      .map((row) => row.course_code);
    setSelectedCourseCodes(codes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseYearFilter, courseSemesterFilter]);

  if (!request) return null;

  const status = request.status?.toUpperCase() ?? "PENDING";
  const sc = statusConfig[status] ?? statusConfig.PENDING;
  const canAct =
    status === "PENDING" || status === "PROCESSING" || status === "APPROVED";
  const isRejected = status === "REJECTED";
  const normalizedValidation = Array.isArray(validationFlags)
    ? validationFlags
    : [];
  const hasValidationFlags = normalizedValidation.length > 0;

  const buildSuggestedNotes = (flags) => {
    const suggestions = [];
    const pushUnique = (text) => {
      if (!text) return;
      if (!suggestions.includes(text)) suggestions.push(text);
    };

    flags.forEach((flag) => {
      const lower = String(flag).toLowerCase();
      if (lower.includes("invalid input detected in")) {
        const label = String(flag)
          .replace(/invalid input detected in\s*/i, "")
          .replace(/\.$/, "")
          .trim()
          .toLowerCase();
        const pretty = label.length > 0 ? label : "the provided fields";
        pushUnique(
          `Please provide valid ${pretty} (avoid random characters or unsafe symbols).`,
        );
        return;
      }
      if (lower.includes("missing sr code")) {
        pushUnique("SR code is missing. Please provide a valid SR code.");
        return;
      }
      if (lower.includes("student record not found")) {
        pushUnique(
          "Student record not found in the registry. Please verify the SR code and student details.",
        );
        return;
      }
      if (lower.includes("student name does not match")) {
        pushUnique(
          "Student name does not match the registry. Please correct the student name.",
        );
        return;
      }
      if (lower.includes("program does not match")) {
        pushUnique(
          "Program does not match the registry. Please correct the program information.",
        );
        return;
      }
      if (lower.includes("campus could not be verified")) {
        pushUnique(
          "Campus could not be verified. Please confirm the campus details.",
        );
        return;
      }
      if (lower.includes("year graduated must be a 4-digit year")) {
        pushUnique(
          "Year graduated must be a 4-digit year (e.g., 2024). Please correct it.",
        );
        return;
      }
      if (lower.includes("graduation year is 2022 or below")) {
        pushUnique(
          "Graduation year is 2022 or below. Please verify the graduation year.",
        );
        return;
      }
      if (lower.includes("student is not yet graduated")) {
        pushUnique(
          "Student is not yet graduated. Request cannot be processed until graduation is confirmed.",
        );
        return;
      }
    });

    if (!suggestions.length && flags.length) {
      pushUnique(
        "Please review the flagged details and resubmit with corrected information.",
      );
    }
    return suggestions;
  };

  const suggestedNotes = buildSuggestedNotes(normalizedValidation);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const selectionRequired = isCourseDescription && !readOnly;
  const gradesSelectionRequired = isCertificationOfGrades && !readOnly;
  const hasSelection = selectedCourseCodes.length > 0;
  const hasGradesSelection = selectedGradeKeys.length > 0;

  const courseDescriptionOptions = courseOptions.filter((row, idx, arr) => {
    const code = row?.course_code;
    if (!code) return false;
    return arr.findIndex((r) => r?.course_code === code) === idx;
  });

  const filteredCourses = courseDescriptionOptions.filter((row) => {
    const query = courseSearch.trim().toLowerCase();
    if (
      courseYearFilter &&
      String(row.year_level) !== String(courseYearFilter)
    ) {
      return false;
    }
    if (
      courseSemesterFilter &&
      String(row.semester) !== String(courseSemesterFilter)
    ) {
      return false;
    }
    if (!query) return true;
    const haystack = [row.course_code, row.course_title, row.grade, row.units]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const filteredGrades = courseOptions.filter((row) => {
    const query = gradeSearch.trim().toLowerCase();
    const haystack = [
      row.course_code,
      row.course_title,
      row.grade,
      row.units,
      row.academic_year,
      row.semester,
      row.year_level,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (yearFilter && String(row.year_level) !== String(yearFilter)) {
      return false;
    }
    if (semesterFilter && String(row.semester) !== String(semesterFilter)) {
      return false;
    }
    return true;
  });

  const buildGradeKey = (row) =>
    `${row.course_code || ""}||${row.academic_year || ""}||${row.semester || ""}`;

  const toggleCourse = (code) => {
    setSelectionTouched(true);
    setSelectedCourseCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const toggleGrade = (key) => {
    setGradeSelectionTouched(true);
    setSelectedGradeKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSelectAll = () => {
    setSelectionTouched(true);
    const allCodes = filteredCourses.map((row) => row.course_code);
    setSelectedCourseCodes(allCodes);
  };

  const handleSelectAllGrades = () => {
    setGradeSelectionTouched(true);
    const keys = filteredGrades.map((row) => buildGradeKey(row));
    setSelectedGradeKeys(keys);
  };

  const handleClearAll = () => {
    setSelectionTouched(true);
    setSelectedCourseCodes([]);
  };

  const handleClearAllGrades = () => {
    setGradeSelectionTouched(true);
    setSelectedGradeKeys([]);
  };

  const appendDeclineNote = (text) => {
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setDeclineNotes((prev) => {
      if (!prev) return trimmed;
      if (prev.includes(trimmed)) return prev;
      return `${prev}\n${trimmed}`;
    });
  };

  const handleSelectByFilter = () => {
    setGradeSelectionTouched(true);
    const query = gradeSearch.trim().toLowerCase();
    const keys = courseOptions
      .filter((row) => {
        if (query) {
          const haystack = [
            row.course_code,
            row.course_title,
            row.grade,
            row.units,
            row.academic_year,
            row.semester,
            row.year_level,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (yearFilter && String(row.year_level) !== String(yearFilter)) {
          return false;
        }
        if (semesterFilter && String(row.semester) !== String(semesterFilter)) {
          return false;
        }
        return true;
      })
      .map((row) => buildGradeKey(row));
    setSelectedGradeKeys(keys);
  };

  const yearLevels = Array.from(
    new Set(
      courseOptions
        .map((row) => row.year_level)
        .filter((val) => String(val || "").trim() !== ""),
    ),
  ).sort((a, b) => Number(a) - Number(b));

  const semesters = Array.from(
    new Set(
      courseOptions
        .map((row) => row.semester)
        .filter((val) => String(val || "").trim() !== ""),
    ),
  );

  const formatYearLevel = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    if (num % 100 >= 11 && num % 100 <= 13) return `${num}th Year`;
    const suffix = { 1: "st", 2: "nd", 3: "rd" }[num % 10] || "th";
    return `${num}${suffix} Year`;
  };

  const handleApproveClick = async () => {
    if (!request || !onApprove) return;
    if (selectionRequired) {
      if (!hasSelection) return;
      setSavingSelection(true);
      setCourseError("");
      try {
        await requestService.updateCourseDescriptionSelection(
          request.id,
          selectedCourseCodes,
          "Course description selection saved",
        );
      } catch (err) {
        const detail =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Failed to save course selection.";
        setCourseError(detail);
        setSavingSelection(false);
        return;
      }
      setSavingSelection(false);
    }
    if (gradesSelectionRequired) {
      if (!hasGradesSelection) return;
      setSavingGradesSelection(true);
      setCourseError("");
      try {
        await requestService.updateGradeSelection(
          request.id,
          selectedGradeKeys,
          "Certification of grades selection saved",
        );
      } catch (err) {
        const detail =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Failed to save grade selection.";
        setCourseError(detail);
        setSavingGradesSelection(false);
        return;
      }
      setSavingGradesSelection(false);
    }
    await onApprove(request);
  };

  return (
    /* ── Backdrop ── */
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-4"
      style={{ animation: "fadeIn 150ms ease" }}
    >
      {/* ── Panel ── */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-auto"
        style={{ animation: "slideUp 200ms ease" }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 px-6 pt-3 pb-3 border-b border-gray-100">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Certificate Request
            </p>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              {request.certificate_type_name || "Request Details"}
            </h2>
          </div>

          <div className="flex items-center gap-2 mt-2  shrink-0">
            {/* Status badge */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}
            >
              {status}
            </span>
            {/* Close */}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <BsX size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-7 py-2 max-h-[60vh] overflow-y-auto">
          <div className="rounded-md border !border-amber-500 bg-amber-50 px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-widest text-amber-500 font-semibold">
                Validation Status
              </p>
              {hasValidationFlags ? (
                <span className="inline-flex items-center ml-2 gap-1 text-xs font-semibold text-amber-700">
                  <BsExclamationTriangleFill size={11} /> Needs Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <BsCheckCircleFill size={11} /> Clear
                </span>
              )}
            </div>
            <div className=" ml-2 text-xs text-amber-700">
              {hasValidationFlags ? (
                <ul className="list-disc pl-4 space-y-1">
                  {normalizedValidation.map((flag, idx) => (
                    <li key={`${flag}-${idx}`}>{flag}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] ml-2 text-emerald-700">
                  No anomalies detected from the automatic checks.
                </p>
              )}
            </div>
          </div>
          <DetailRow
            icon={BsHash}
            label="Reference No."
            value={request.reference_number}
          />
          <DetailRow
            icon={BsHash}
            label="SR-Code"
            value={request.sr_code || "-"}
          />
          <DetailRow
            icon={BsPersonFill}
            label="Student Name"
            value={request.student_name}
          />
          <DetailRow
            icon={BsBookFill}
            label="Program"
            value={request.program}
          />
          <DetailRow
            icon={BsBookFill}
            label="Major"
            value={request.major || "—"}
          />
          <DetailRow
            icon={BsBookFill}
            label="Year Graduated"
            value={request.year_graduated}
          />
          <DetailRow
            icon={BsFileEarmarkText}
            label="Purpose"
            value={request.purpose}
          />
          <DetailRow
            icon={BsPersonFill}
            label="Requestor Name"
            value={request.requestor_name}
          />
          <DetailRow
            icon={BsPersonFill}
            label="Requestor Relationship"
            value={request.requestor_relationship}
          />
          <DetailRow
            icon={BsCalendar3}
            label="Date Requested"
            value={
              request.created_at
                ? new Date(request.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"
            }
          />
          {request.remarks && (
            <DetailRow icon={BsTag} label="Remarks" value={request.remarks} />
          )}
          {request.updated_at && (
            <DetailRow
              icon={BsClock}
              label="Last Updated"
              value={new Date(request.updated_at).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          )}
          <DetailRow
            icon={BsPersonFill}
            label="Requestor Signature"
            value={
              request.signature_data ? (
                <img
                  src={
                    request.signature_data.startsWith("data:image")
                      ? request.signature_data
                      : `data:image/png;base64,${request.signature_data}` // ✅ add prefix if missing
                  }
                  alt="Requestor Signature"
                  className="w-48 h-20 object-contain border border-gray-200 rounded bg-white"
                  onError={(e) => {
                    e.target.style.display = "none"; // hide if still broken
                  }}
                />
              ) : (
                "No signature uploaded"
              )
            }
          />

          {request.status === "REJECTED" && (
            <div className="mt-2 rounded-md border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-red-400 font-semibold mb-2">
                Reason for Rejection
              </p>
              {notes.length > 0 ? (
                notes.map((n) => (
                  <div key={n.id} className="mb-2 last:mb-0">
                    <p className="text-xs text-red-700">{n.note}</p>
                    <p className="text-[10px] text-red-400 mt-0.5">
                      {new Date(n.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {n.user_name && ` · ${n.user_name}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-red-400 italic">
                  No reason provided.
                </p>
              )}
            </div>
          )}

          {isCourseDescription && (
            <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">
                  Course Description Selection
                </p>
                {!readOnly && (
                  <span className="text-[10px] text-blue-500">
                    Select courses to include
                  </span>
                )}
              </div>

              {courseLoading && (
                <div className="py-2 text-xs text-blue-500 flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-transparent" />
                  Loading courses...
                </div>
              )}

              {!courseLoading && courseError && (
                <div className="mt-2 text-xs text-red-600">{courseError}</div>
              )}

              {!courseLoading && !courseError && (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search courses..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-200"
                      disabled={readOnly}
                    />
                    {!readOnly && (
                      <>
                        <button
                          onClick={handleSelectAll}
                          type="button"
                          className="px-3 py-1.5 text-[11px] font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          onClick={handleClearAll}
                          type="button"
                          className="px-3 py-1.5 text-[11px] font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={courseYearFilter}
                        onChange={(e) => setCourseYearFilter(e.target.value)}
                        className="text-xs px-2 py-1.5 border border-blue-200 rounded-md bg-white"
                      >
                        <option value="">All Year Levels</option>
                        {yearLevels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {formatYearLevel(lvl)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={courseSemesterFilter}
                        onChange={(e) =>
                          setCourseSemesterFilter(e.target.value)
                        }
                        className="text-xs px-2 py-1.5 border border-blue-200 rounded-md bg-white"
                      >
                        <option value="">All Semesters</option>
                        {semesters.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-blue-100 bg-white">
                    {filteredCourses.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No courses found.
                      </div>
                    ) : (
                      filteredCourses.map((row) => {
                        const code = row.course_code;
                        const label = `${row.course_code || ""} - ${
                          row.course_title || ""
                        }`;
                        const detail = `Units: ${row.units || "-"} | Grade: ${
                          row.grade || "-"
                        }`;
                        const checked = selectedCourseCodes.includes(code);
                        return (
                          <label
                            key={code}
                            className={`flex items-start gap-3 px-3 py-2 border-b border-blue-50 last:border-0 ${
                              readOnly ? "cursor-default" : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              onChange={() => toggleCourse(code)}
                              disabled={readOnly}
                            />
                            <div>
                              <div className="text-xs text-gray-800 font-medium">
                                {label}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {detail}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {!readOnly && (
                    <div className="mt-2 text-[11px] text-blue-600">
                      Selected: {selectedCourseCodes.length}
                      {!hasSelection && selectionTouched && (
                        <span className="text-red-500">
                          {" "}
                          â€” Please select at least one course.
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {isCertificationOfGrades && (
            <div className="mt-3 rounded-md border border-purple-100 bg-purple-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-widest text-purple-400 font-semibold">
                  Certification of Grades Selection
                </p>
                {!readOnly && (
                  <span className="text-[10px] text-purple-500">
                    Select grades to include
                  </span>
                )}
              </div>

              {courseLoading && (
                <div className="py-2 text-xs text-purple-500 flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-200 border-t-transparent" />
                  Loading grades...
                </div>
              )}

              {!courseLoading && courseError && (
                <div className="mt-2 text-xs text-red-600">{courseError}</div>
              )}

              {!courseLoading && !courseError && (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search courses..."
                      value={gradeSearch}
                      onChange={(e) => setGradeSearch(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 border border-purple-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-200"
                      disabled={readOnly}
                    />
                    {!readOnly && (
                      <>
                        <button
                          onClick={handleSelectAllGrades}
                          type="button"
                          className="px-3 py-1.5 text-[11px] font-medium text-purple-700 bg-white border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          onClick={handleClearAllGrades}
                          type="button"
                          className="px-3 py-1.5 text-[11px] font-medium text-purple-700 bg-white border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>

                  {!readOnly && (
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="text-xs px-2 py-1.5 border border-purple-200 rounded-md bg-white"
                      >
                        <option value="">All Year Levels</option>
                        {yearLevels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {formatYearLevel(lvl)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={semesterFilter}
                        onChange={(e) => setSemesterFilter(e.target.value)}
                        className="text-xs px-2 py-1.5 border border-purple-200 rounded-md bg-white"
                      >
                        <option value="">All Semesters</option>
                        {semesters.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSelectByFilter}
                        type="button"
                        className="px-3 py-1.5 text-[11px] font-medium text-purple-700 bg-white border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                      >
                        Select Filter
                      </button>
                    </div>
                  )}

                  <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-purple-100 bg-white">
                    {filteredGrades.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No courses found.
                      </div>
                    ) : (
                      filteredGrades.map((row) => {
                        const key = buildGradeKey(row);
                        const checked = selectedGradeKeys.includes(key);
                        const label = `${row.course_code || ""} - ${
                          row.course_title || ""
                        }`;
                        const yearLabel = row.year_level
                          ? formatYearLevel(row.year_level)
                          : row.academic_year || "-";
                        const detail = `Units: ${row.units || "-"} | Grade: ${
                          row.grade || "-"
                        } | ${yearLabel} | ${row.semester || "-"}`;
                        return (
                          <label
                            key={key}
                            className={`flex items-start gap-3 px-3 py-2 border-b border-purple-50 last:border-0 ${
                              readOnly ? "cursor-default" : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              onChange={() => toggleGrade(key)}
                              disabled={readOnly}
                            />
                            <div>
                              <div className="text-xs text-gray-800 font-medium">
                                {label}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {detail}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {!readOnly && (
                    <div className="mt-2 text-[11px] text-purple-600">
                      Selected: {selectedGradeKeys.length}
                      {!hasGradesSelection && gradeSelectionTouched && (
                        <span className="text-red-500">
                          {" "}
                          â€” Please select at least one grade.
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {showDeclineInput && (
            <div className="mb-3 mt-3">
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {suggestedNotes.length > 0 && (
                  <div className="absolute left-2 top-2 right-2 flex flex-wrap gap-2 max-h-16 overflow-y-auto pr-1 z-10 pointer-events-none">
                    {suggestedNotes.map((note, idx) => (
                      <button
                        key={`${note}-${idx}`}
                        type="button"
                        onClick={() => appendDeclineNote(note)}
                        className="pointer-events-auto text-[11px] px-2 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  rows={5}
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  placeholder="Enter the reason for rejecting this request. This will be included in the email sent to the student."
                  className="w-full text-xs text-gray-700 border border-gray-300 rounded-md px-3 pt-12 pb-2 focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-400 resize-none placeholder:text-gray-400 overflow-y-auto"
                />
              </div>
            </div>
          )}

          {isRejected && !readOnly && (
            <div className="mb-3">
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                Rejection Email Note
              </label>
              <textarea
                rows={3}
                value={rejectionEmailNotes}
                onChange={(e) => setRejectionEmailNotes(e.target.value)}
                placeholder="Optional message to include in the rejection email."
                className="w-full text-xs text-gray-700 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-400 resize-none placeholder:text-gray-400"
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          {/* Decline notes input — shown after clicking Decline */}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowDeclineInput(false);
                setDeclineNotes("");
                onClose();
              }}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md !hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Close
            </button>

            {isRejected && !readOnly && (
              <button
                onClick={() =>
                  onSendRejectionEmail?.(request, rejectionEmailNotes)
                }
                disabled={
                  loading || rejectionEmailLoading || !request?.requestor_email
                }
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {rejectionEmailLoading ? "..." : "Send Rejection Email"}
              </button>
            )}

            {canAct && !readOnly && (
              <>
                <button
                  onClick={handleDeclineClick}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <BsXCircle size={13} />
                  {showDeclineInput ? "Cancel" : "Reject"}
                </button>

                {showDeclineInput ? (
                  <button
                    onClick={() => onRejectAndSend?.(request, declineNotes)}
                    disabled={
                      loading || rejectionEmailLoading || !declineNotes.trim()
                    }
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {rejectionEmailLoading ? "..." : "Send Rejection Email"}
                  </button>
                ) : (
                  <button
                    onClick={handleApproveClick}
                    disabled={
                      loading ||
                      savingSelection ||
                      savingGradesSelection ||
                      (selectionRequired && !hasSelection) ||
                      (gradesSelectionRequired && !hasGradesSelection)
                    }
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#ee1133] border border-[#ee1133] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading || savingSelection ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <BsCheckCircle size={13} />
                    )}
                    Approve
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Keyframe animations (injected once) ── */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }               to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
};

export default RequestModal;
