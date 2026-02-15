import React, { useState, useImperativeHandle, forwardRef } from "react";

const OdrRequestForm = React.forwardRef((props, ref) => {
  const [loading, setLoading] = useState(false);
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

  const validateForm = () => {
    const required = [
      "name",
      "currentAddress",
      "relationshipToStudent",
      "contactNumber",
      "emailAddress",
      "purposeOfRequest",
      "fullname",
      "program",
    ];

    for (const field of required) {
      if (!formData[field] || formData[field].trim() === "") {
        return `${field.replace(/([A-Z])/g, " $1")} is required`;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.emailAddress)) {
      return "Please enter a valid email address";
    }

    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!phoneRegex.test(formData.contactNumber.replace(/\s/g, ""))) {
      return "Please enter a valid Philippine mobile number (09xxxxxxxxx)";
    }

    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getFormData = () => {
    const error = validateForm();
    if (error) {
      throw new Error(error);
    }
    return formData;
  };

  React.useImperativeHandle(ref, () => ({
    getFormData,
  }));

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

  const programOptions = [
    "Bachelor of Science in Computer Science",
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Information Systems",
    "BS Mechanical Engineering",
  ]; // Add program options if needed

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

  return (
    <>
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
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
              required
            />
          </div>

          {/* Current Address */}
          <div className="mb-6">
            <label
              htmlFor="currentAddress"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Current Address
            </label>
            <input
              type="text"
              id="currentAddress"
              name="currentAddress"
              value={formData.currentAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
              required
            />
          </div>

          {/* Relationship to the student */}
          <div className="mb-6">
            <label
              htmlFor="relationshipToStudent"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Relationship to the student
            </label>
            <input
              type="text"
              id="relationshipToStudent"
              name="relationshipToStudent"
              list="relationshipOptions"
              value={formData.relationshipToStudent}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
              required
            />
            <datalist id="relationshipOptions">
              {relationshipOptions.map((option, index) => (
                <option key={index} value={option} />
              ))}
            </datalist>
          </div>

          {/* Contact Number */}
          <div className="mb-6">
            <label
              htmlFor="contactNumber"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Contact Number
            </label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
              required
            />
          </div>

          {/* Email Address */}
          <div className="mb-6">
            <label
              htmlFor="emailAddress"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="emailAddress"
              name="emailAddress"
              value={formData.emailAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              * Valid and active email is required. The Reference No. for
              request tracking will be sent to this email address.
            </p>
          </div>

          {/* Purpose/s of request */}
          <div className="mb-6">
            <label
              htmlFor="purposeOfRequest"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Purpose/s of request
            </label>
            <select
              id="purposeOfRequest"
              name="purposeOfRequest"
              value={formData.purposeOfRequest}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">Select purpose</option>
              {purposeOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="max-w-4xl -translate-y-6 m-5">
        <div className="bg-[#17A2B8] text-white px-6 h-12 rounded-t-sm flex items-center">
          <h2 className="text-lg uppercase">Student Information</h2>
        </div>

        <div className="bg-[#F8F8FF] rounded-b-sm p-6">
          {/* SRCODE */}
          <div className="mb-6">
            <label
              htmlFor="srcCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              SRCODE (Optional)
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
              Fullname
            </label>
            <input
              type="text"
              id="fullname"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
              required
            />
          </div>

          {/* Program */}
          {/* Program */}
          <div className="mb-6">
            <label
              htmlFor="program"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Program
            </label>
            <input
              type="text"
              id="program"
              name="program"
              list="programOptions"
              value={formData.program} // ✅ Fixed: was formData.programOptions
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
              required
            />
            <datalist id="programOptions">
              {programOptions.map((option, index) => (
                <option key={index} value={option} />
              ))}
            </datalist>
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
              required
            />
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
              value={formData.yearGraduated}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 h-10"
              required
            />
          </div>
        </div>
      </div>
    </>
  );
});

export default OdrRequestForm;
