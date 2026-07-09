import React, { useEffect, useMemo, useState } from "react";
import { FaExclamationCircle } from "react-icons/fa";
import requestService from "../../services/requestService";

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <FaExclamationCircle className="shrink-0" />
      {message}
    </p>
  ) : null;

const formatYearLevel = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value || "");
  if (num % 100 >= 11 && num % 100 <= 13) return `${num}th Year`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[num % 10] || "th";
  return `${num}${suffix} Year`;
};

const isCourseDescriptionType = (certificateName = "") =>
  certificateName.toLowerCase().includes("course description");

const isCertificationOfGradesType = (certificateName = "") =>
  certificateName.toLowerCase().includes("grades");

const OdrRequestForm = React.forwardRef(
  ({ programs = [], selectedOffice = "", selectedCertType = null }, ref) => {
    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({
      name: "",
      currentAddress: "",
      relationshipToStudent: "",
      contactNumber: "",
      emailAddress: "",
      purposeOfRequest: "",
      srcCode: "",
      fullname: "",
      program: "",
      major: "",
      yearGraduated: "",
    });
    const [errors, setErrors] = useState({});
    const [programSearch, setProgramSearch] = useState("");
    const [showProgramDropdown, setShowProgramDropdown] = useState(false);
    const [courseOptions, setCourseOptions] = useState([]);
    const [courseLookupLoading, setCourseLookupLoading] = useState(false);
    const [courseLookupError, setCourseLookupError] = useState("");
    const [courseSearch, setCourseSearch] = useState("");
    const [gradeSearch, setGradeSearch] = useState("");
    const [courseYearFilter, setCourseYearFilter] = useState("");
    const [courseSemesterFilter, setCourseSemesterFilter] = useState("");
    const [gradeYearFilter, setGradeYearFilter] = useState("");
    const [gradeSemesterFilter, setGradeSemesterFilter] = useState("");
    const [selectedCourseCodes, setSelectedCourseCodes] = useState([]);
    const [selectedGradeKeys, setSelectedGradeKeys] = useState([]);

    const certificateName = selectedCertType?.name || "";
    const requiresCourseDescriptionSelection =
      isCourseDescriptionType(certificateName);
    const requiresGradeSelection = isCertificationOfGradesType(certificateName);
    const needsCourseSelection =
      requiresCourseDescriptionSelection || requiresGradeSelection;

    const programOptions = useMemo(() => {
      return [...new Set(programs.map((p) => p.name).filter(Boolean))].sort();
    }, [programs]);

    const filteredPrograms = useMemo(() => {
      if (!programSearch) return programOptions;
      return programOptions.filter((p) =>
        p.toLowerCase().includes(programSearch.toLowerCase()),
      );
    }, [programOptions, programSearch]);

    const relationshipOptions = [
      "Same Person",
      "Son",
      "Daughter",
      "Sibling",
      "Nephew",
      "Niece",
      "Cousin",
      "Grandchild",
      "Grandson",
      "Granddaughter",
      "Wife",
      "Husband",
      "Spouse",
      "Father",
      "Mother",
    ];

    const majorOptions = useMemo(() => {
      if (!formData.program) return [];
      return [
        ...new Set(
          programs
            .filter((p) => p.name === formData.program)
            .map((p) => p.major)
            .filter(Boolean),
        ),
      ].sort();
    }, [programs, formData.program]);

    const courseDescriptionOptions = useMemo(() => {
      return courseOptions.filter((row, idx, arr) => {
        const code = row?.course_code;
        if (!code) return false;
        return arr.findIndex((item) => item?.course_code === code) === idx;
      });
    }, [courseOptions]);

    const yearLevels = useMemo(
      () =>
        Array.from(
          new Set(
            courseOptions
              .map((row) => row.year_level)
              .filter((val) => String(val || "").trim() !== ""),
          ),
        ).sort((a, b) => Number(a) - Number(b)),
      [courseOptions],
    );

    const semesters = useMemo(
      () =>
        Array.from(
          new Set(
            courseOptions
              .map((row) => row.semester)
              .filter((val) => String(val || "").trim() !== ""),
          ),
        ),
      [courseOptions],
    );

    const filteredCourseDescriptionOptions = useMemo(() => {
      const query = courseSearch.trim().toLowerCase();
      return courseDescriptionOptions.filter((row) => {
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
        const haystack = [
          row.course_code,
          row.course_title,
          row.units,
          row.grade,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }, [
      courseDescriptionOptions,
      courseSearch,
      courseYearFilter,
      courseSemesterFilter,
    ]);

    const filteredGradeOptions = useMemo(() => {
      const query = gradeSearch.trim().toLowerCase();
      return courseOptions.filter((row) => {
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
        if (
          gradeYearFilter &&
          String(row.year_level) !== String(gradeYearFilter)
        ) {
          return false;
        }
        if (
          gradeSemesterFilter &&
          String(row.semester) !== String(gradeSemesterFilter)
        ) {
          return false;
        }
        return true;
      });
    }, [courseOptions, gradeSearch, gradeYearFilter, gradeSemesterFilter]);

    const buildGradeKey = (row) =>
      `${row.course_code || ""}||${row.academic_year || ""}||${row.semester || ""}`;

    const validateField = (name, value) => {
      const trimmed = typeof value === "string" ? value.trim() : value;
      const requiredFields = [
        "name",
        "currentAddress",
        "relationshipToStudent",
        "contactNumber",
        "emailAddress",
        "purposeOfRequest",
        "fullname",
        "program",
      ];

      if (requiredFields.includes(name) && !trimmed) {
        const labels = {
          name: "Name",
          currentAddress: "Current Address",
          relationshipToStudent: "Relationship to the student",
          contactNumber: "Contact Number",
          emailAddress: "Email Address",
          purposeOfRequest: "Purpose of request",
          fullname: "Full name",
          program: "Program",
        };
        return `${labels[name] || name} is required.`;
      }

      if (name === "purposeOfRequest" && trimmed && trimmed.length < 5) {
        return "Purpose of request must be at least 5 characters.";
      }

      if (name === "program" && trimmed && !programOptions.includes(trimmed)) {
        return "Please select a valid program from the list.";
      }

      if (name === "major" && majorOptions.length > 0 && !trimmed) {
        return "Major is required for this program.";
      }

      if (name === "major" && trimmed && !majorOptions.includes(trimmed)) {
        return "Please select a valid major from the list.";
      }

      if (name === "emailAddress" && trimmed) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          return "Please enter a valid email address.";
        }
      }

      if (name === "contactNumber" && trimmed) {
        const phoneRegex = /^(09|\+639)\d{9}$/;
        if (!phoneRegex.test(trimmed.replace(/\s/g, ""))) {
          return "Enter a valid PH mobile number (e.g. 09XXXXXXXXX).";
        }
      }

      if (name === "yearGraduated" && trimmed) {
        if (!/^\d{4}$/.test(trimmed)) {
          return "Year graduated must be a 4-digit year.";
        }
        if (Number(trimmed) > currentYear) {
          return `Year graduated cannot be later than ${currentYear}.`;
        }
      }

      return "";
    };

    const validateAll = () => {
      const newErrors = {};
      Object.keys(formData).forEach((key) => {
        const err = validateField(key, formData[key]);
        if (err) newErrors[key] = err;
      });

      if (
        requiresCourseDescriptionSelection &&
        selectedCourseCodes.length === 0
      ) {
        newErrors.courseSelection =
          "Please select at least one course to include in the request.";
      }
      if (requiresGradeSelection && selectedGradeKeys.length === 0) {
        newErrors.gradeSelection =
          "Please select at least one course grade to include in the request.";
      }
      if (needsCourseSelection && courseOptions.length === 0) {
        newErrors.courseLookup =
          courseLookupError ||
          "Load the student's available courses before continuing.";
      }

      return newErrors;
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    };

    const handleBlur = (e) => {
      const { name, value } = e.target;
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
    };

    const loadCourseOptions = async () => {
      if (!needsCourseSelection) return;

      const srCode = formData.srcCode.trim();
      const studentName = formData.fullname.trim();
      if (!srCode && !studentName) {
        setCourseOptions([]);
        setCourseLookupError(
          "Enter the student's SR code or full name before loading courses.",
        );
        setErrors((prev) => ({
          ...prev,
          courseLookup:
            "Enter the student's SR code or full name before loading courses.",
        }));
        return;
      }

      setCourseLookupLoading(true);
      setCourseLookupError("");
      setErrors((prev) => ({ ...prev, courseLookup: "" }));

      try {
        const response = await requestService.getCourseOptionsForOdr({
          srCode,
          studentName,
        });
        const items = Array.isArray(response?.courses) ? response.courses : [];
        setCourseOptions(items);
        setSelectedCourseCodes((prev) =>
          prev.filter((code) => items.some((row) => row.course_code === code)),
        );
        setSelectedGradeKeys((prev) =>
          prev.filter((key) => items.some((row) => buildGradeKey(row) === key)),
        );
      } catch (error) {
        const detail =
          error?.response?.data?.detail ||
          "Unable to load the student's available courses.";
        setCourseOptions([]);
        setSelectedCourseCodes([]);
        setSelectedGradeKeys([]);
        setCourseLookupError(detail);
        setErrors((prev) => ({ ...prev, courseLookup: detail }));
      } finally {
        setCourseLookupLoading(false);
      }
    };

    const getFormData = () => {
      const newErrors = validateAll();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        throw new Error("Please fix the highlighted fields before continuing.");
      }

      return {
        ...formData,
        courseDescriptionSelection: selectedCourseCodes,
        gradeSelection: selectedGradeKeys,
      };
    };

    React.useImperativeHandle(ref, () => ({ getFormData }));

    useEffect(() => {
      if (!formData.program) return;

      const programStillValid = programOptions.includes(formData.program);
      if (!programStillValid) {
        setFormData((prev) => ({ ...prev, program: "", major: "" }));
        setErrors((prev) => ({ ...prev, program: "", major: "" }));
        return;
      }

      if (formData.major && !majorOptions.includes(formData.major)) {
        setFormData((prev) => ({ ...prev, major: "" }));
        setErrors((prev) => ({ ...prev, major: "" }));
      }
    }, [
      selectedOffice,
      formData.program,
      formData.major,
      programOptions,
      majorOptions,
    ]);

    useEffect(() => {
      if (!needsCourseSelection) {
        setCourseOptions([]);
        setCourseLookupError("");
        setSelectedCourseCodes([]);
        setSelectedGradeKeys([]);
        setCourseSearch("");
        setGradeSearch("");
        setCourseYearFilter("");
        setCourseSemesterFilter("");
        setGradeYearFilter("");
        setGradeSemesterFilter("");
        setErrors((prev) => ({
          ...prev,
          courseLookup: "",
          courseSelection: "",
          gradeSelection: "",
        }));
      }
    }, [needsCourseSelection]);

    const inputClass = (field) =>
      `h-10 w-full rounded border px-3 py-2 transition-colors focus:outline-none focus:ring-2 ${
        errors[field]
          ? "border-red-400 bg-red-50 focus:ring-red-300"
          : "border-gray-300 focus:ring-teal-500"
      }`;

    const textareaClass = (field) =>
      `w-full rounded border px-3 py-2 transition-colors focus:outline-none focus:ring-2 ${
        errors[field]
          ? "border-red-400 bg-red-50 focus:ring-red-300"
          : "border-gray-300 focus:ring-teal-500"
      }`;

    const toggleCourse = (code) => {
      setSelectedCourseCodes((prev) =>
        prev.includes(code)
          ? prev.filter((item) => item !== code)
          : [...prev, code],
      );
      setErrors((prev) => ({ ...prev, courseSelection: "" }));
    };

    const toggleGrade = (key) => {
      setSelectedGradeKeys((prev) =>
        prev.includes(key)
          ? prev.filter((item) => item !== key)
          : [...prev, key],
      );
      setErrors((prev) => ({ ...prev, gradeSelection: "" }));
    };

    return (
      <>
        <div className="m-5 max-w-4xl">
          <div className="flex h-12 items-center rounded-t-sm bg-[#17A2B8] px-6 text-white">
            <h2 className="text-lg uppercase">
              Requesting Individual's Information
            </h2>
          </div>

          <div className="rounded-b-sm bg-[#F8F8FF] p-6">
            <div className="mb-6">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass("name")}
              />
              <FieldError message={errors.name} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="currentAddress"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Current Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="currentAddress"
                name="currentAddress"
                value={formData.currentAddress}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass("currentAddress")}
              />
              <FieldError message={errors.currentAddress} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="relationshipToStudent"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Relationship to the student{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="relationshipToStudent"
                name="relationshipToStudent"
                list="relationshipOptions"
                value={formData.relationshipToStudent}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass("relationshipToStudent")}
              />
              <datalist id="relationshipOptions">
                {relationshipOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <FieldError message={errors.relationshipToStudent} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="contactNumber"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass("contactNumber")}
              />
              <FieldError message={errors.contactNumber} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="emailAddress"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="emailAddress"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass("emailAddress")}
              />
              <FieldError message={errors.emailAddress} />
              {!errors.emailAddress && (
                <p className="mt-1 text-xs text-gray-500">
                  * Valid and active email is required. The reference number for
                  request tracking will be sent to this email address.
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="purposeOfRequest"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Purpose/s of request <span className="text-red-500">*</span>
              </label>
              <textarea
                id="purposeOfRequest"
                name="purposeOfRequest"
                value={formData.purposeOfRequest}
                onChange={handleChange}
                onBlur={handleBlur}
                rows={4}
                className={textareaClass("purposeOfRequest")}
              />
              <FieldError message={errors.purposeOfRequest} />
            </div>
          </div>
        </div>

        <div className="m-5 max-w-4xl -translate-y-6">
          <div className="flex h-12 items-center rounded-t-sm bg-[#17A2B8] px-6 text-white">
            <h2 className="text-lg uppercase">Student Information</h2>
          </div>

          <div className="rounded-b-sm bg-[#F8F8FF] p-6">
            <div className="mb-6">
              <label
                htmlFor="srcCode"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                SRCODE{" "}
                <span className="font-normal text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                id="srcCode"
                name="srcCode"
                value={formData.srcCode}
                onChange={handleChange}
                className="h-10 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="fullname"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullname"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass("fullname")}
              />
              <FieldError message={errors.fullname} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="program"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Program <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  id="program"
                  name="program"
                  autoComplete="off"
                  value={programSearch}
                  onChange={(e) => {
                    setProgramSearch(e.target.value);
                    setShowProgramDropdown(true);
                    setFormData((prev) => ({
                      ...prev,
                      program: "",
                      major: "",
                    }));
                    setErrors((prev) => ({ ...prev, program: "", major: "" }));
                  }}
                  onFocus={() => setShowProgramDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowProgramDropdown(false), 150);
                    const err = validateField("program", formData.program);
                    setErrors((prev) => ({ ...prev, program: err }));
                  }}
                  className={inputClass("program")}
                />

                {showProgramDropdown && filteredPrograms.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded border border-gray-300 bg-white shadow-md">
                    {filteredPrograms.map((name) => (
                      <li
                        key={name}
                        onMouseDown={() => {
                          setFormData((prev) => ({
                            ...prev,
                            program: name,
                            major: "",
                          }));
                          setProgramSearch(name);
                          setShowProgramDropdown(false);
                          setErrors((prev) => ({
                            ...prev,
                            program: "",
                            major: "",
                          }));
                        }}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-teal-50 hover:text-teal-700"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <FieldError message={errors.program} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="major"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Major
              </label>
              <input
                type="text"
                id="major"
                name="major"
                list="majorOptions"
                value={formData.major}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={majorOptions.length === 0}
                className={`${inputClass("major")} ${
                  majorOptions.length === 0
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : ""
                }`}
              />
              <datalist id="majorOptions">
                {majorOptions.map((major) => (
                  <option key={major} value={major} />
                ))}
              </datalist>
              <FieldError message={errors.major} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="yearGraduated"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Year Graduated
              </label>
              <input
                type="text"
                id="yearGraduated"
                name="yearGraduated"
                value={formData.yearGraduated}
                onChange={handleChange}
                onBlur={handleBlur}
                inputMode="numeric"
                maxLength={4}
                className="h-10 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <FieldError message={errors.yearGraduated} />
            </div>

            {needsCourseSelection && (
              <div className="mt-8 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                      {requiresCourseDescriptionSelection
                        ? "Course Description Selection"
                        : "Certification of Grades Selection"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Select the courses that should be included in this request
                      before submission.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadCourseOptions}
                    disabled={courseLookupLoading}
                    className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
                  >
                    {courseLookupLoading
                      ? "Loading..."
                      : "Load Available Courses"}
                  </button>
                </div>

                <FieldError message={errors.courseLookup} />

                {courseOptions.length > 0 &&
                  requiresCourseDescriptionSelection && (
                    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search courses..."
                          value={courseSearch}
                          onChange={(e) => setCourseSearch(e.target.value)}
                          className="flex-1 rounded-md border border-blue-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200"
                        />
                        <select
                          value={courseYearFilter}
                          onChange={(e) => setCourseYearFilter(e.target.value)}
                          className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-xs"
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
                          className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-xs"
                        >
                          <option value="">All Semesters</option>
                          {semesters.map((sem) => (
                            <option key={sem} value={sem}>
                              {sem}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCourseCodes(
                              filteredCourseDescriptionOptions.map(
                                (row) => row.course_code,
                              ),
                            )
                          }
                          className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-medium text-blue-700"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCourseCodes([])}
                          className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-medium text-blue-700"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-blue-100 bg-white">
                        {filteredCourseDescriptionOptions.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            No courses found.
                          </div>
                        ) : (
                          filteredCourseDescriptionOptions.map((row) => {
                            const checked = selectedCourseCodes.includes(
                              row.course_code,
                            );
                            return (
                              <label
                                key={row.course_code}
                                className="flex cursor-pointer items-start gap-3 border-b border-blue-50 px-3 py-2 last:border-0"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={checked}
                                  onChange={() => toggleCourse(row.course_code)}
                                />
                                <div>
                                  <div className="text-xs font-medium text-gray-800">
                                    {row.course_code} - {row.course_title}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    Units: {row.units || "-"} | Grade:{" "}
                                    {row.grade || "-"}
                                  </div>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>

                      <p className="mt-2 text-[11px] text-blue-700">
                        Selected: {selectedCourseCodes.length}
                      </p>
                      <FieldError message={errors.courseSelection} />
                    </div>
                  )}

                {courseOptions.length > 0 && requiresGradeSelection && (
                  <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search courses..."
                        value={gradeSearch}
                        onChange={(e) => setGradeSearch(e.target.value)}
                        className="flex-1 rounded-md border border-purple-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-200"
                      />
                      <select
                        value={gradeYearFilter}
                        onChange={(e) => setGradeYearFilter(e.target.value)}
                        className="rounded-md border border-purple-200 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="">All Year Levels</option>
                        {yearLevels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {formatYearLevel(lvl)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={gradeSemesterFilter}
                        onChange={(e) => setGradeSemesterFilter(e.target.value)}
                        className="rounded-md border border-purple-200 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="">All Semesters</option>
                        {semesters.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedGradeKeys(
                            filteredGradeOptions.map((row) =>
                              buildGradeKey(row),
                            ),
                          )
                        }
                        className="rounded-md border border-purple-200 bg-white px-3 py-1.5 text-[11px] font-medium text-purple-700"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGradeKeys([])}
                        className="rounded-md border border-purple-200 bg-white px-3 py-1.5 text-[11px] font-medium text-purple-700"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="mt-3 max-h-52 overflow-y-auto rounded-md border border-purple-100 bg-white">
                      {filteredGradeOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">
                          No courses found.
                        </div>
                      ) : (
                        filteredGradeOptions.map((row) => {
                          const key = buildGradeKey(row);
                          const checked = selectedGradeKeys.includes(key);
                          return (
                            <label
                              key={key}
                              className="flex cursor-pointer items-start gap-3 border-b border-purple-50 px-3 py-2 last:border-0"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={checked}
                                onChange={() => toggleGrade(key)}
                              />
                              <div>
                                <div className="text-xs font-medium text-gray-800">
                                  {row.course_code} - {row.course_title}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  Units: {row.units || "-"} | Grade:{" "}
                                  {row.grade || "-"} |{" "}
                                  {row.year_level
                                    ? formatYearLevel(row.year_level)
                                    : row.academic_year || "-"}{" "}
                                  | {row.semester || "-"}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <p className="mt-2 text-[11px] text-purple-700">
                      Selected: {selectedGradeKeys.length}
                    </p>
                    <FieldError message={errors.gradeSelection} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  },
);

export default OdrRequestForm;
