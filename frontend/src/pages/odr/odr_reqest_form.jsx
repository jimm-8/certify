import React, { useEffect, useMemo, useState } from "react";
import { FaExclamationCircle } from "react-icons/fa";

// Reusable inline field error
const FieldError = ({ message }) =>
  message ? (
    <p className="flex items-center gap-1 text-red-500 text-xs mt-1">
      <FaExclamationCircle className="shrink-0" />
      {message}
    </p>
  ) : null;

const OdrRequestForm = React.forwardRef(
  ({ programs = [], selectedOffice = "" }, ref) => {
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

  // Per-field error state
  const [errors, setErrors] = useState({});

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

  const purposeOptions = [
    "Employment",
    "Further Studies",
    "Scholarship Application",
    "License Application",
    "Board Exam",
    "Personal Record",
    "Immigration",
    "Others",
  ];

  const programOptions = useMemo(() => {
    return [...new Set(programs.map((p) => p.name).filter(Boolean))].sort();
  }, [programs]);

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

  // Validate a single field and return an error string (or "")
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
      if (!emailRegex.test(trimmed))
        return "Please enter a valid email address.";
    }

    if (name === "contactNumber" && trimmed) {
      const phoneRegex = /^(09|\+639)\d{9}$/;
      if (!phoneRegex.test(trimmed.replace(/\s/g, "")))
        return "Enter a valid PH mobile number (e.g. 09XXXXXXXXX).";
    }

    return "";
  };

  // Validate all fields and return field-level error map
  const validateAll = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error as user types / selects
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  // Called by parent via ref
  const getFormData = () => {
    const newErrors = validateAll();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      throw new Error("Please fix the highlighted fields before continuing.");
    }
    return formData;
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

  // Helper: classes for input based on error state
  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 h-10 transition-colors ${
      errors[field]
        ? "border-red-400 bg-red-50 focus:ring-red-300"
        : "border-gray-300 focus:ring-teal-500"
    }`;

  const selectClass = (field) =>
    `w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-colors ${
      errors[field]
        ? "border-red-400 bg-red-50 focus:ring-red-300"
        : "border-gray-300 focus:ring-teal-500"
    }`;

  return (
    <>
      {/* ── Requesting Individual's Information ─────────────── */}
      <div className="max-w-4xl m-5">
        <div className="bg-[#17A2B8] text-white px-6 h-12 rounded-t-sm flex items-center">
          <h2 className="text-lg uppercase">
            Requesting Individual's Information
          </h2>
        </div>

        <div className="bg-[#F8F8FF] rounded-b-sm p-6">
          {/* Name */}
          <div className="mb-6">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
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

          {/* Current Address */}
          <div className="mb-6">
            <label
              htmlFor="currentAddress"
              className="block text-sm font-medium text-gray-700 mb-2"
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

          {/* Relationship to the student */}
          <div className="mb-6">
            <label
              htmlFor="relationshipToStudent"
              className="block text-sm font-medium text-gray-700 mb-2"
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
              {relationshipOptions.map((option, index) => (
                <option key={index} value={option} />
              ))}
            </datalist>
            <FieldError message={errors.relationshipToStudent} />
          </div>

          {/* Contact Number */}
          <div className="mb-6">
            <label
              htmlFor="contactNumber"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Contact Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              placeholder="09XXXXXXXXX"
              value={formData.contactNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              className={inputClass("contactNumber")}
            />
            <FieldError message={errors.contactNumber} />
          </div>

          {/* Email Address */}
          <div className="mb-6">
            <label
              htmlFor="emailAddress"
              className="block text-sm font-medium text-gray-700 mb-2"
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
              className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-colors ${
                errors.emailAddress
                  ? "border-red-400 bg-red-50 focus:ring-red-300"
                  : "border-gray-300 focus:ring-teal-500"
              }`}
            />
            <FieldError message={errors.emailAddress} />
            {!errors.emailAddress && (
              <p className="mt-1 text-xs text-gray-500">
                * Valid and active email is required. The Reference No. for
                request tracking will be sent to this email address.
              </p>
            )}
          </div>

          {/* Purpose of request */}
          <div className="mb-6">
            <label
              htmlFor="purposeOfRequest"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Purpose/s of request <span className="text-red-500">*</span>
            </label>
            <select
              id="purposeOfRequest"
              name="purposeOfRequest"
              value={formData.purposeOfRequest}
              onChange={handleChange}
              onBlur={handleBlur}
              className={selectClass("purposeOfRequest")}
            >
              <option value="">Select purpose</option>
              {purposeOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError message={errors.purposeOfRequest} />
          </div>
        </div>
      </div>

      {/* ── Student Information ──────────────────────────────── */}
      <div className="max-w-4xl -translate-y-6 m-5">
        <div className="bg-[#17A2B8] text-white px-6 h-12 rounded-t-sm flex items-center">
          <h2 className="text-lg uppercase">Student Information</h2>
        </div>

        <div className="bg-[#F8F8FF] rounded-b-sm p-6">
          {/* SRCODE (optional) */}
          <div className="mb-6">
            <label
              htmlFor="srcCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              SRCODE{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="srcCode"
              name="srcCode"
              value={formData.srcCode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
            />
          </div>

          {/* Fullname */}
          <div className="mb-6">
            <label
              htmlFor="fullname"
              className="block text-sm font-medium text-gray-700 mb-2"
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

          {/* Program */}
          <div className="mb-6">
            <label
              htmlFor="program"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Program <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="program"
              name="program"
              list="programOptions"
              value={formData.program}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  program: value,
                  major: "",
                }));
                setErrors((prev) => ({ ...prev, program: "", major: "" }));
              }}
              onBlur={handleBlur}
              className={inputClass("program")}
            />
            <datalist id="programOptions">
              {programOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <FieldError message={errors.program} />
          </div>

          {/* Major */}
          <div className="mb-6">
            <label
              htmlFor="major"
              className="block text-sm font-medium text-gray-700 mb-2"
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
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : ""
              }`}
              placeholder={
                majorOptions.length === 0 ? "No major available" : "Select major"
              }
            />
            <datalist id="majorOptions">
              {majorOptions.map((major) => (
                <option key={major} value={major} />
              ))}
            </datalist>
            <FieldError message={errors.major} />
          </div>

          {/* Year Graduated */}
          <div className="mb-6">
            <label
              htmlFor="yearGraduated"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Year Graduated
            </label>
            <input
              type="text"
              id="yearGraduated"
              name="yearGraduated"
              placeholder="e.g. 2023"
              value={formData.yearGraduated}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
            />
            <FieldError message={errors.yearGraduated} />
          </div>
        </div>
      </div>
    </>
  );
  },
);

export default OdrRequestForm;
