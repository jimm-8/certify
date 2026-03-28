import React, { useState, useRef, useEffect } from "react";
import OdrStepCounter from "../../components/common/odr_step_counter";
import OdrCertTypes from "../../components/tables/odr_cert_types";
import OdrRequestForm from "./odr_reqest_form";
import OdrSignaturePad from "../../components/common/odr_signature_pad";
import requestService from "../../services/requestService";
import {
  FaRegClock,
  FaRegBell,
  FaArrowAltCircleRight,
  FaArrowAltCircleLeft,
  FaHeadset,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

// Reusable inline field error
const FieldError = ({ message }) =>
  message ? (
    <p className="flex items-center gap-1 text-red-500 text-xs mt-1 animate-[fadeIn_0.2s_ease-in]">
      <FaExclamationCircle className="shrink-0" />
      {message}
    </p>
  ) : null;

const officeToCampusMap = {
  pablo_borbon: "Pablo Borbon",
  alangilan: "Alangilan",
  balayan: "Balayan",
  lemery: "Lemery",
  lipa: "Lipa",
  rosario: "Rosario",
  san_juan: "San Juan",
  arasof_nasugbu: "ARASOF",
  jplpc_malvar: "JPLPC",
};

const OdrNewRequest = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOffice, setSelectedOffice] = useState("");
  const [signatureData, setSignatureData] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedCertType, setSelectedCertType] = useState(null);
  const [selectedUnitCost, setSelectedUnitCost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [savedFormData, setSavedFormData] = useState(null);
  const formRef = useRef(null);
  const signatureRef = useRef(null);
  const [programs, setPrograms] = useState([]);

  // Step 1 field errors (office + certType; form fields handled inside OdrRequestForm)
  const [step1Errors, setStep1Errors] = useState({ office: "", certType: "" });

  // Step 2 field errors
  const [step2Errors, setStep2Errors] = useState({
    signature: "",
    confirmed: "",
  });

  const steps = [
    { number: null, label: "Welcome" },
    { number: 1, label: "Request Details" },
    { number: 2, label: "Submit" },
  ];

  const parseUnitCost = (value) => {
    if (!value) return null;
    const cleaned = value.replace(/,/g, "");
    const match = cleaned.match(/[0-9]+(\.[0-9]+)?/);
    if (!match) return null;
    const numberValue = Number.parseFloat(match[0]);
    return Number.isNaN(numberValue) ? null : numberValue;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate office + certType inline
      const errors = { office: "", certType: "" };
      let hasTopError = false;

      if (!selectedOffice) {
        errors.office = "Please select an office to continue.";
        hasTopError = true;
      }
      if (!selectedCertType) {
        errors.certType = "Please select a certificate type to continue.";
        hasTopError = true;
      }

      setStep1Errors(errors);

      // Validate the form fields (triggers visual errors inside OdrRequestForm)
      try {
        const formData = formRef.current?.getFormData();
        if (hasTopError) return;
        setSavedFormData(formData);
      } catch (err) {
        // OdrRequestForm already highlights its own fields;
        // show a brief banner to guide the user
        setError(err.message);
        return;
      }

      if (hasTopError) return;
    }

    setError(null);
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setError(null);
      setStep1Errors({ office: "", certType: "" });
      setStep2Errors({ signature: "", confirmed: "" });
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate step 2 fields visually
    const s2 = { signature: "", confirmed: "" };
    let s2Valid = true;

    if (!signatureData) {
      s2.signature = "Please draw your signature before submitting.";
      s2Valid = false;
    }
    if (!isConfirmed) {
      s2.confirmed = "You must confirm the accuracy of your information.";
      s2Valid = false;
    }

    setStep2Errors(s2);
    if (!s2Valid) return;

    setError(null);

    if (!savedFormData) {
      setError("Form data is missing. Please go back and fill the form.");
      return;
    }

    try {
      setLoading(true);
      const parsedCost = parseUnitCost(selectedUnitCost);

      if (parsedCost === null) {
        setError("Please select a document type so the unit cost can be computed.");
        setLoading(false);
        return;
      }

      const requestData = {
        certificate_type_id: selectedCertType.id,
        requestor_name: savedFormData.name,
        requestor_address: savedFormData.currentAddress,
        requestor_relationship: savedFormData.relationshipToStudent,
        requestor_contact: savedFormData.contactNumber,
        requestor_email: savedFormData.emailAddress,
        purpose: savedFormData.purposeOfRequest,
        sr_code: savedFormData.srcCode || null,
        student_name: savedFormData.fullname,
        program: savedFormData.program,
        major: savedFormData.major || null,
        year_graduated: savedFormData.yearGraduated || null,
        signature_data: signatureData.split(",")[1],
        request_cost: parsedCost,
      };

      const response = await requestService.createRequest(requestData);

      setSuccess(response);
      setCurrentStep(0);
      setSelectedOffice("");
      setSelectedCertType(null);
      setSelectedUnitCost(null);
      setSavedFormData(null);
      setSignatureData(null);
      setIsConfirmed(false);
      setStep1Errors({ office: "", certType: "" });
      setStep2Errors({ signature: "", confirmed: "" });
      if (signatureRef.current?.clear) signatureRef.current.clear();
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Failed to submit request. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer); // cleanup if component unmounts early
    }
  }, [success]);

  useEffect(() => {
    if (!selectedOffice) {
      setPrograms([]);
      return;
    }

    setPrograms([]);

    const fetchPrograms = async () => {
      try {
        const campusName = officeToCampusMap[selectedOffice];
        if (!campusName) {
          setPrograms([]);
          return;
        }

        const data = await requestService.getPrograms(campusName);
        setPrograms(data);
      } catch (err) {
        console.error(err);
        setPrograms([]);
      }
    };

    fetchPrograms();
  }, [selectedOffice]);

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="m-2 sm:m-5">
        <OdrStepCounter steps={steps} currentStep={currentStep} />

        {/* Global error banner */}
        {error && (
          <div className="m-2 sm:m-5 -translate-y-8 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-md flex items-start gap-2 text-sm sm:text-base">
            <FaExclamationCircle className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className="m-2 sm:m-5 text-center -translate-y-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm sm:text-base">
            <p className="font-semibold">Request submitted successfully!</p>

            <p className="mt-1 text-sm">
              Check your email for tracking details.
            </p>
          </div>
        )}

        {/* ── STEP 0: Welcome ─────────────────────────────────── */}
        {currentStep === 0 && (
          <>
            <div className="border border-gray-400 m-2 sm:m-5 p-3 rounded-md -translate-y-6">
              <p className="flex items-center gap-2 text-base sm:text-xl p-2 font-medium">
                <FaRegClock className="text-2xl" />
                Office Hours
              </p>
              <hr />
              <p className="text-base sm:text-xl text-[#dc3545] mt-3 ml-3 sm:ml-5">
                Monday to Friday
              </p>
              <p className="text-base sm:text-xl text-[#dc3545] ml-3 sm:ml-5">
                8:00 AM to 5:00 PM
              </p>
              <p className="ml-3 sm:ml-5 text-xs text-gray-600">
                * Note: Document request is open only during office hours
              </p>
            </div>

            {/* Reminders */}
            <div className="border border-gray-400 m-2 sm:m-5 p-3 rounded-md -translate-y-4 sm:-translate-y-2">
              <p className="flex items-center gap-2 text-base sm:text-xl p-2 font-medium">
                <FaRegBell className="text-2xl" />
                Reminders
              </p>
              <hr />
              <ul>
                <li className="mt-3 ml-6 sm:ml-16 text-sm sm:text-lg list-disc">
                  In claiming a document through a representative, Authorization
                  letter and valid IDs of Claimants and Requestor are required.
                </li>
                <li className="ml-6 sm:ml-16 text-sm sm:text-lg list-disc">
                  Please bring 2 Documentary Stamps for each copy of requested
                  documents EXCEPT for authentication.
                </li>
                <li className="ml-6 sm:ml-16 text-sm sm:text-lg list-disc">
                  For graduates of 2005 or earlier, submit PSA birth
                  certificate.
                </li>
                <li className="ml-6 sm:ml-16 text-sm sm:text-lg list-disc">
                  If requesting for Honorable Dismissal / Transfer Credentials,
                  please submit an original copy of Form 137 (for basic
                  education) or Transcript of Records (for colleges/GS) from the
                  previous school.
                </li>
                <li className="ml-6 sm:ml-16 text-sm sm:text-lg list-disc">
                  Certification, Authentications and Verification (CAV)
                  Requirements:
                </li>
              </ul>
              <div className="border border-gray-400 m-2 sm:m-5 my-2 p-3 rounded-md">
                <ul
                  style={{
                    listStyleType: "circle",
                    paddingLeft: "20px",
                    marginBottom: "8px",
                  }}
                  className="ml-2 sm:ml-14 text-sm sm:text-base"
                >
                  <li>
                    For Employment / Red Ribbon
                    <ul
                      style={{
                        listStyleType: "square",
                        paddingLeft: "30px",
                        marginTop: "4px",
                      }}
                    >
                      <li className="text-xs sm:text-sm">
                        Original TOR with general/employment purposes
                      </li>
                      <li className="text-xs sm:text-sm">Original Diploma</li>
                    </ul>
                  </li>
                  <li>
                    For Graduate School - Not Graduated
                    <ul
                      style={{
                        listStyleType: "square",
                        paddingLeft: "30px",
                        marginTop: "4px",
                      }}
                    >
                      <li className="text-xs sm:text-sm">
                        Original TOR with general/employment purposes
                      </li>
                    </ul>
                  </li>
                  <li>
                    For Board Examination - BS Criminology and BS Psychology
                    <ul
                      style={{
                        listStyleType: "square",
                        paddingLeft: "30px",
                        marginTop: "4px",
                      }}
                    >
                      <li className="text-xs sm:text-sm">
                        Original TOR with Board Exam purposes
                      </li>
                      <li className="text-xs sm:text-sm">Original Diploma</li>
                    </ul>
                  </li>
                </ul>
              </div>
              <ul>
                <li className="ml-6 sm:ml-16 text-sm sm:text-lg list-disc mt-3 sm:-mt-3">
                  Authentication Requirements:
                </li>
              </ul>
              <div className="border border-gray-400 m-2 sm:m-5 p-3 rounded-md mt-2 mb-0">
                <ul
                  style={{
                    listStyleType: "circle",
                    paddingLeft: "20px",
                    marginBottom: "8px",
                  }}
                  className="ml-2 sm:ml-14 text-sm sm:text-base"
                >
                  <li>
                    For Employment Purposes
                    <ul
                      style={{
                        listStyleType: "square",
                        paddingLeft: "30px",
                        marginTop: "4px",
                      }}
                    >
                      <li className="text-xs sm:text-sm">
                        Original TOR with general/employment purposes
                      </li>
                      <li className="text-xs sm:text-sm">Original Diploma</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Numbers */}
            <div className="border border-gray-400 m-2 sm:m-5 p-3 rounded-md -translate-y-2 sm:translate-y-2 mb-5">
              <p className="flex items-center gap-2 text-base sm:text-xl p-2 font-medium">
                <FaHeadset className="text-2xl" />
                Contact Numbers
              </p>
              <hr />
              <p className="font-medium mt-3 text-center text-sm sm:text-base">
                REGISTRATION SERVICES
              </p>
              {[
                [
                  "BatStateU Pablo Borbon",
                  "(043) 779-8400 or 425-7160 local 1933",
                ],
                ["BatStateU Alangilan", "(043) 425-0139 local 2149"],
                ["BatStateU Balayan", "(043) 425-7158 local 6102"],
                ["BatStateU Lemery", "(043) 779-8400 or 425-7160 local 5101"],
                ["BatStateU Lipa", "(043) 980-0387 local 3103"],
                ["BatStateU Rosario", "(043) 980-0387 local 4205"],
                ["BatStateU San Juan", "(043) 779-8400 or 425-7160 local 4101"],
                ["BatStateU ARASOF-Nasugbu", "(043) 416-0349 local 114"],
                ["BatStateU JPLPC-Malvar", "(043) 778-2170 local 110"],
              ].map(([campus, number]) => (
                <div
                  key={campus}
                  className="ml-2 sm:ml-32 flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base"
                >
                  <span className="flex-1 font-medium sm:font-normal">
                    {campus}
                  </span>
                  <span className="text-xs sm:text-base">{number}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STEP 1: Request Details ──────────────────────────── */}
        {currentStep === 1 && (
          <>
            <div className="m-5 -translate-y-8">
              <h1 className="text-xl sm:text-2xl text-gray-600">
                Step 1: REQUEST DETAILS
              </h1>

              {/* Office selector with inline validation */}
              <div className="mt-3">
                <label
                  htmlFor="office"
                  className="block mb-1 text-sm font-medium text-gray-700"
                >
                  Office <span className="text-red-500">*</span>
                </label>
                <select
                  name="office"
                  id="office"
                  value={selectedOffice}
                  onChange={(e) => {
                    setSelectedOffice(e.target.value);
                    if (step1Errors.office)
                      setStep1Errors((p) => ({ ...p, office: "" }));
                  }}
                  className={`border p-2 rounded-md w-full transition-colors ${
                    step1Errors.office
                      ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300"
                      : "border-gray-600"
                  }`}
                >
                  <option value="">-- Select Office --</option>
                  <option value="pablo_borbon">
                    Registration Services - Pablo Borbon
                  </option>
                  <option value="alangilan">
                    Registration Services - Alangilan
                  </option>
                  <option value="balayan">
                    Registration Services - Balayan
                  </option>
                  <option value="lemery">Registration Services - Lemery</option>
                  <option value="lipa">Registration Services - Lipa</option>
                  <option value="rosario">
                    Registration Services - Rosario
                  </option>
                  <option value="san_juan">
                    Registration Services - San Juan
                  </option>
                  <option value="arasof_nasugbu">
                    Registration Services - ARASOF-Nasugbu
                  </option>
                  <option value="jplpc_malvar">
                    Registration Services - JPLPC-Malvar
                  </option>
                </select>
                <FieldError message={step1Errors.office} />
              </div>
            </div>

            {/* Certificate type with inline validation */}
            <div className="m-5 -translate-y-8">
              <h2 className="ml-0 sm:ml-5 text-sm sm:text-lg mt-3">
                * Choose the document/s to be requested and enter the number of
                copies you intend to have.
              </h2>
              <div
                className={`transition-all rounded-md ${step1Errors.certType ? "ring-2 ring-red-400 p-1" : ""}`}
              >
                <OdrCertTypes
                  selectedOffice={selectedOffice}
                  onCertTypeSelect={(val) => {
                    setSelectedCertType(val);
                    if (step1Errors.certType)
                      setStep1Errors((p) => ({ ...p, certType: "" }));
                  }}
                  selectedCertType={selectedCertType}
                  onUnitCostSelect={setSelectedUnitCost}
                />
              </div>
              <FieldError message={step1Errors.certType} />
            </div>

            <div className="w-full m-2 sm:m-5 -translate-y-8">
              <OdrRequestForm
                ref={formRef}
                programs={programs}
                selectedOffice={selectedOffice}
              />
            </div>
            <hr className="m-2 sm:m-5 -translate-y-10" />
          </>
        )}

        {/* ── STEP 2: Submit ───────────────────────────────────── */}
        {currentStep === 2 && (
          <>
            <div className="m-2 sm:m-5 -translate-y-8">
              <h1 className="text-xl sm:text-2xl text-gray-600">
                Step 2: SUBMIT
              </h1>

              <div>
                {/* Signature pad with validation highlight */}
                <p className="text-center mt-10 font-medium text-sm sm:text-base">
                  Draw your signature below{" "}
                  <span className="text-red-500">*</span>
                </p>

                <div
                  className={`transition-all rounded-md ${step2Errors.signature ? "ring-2 ring-red-400" : ""}`}
                >
                  <OdrSignaturePad
                    ref={signatureRef}
                    onSignatureChange={(data) => {
                      setSignatureData(data);
                      if (data && step2Errors.signature)
                        setStep2Errors((p) => ({ ...p, signature: "" }));
                    }}
                  />
                </div>
                <div className="flex justify-center mt-1">
                  <FieldError message={step2Errors.signature} />
                </div>

                {/* Confirmation checkbox with validation highlight */}
                <div className="flex flex-col items-center justify-center gap-1 mt-10 translate-y-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="confirmAccuracy"
                      checked={isConfirmed}
                      onChange={(e) => {
                        setIsConfirmed(e.target.checked);
                        if (e.target.checked && step2Errors.confirmed)
                          setStep2Errors((p) => ({ ...p, confirmed: "" }));
                      }}
                      className="w-4 h-4 cursor-pointer accent-teal-600"
                    />
                    <label
                      htmlFor="confirmAccuracy"
                      className={`cursor-pointer font-medium text-xs sm:text-base transition-colors ${
                        step2Errors.confirmed
                          ? "text-red-500"
                          : isConfirmed
                            ? "text-black"
                            : "text-gray-700"
                      }`}
                    >
                      I hereby confirm that the information provided herein is
                      accurate.
                    </label>
                  </div>
                  <FieldError message={step2Errors.confirmed} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Navigation Buttons ───────────────────────────────── */}
        <div className="flex justify-between m-2 sm:m-5 mb-5">
          {currentStep > 0 && (
            <button
              onClick={handlePrevious}
              disabled={loading}
              className="bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-900 hover:text-gray-300 px-3 sm:px-6 py-2 rounded-full flex items-center gap-1 sm:gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaArrowAltCircleLeft className="text-base sm:text-xl" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>
          )}

          <button
            onClick={
              currentStep === steps.length - 1 ? handleSubmit : handleNext
            }
            disabled={loading}
            className={`px-3 sm:px-6 py-2 rounded-full flex items-center gap-1 sm:gap-2 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-900 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              currentStep === 0 ? "ml-auto" : ""
            }`}
          >
            {currentStep === steps.length - 1
              ? loading
                ? "Submitting..."
                : "Submit"
              : "Next"}
            {currentStep === steps.length - 1 ? (
              <FaCheckCircle className="text-base sm:text-xl" />
            ) : (
              <FaArrowAltCircleRight className="text-base sm:text-xl" />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default OdrNewRequest;
