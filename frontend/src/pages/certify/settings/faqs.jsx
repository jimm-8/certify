import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";

const Faqs = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const navigate = useNavigate();

  const faqs = [
    {
      question: "How do I receive and verify incoming requests?",
      answer:
        "Open Requests and review the new entries for completeness. Verify student details, program, and requested certificate type before moving it to Processing.",
    },
    {
      question: "What is the expected processing turnaround?",
      answer:
        "Turnaround depends on volume and validation checks. Use the Reports page to monitor average processing time and daily request volume.",
    },
    {
      question: "Why is a request stuck in Pending or Processing?",
      answer:
        "It may need document verification, missing fields, or approval. Check request notes and the audit log for details before updating status.",
    },
    {
      question: "Can I download and release certificates in bulk?",
      answer:
        "Yes. In the Ready tab, use Bulk Download for PDF export and Bulk Release to update multiple requests at once.",
    },
    {
      question: "How do I verify a certificate before release?",
      answer:
        "Use the verification link or QR code attached to the certificate. Confirm it matches the requestor details before marking as Released.",
    },
    {
      question: "Who can access reports and analytics?",
      answer:
        "Access is role-based. Registrar staff and above can view reports depending on permissions configured by the system admin.",
    },
    {
      question: "How do I update my registrar profile details?",
      answer:
        "Open the avatar menu, choose Settings, and update your profile details. For now, changes are stored locally until backend syncing is enabled.",
    },
    {
      question: "What should I do if I forgot my password?",
      answer:
        "Password resets are handled by the system administrator. Please contact the registrar head or system admin.",
    },
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-white rounded-md border border-gray-200 shadow-sm px-2 py-2">
        <button
          onClick={() => navigate("/dashboard")}
          title="Back to Dashboard"
          className="text-lg font-bold  text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors  rounded"
        >
          <BsChevronLeft style={{ strokeWidth: "0.5" }} />
          <span>Frequently Asked Questions</span>
        </button>
        <p className="text-xs text-gray-500 ml-5">
          Find answers to common questions about certificate requests and system
          usage.
        </p>
      </div>

      <div className="bg-white rounded-md border border-gray-200 shadow-sm mb-4">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.question}
              className={`border-b border-gray-200 ${
                index === faqs.length - 1 ? "border-b-0" : ""
              }`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800">
                  {item.question}
                </span>
                <span className="text-xl text-gray-400">
                  {isOpen ? "–" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="px-6 pb-4 text-sm text-gray-600">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Faqs;
