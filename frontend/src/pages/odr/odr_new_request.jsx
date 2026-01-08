import React, { useState } from "react";
import OdrStepCounter from "../../components/common/odr_step_counter";
import OdrCertTypes from "../../components/tables/odr_cert_types";
import OdrRequestForm from "./odr_reqest_form";
import OdrSignaturePad from "../../components/common/odr_signature_pad";
import {
  FaRegClock,
  FaRegBell,
  FaArrowAltCircleRight,
  FaArrowAltCircleLeft,
  FaHeadset,
} from "react-icons/fa";

const OdrNewRequest = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOffice, setSelectedOffice] = useState("");
  const [signatureData, setSignatureData] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const steps = [
    { number: null, label: "Welcome" },
    { number: 1, label: "Request Details" },
    { number: 2, label: "Submit" },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      <OdrStepCounter steps={steps} currentStep={currentStep} />
      {currentStep === 0 && (
        <>
          <div className="border border-gray-400 m-5 p-3 rounded-md -translate-y-8">
            <p className="flex items-center gap-2 text-xl p-2  font-medium">
              <FaRegClock className=" text-2xl" />
              Office Hours
            </p>
            <hr />
            <p className="text-xl text-[#dc3545] mt-3 ml-5">Monday to Friday</p>
            <p className="text-xl text-[#dc3545] ml-5">8:00 AM to 5:00 PM</p>
            <p className="ml-5 text-xs text-gray-600">
              * Note: Document request is open only during office hours
            </p>
          </div>

          {/* Reminders */}
          <div className="border border-gray-400 m-5 p-3 rounded-md -translate-y-16">
            <p className="flex items-center gap-2 text-xl p-2 font-medium">
              <FaRegBell className=" text-2xl" />
              Reminders
            </p>
            <hr />
            <ul>
              <li className="mt-3 ml-16 text-lg list-disc">
                In claiming a document through a representative, Authorization
                letter and valid IDs of Claimants and Requestor are required.
              </li>
              <li className="ml-16 text-lg list-disc">
                Please bring 2 Documentary Stamps for each copy of requested
                documents EXCEPT for authentication.
              </li>
              <li className="ml-16 text-lg list-disc">
                For graduates of 2005 or earlier, submit PSA birth certificate.
              </li>
              <li className="ml-16 text-lg list-disc">
                If requesting for Honorable Dismissal / Transfer Credentials,
                please submit an original copy of Form 137 (for basic education)
                or Transcript of Records (for colleges/GS) from the previous
                school.
              </li>
              <li className="ml-16 text-lg list-disc">
                Certification, Authentications and Verification (CAV)
                Requirements:
              </li>
            </ul>
            <div className="border border-gray-400 m-5 p-3 rounded-md mt-2">
              <ul
                style={{
                  listStyleType: "circle",
                  paddingLeft: "20px",
                  marginBottom: "8px",
                }}
                className="ml-14"
              >
                <li>
                  For Employment / Red Ribbon
                  <ul
                    style={{
                      listStyleType: "square",
                      paddingLeft: "50px",
                      marginTop: "4px",
                    }}
                  >
                    <li>Original TOR with general/employment purposes</li>
                    <li>Original Diploma</li>
                  </ul>
                </li>

                <li>
                  For Graduate School - Not Graduated
                  <ul
                    style={{
                      listStyleType: "square",
                      paddingLeft: "50px",
                      marginTop: "4px",
                    }}
                  >
                    <li>Original TOR with general/employment purposes</li>
                  </ul>
                </li>

                <li>
                  For Board Examination - BS Criminology and BS Psychology
                  <ul
                    style={{
                      listStyleType: "square",
                      paddingLeft: "50px",
                      marginTop: "4px",
                    }}
                  >
                    <li>Original TOR with Board Exam purposes</li>
                    <li>Original Diploma</li>
                  </ul>
                </li>
              </ul>
            </div>
            <ul>
              <li className="ml-16 text-lg list-disc -mt-10">
                Authentication Requirements:
              </li>
            </ul>
            <div className="border border-gray-400 m-5 p-3 rounded-md mt-2 mb-0">
              <ul
                style={{
                  listStyleType: "circle",
                  paddingLeft: "20px",
                  marginBottom: "8px",
                }}
                className="ml-14"
              >
                <li>
                  For Employment Purposes
                  <ul
                    style={{
                      listStyleType: "square",
                      paddingLeft: "50px",
                      marginTop: "4px",
                    }}
                  >
                    <li>Original TOR with general/employment purposes</li>
                    <li>Original Diploma</li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="border border-gray-400 m-5 p-3 rounded-md -translate-y-24">
            <p className="flex items-center gap-2 text-xl p-2 font-medium">
              <FaHeadset className=" text-2xl" />
              Contact Numbers
            </p>
            <hr />
            <p className="font-medium mt-3 text-center">
              REGISTRATION SERVICES
            </p>
            <div className="ml-32 mt-3 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU Pablo Borbon</span>
              <span>(043) 779-8400 or 425-7160 local 1933</span>
            </div>

            <div className="ml-32 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU Alangilan</span>
              <span>(043) 425-0139 local 2149</span>
            </div>

            <div className="ml-32 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU Balayan</span>
              <span>(043) 425-7158 local 6102</span>
            </div>

            <div className="ml-32 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU Lemery</span>
              <span>(043) 779-8400 or 425-7160 local 5101</span>
            </div>

            <div className="ml-32 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU Lipa</span>
              <span>(043) 980-0387 local 3103</span>
            </div>

            <div className="ml-32 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU Rosario</span>
              <span>(043) 980-0387 local 4205</span>
            </div>

            <div className="ml-32 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU San Juan</span>
              <span>(043) 779-8400 or 425-7160 local 4101</span>
            </div>

            <div className="ml-32 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU ARASOF-Nasugbu</span>
              <span>(043) 416-0349 local 114</span>
            </div>

            <div className="ml-32 flex mr-48 items-center py-1">
              <span className="flex-1">BatStateU JPLPC-Malvar</span>
              <span>(043) 778-2170 local 110</span>
            </div>
          </div>
        </>
      )}
      {currentStep === 1 && (
        <>
          <div className="m-5 -translate-y-8">
            <h1 className="text-2xl text-gray-600">Step 1: REQUEST DETAILS</h1>
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
              <option value="san_juan">Registration Services - San Juan</option>
              <option value="arasof_nasugbu">
                Registration Services - ARASOF-Nasugbu
              </option>
              <option value="jplpc_malvar">
                Registration Services - JPLPC-Malvar
              </option>
            </select>
          </div>
          <div className="m-5 -translate-y-8">
            <h2 className="ml-5 text-lg">
              * Choose the document/s to be requested and enter the number of
              copies you intend to have.
            </h2>
            <OdrCertTypes selectedOffice={selectedOffice} />
          </div>
          <div className="w-full m-5 -translate-y-8">
            <OdrRequestForm />
          </div>
          <hr className="m-5 -translate-y-10" />
        </>
      )}
      {currentStep === 2 && (
        <>
          <div className="m-5 -translate-y-8">
            <h1 className="text-2xl text-gray-600">Step 2: SUBMIT</h1>
            <div>
              <p className="text-center mt-10 font-medium">
                Draw your signature below
              </p>
              <OdrSignaturePad />
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
                  className={`cursor-pointer font-medium ${
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
      <div className="flex justify-between m-5">
        {currentStep > 0 && (
          <button
            onClick={handlePrevious}
            className="bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-900 hover:text-gray-300 px-6 py-2 rounded-full flex items-center gap-2"
          >
            <FaArrowAltCircleLeft /> Previous
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={currentStep === steps.length - 1}
          className={`px-6 py-2 rounded-full flex items-center gap-2 ${
            currentStep === steps.length - 1
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-900 hover:text-gray-300"
          } ${currentStep === 0 ? "ml-auto" : ""}`}
        >
          {currentStep === steps.length - 1 ? "Submit" : "Next"}
          <FaArrowAltCircleRight />
        </button>
      </div>
    </>
  );
};

export default OdrNewRequest;
