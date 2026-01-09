import React, { useState, useRef } from "react";
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
} from "react-icons/fa";

const OdrNewRequest = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOffice, setSelectedOffice] = useState("");
  const [signatureData, setSignatureData] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedCertType, setSelectedCertType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [savedFormData, setSavedFormData] = useState(null);
  const formRef = useRef(null);
  const signatureRef = useRef(null);

  const steps = [
    { number: null, label: "Welcome" },
    { number: 1, label: "Request Details" },
    { number: 2, label: "Submit" },
  ];

  const handleNext = () => {
    if (currentStep === 1) {
      if (!selectedOffice) {
        setError("Please select an office");
        return;
      }
      if (!selectedCertType) {
        setError("Please select a certificate type");
        return;
      }

      try {
        const formData = formRef.current?.getFormData();
        setSavedFormData(formData);
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    setError(null);
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setError(null);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!selectedCertType || !selectedCertType.id) {
      setError("Please select a certificate type from the dropdown");
      return;
    }

    if (!isConfirmed) {
      setError("Please confirm that all information is correct");
      return;
    }

    if (!signatureData) {
      setError("Please draw your signature");
      return;
    }

    if (!savedFormData) {
      setError("Form data is missing. Please go back and fill the form.");
      return;
    }

    try {
      setLoading(true);

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
        signature_data: signatureData,
      };

      const response = await requestService.createRequest(requestData);

      setSuccess(response);
      setCurrentStep(0);
      setSelectedOffice("");
      setSelectedCertType(null);
      setSavedFormData(null);
      setSignatureData(null);
      setIsConfirmed(false);
      if (signatureRef.current?.clear) {
        signatureRef.current.clear();
      }
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

  return (
    <>
      <div className="m-2 sm:m-5">
        <OdrStepCounter steps={steps} currentStep={currentStep} />

        {error && (
          <div className="m-2 sm:m-5 -translate-y-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm sm:text-base">
            {error}
          </div>
        )}

        {success && (
          <div className="m-2 sm:m-5 -translate-y-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm sm:text-base">
            <p className="font-semibold">Request submitted successfully!</p>
            <p className="mt-2">
              Reference Number:{" "}
              <span className="font-mono font-bold">
                {success.reference_number}
              </span>
            </p>
            <p>
              PIN: <span className="font-mono font-bold">{success.pin}</span>
            </p>
            <p className="mt-2 text-sm">
              Check your email for tracking details.
            </p>
          </div>
        )}

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
              <div className="ml-2 sm:ml-32 mt-3 flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU Pablo Borbon
                </span>
                <span className="text-xs sm:text-base">
                  (043) 779-8400 or 425-7160 local 1933
                </span>
              </div>

              <div className="ml-2 sm:ml-32  flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU Alangilan
                </span>
                <span className="text-xs sm:text-base">
                  (043) 425-0139 local 2149
                </span>
              </div>

              <div className="ml-2 sm:ml-32  flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU Balayan
                </span>
                <span className="text-xs sm:text-base">
                  (043) 425-7158 local 6102
                </span>
              </div>

              <div className="ml-2 sm:ml-32  flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU Lemery
                </span>
                <span className="text-xs sm:text-base">
                  (043) 779-8400 or 425-7160 local 5101
                </span>
              </div>

              <div className="ml-2 sm:ml-32  flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU Lipa
                </span>
                <span className="text-xs sm:text-base">
                  (043) 980-0387 local 3103
                </span>
              </div>

              <div className="ml-2 sm:ml-32  flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU Rosario
                </span>
                <span className="text-xs sm:text-base">
                  (043) 980-0387 local 4205
                </span>
              </div>

              <div className="ml-2 sm:ml-32  flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU San Juan
                </span>
                <span className="text-xs sm:text-base">
                  (043) 779-8400 or 425-7160 local 4101
                </span>
              </div>

              <div className="ml-2 sm:ml-32  flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU ARASOF-Nasugbu
                </span>
                <span className="text-xs sm:text-base">
                  (043) 416-0349 local 114
                </span>
              </div>

              <div className="ml-2 sm:ml-32  flex mr-2 sm:mr-48 items-center py-1 flex-col sm:flex-row gap-1 sm:gap-0 text-sm sm:text-base">
                <span className="flex-1 font-medium sm:font-normal">
                  BatStateU JPLPC-Malvar
                </span>
                <span className="text-xs sm:text-base">
                  (043) 778-2170 local 110
                </span>
              </div>
            </div>
          </>
        )}

        {currentStep === 1 && (
          <>
            <div className="m-2 sm:m-5 -translate-y-8">
              <h1 className="text-xl sm:text-2xl text-gray-600">
                Step 1: REQUEST DETAILS
              </h1>
              <p className="mt-3">Office</p>
              <select
                name="office"
                id="office"
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className="border border-gray-600 p-2 rounded-md w-full"
              >
                <option value="">-- Select Office --</option>
                <option value="pablo_borbon">
                  Registration Services - Pablo Borbon
                </option>
                <option value="alangilan">
                  Registration Services - Alangilan
                </option>
                <option value="balayan">Registration Services - Balayan</option>
                <option value="lemery">Registration Services - Lemery</option>
                <option value="lipa">Registration Services - Lipa</option>
                <option value="rosario">Registration Services - Rosario</option>
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
            </div>
            <div className="m-2 sm:m-5 -translate-y-8">
              <h2 className="ml-0 sm:ml-5 text-sm sm:text-lg mt-3">
                * Choose the document/s to be requested and enter the number of
                copies you intend to have.
              </h2>
              <OdrCertTypes
                selectedOffice={selectedOffice}
                onCertTypeSelect={setSelectedCertType}
                selectedCertType={selectedCertType}
              />
            </div>
            <div className="w-full m-2 sm:m-5 -translate-y-8">
              <OdrRequestForm ref={formRef} />
            </div>
            <hr className="m-2 sm:m-5 -translate-y-10" />
          </>
        )}

        {currentStep === 2 && (
          <>
            <div className="m-2 sm:m-5 -translate-y-8">
              <h1 className="text-xl sm:text-2xl text-gray-600">
                Step 2: SUBMIT
              </h1>
              <div>
                <p className="text-center mt-10 font-medium text-sm sm:text-base">
                  Draw your signature below
                </p>
                <OdrSignaturePad
                  ref={signatureRef}
                  onSignatureChange={(data) => setSignatureData(data)}
                />
                <div className="flex items-center justify-center gap-2 mt-10 translate-y-6">
                  <input
                    type="checkbox"
                    id="confirmAccuracy"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label
                    htmlFor="confirmAccuracy"
                    className={`cursor-pointer font-medium text-xs sm:text-base ${
                      isConfirmed ? "text-black" : "text-red-500"
                    }`}
                  >
                    I hereby confirm that the information provided herein is
                    accurate.
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Nav Buttons */}
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
            disabled={
              currentStep === steps.length - 1
                ? loading || !isConfirmed || !signatureData
                : loading
            }
            className={`px-3 sm:px-6 py-2 rounded-full flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
              currentStep === steps.length - 1
                ? loading || !isConfirmed || !signatureData
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-900 hover:text-gray-300"
                : "bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-900 hover:text-gray-300"
            } ${currentStep === 0 ? "ml-auto" : ""}`}
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
