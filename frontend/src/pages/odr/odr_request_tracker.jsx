import React from "react";
import Tabs from "react-bootstrap/Tabs";
import {
  FaRegFile,
  FaSearch,
  FaRegClock,
  FaRegEnvelope,
  FaBullhorn,
  FaInfoCircle,
} from "react-icons/fa";
import CARDBG from "../../assets/card_bg.png";

const OdrRequestTracker = () => {
  return (
    <>
      <div className="grid grid-cols-3 gap-3 p-1">
        {/* office hours */}
        <div
          style={{ backgroundImage: `url(${CARDBG})` }}
          className="border border-gray-400 rounded-md p-3 h-[260px] bg-contain bg-bottom bg-no-repeat"
        >
          <p className="flex items-center gap-2 text-xl p-2 text-gray-500 font-medium">
            <FaRegClock className="text-gray-500" />
            Office Hours
          </p>
          <hr />
          <p className="text-lg mt-3 ml-5">Monday to Friday</p>
          <p className="text-lg ml-5">8:00 AM to 5:00 PM</p>
        </div>

        {/* contact us */}
        <div
          style={{ backgroundImage: `url(${CARDBG})` }}
          className="border border-gray-400 rounded-md p-3  bg-contain bg-bottom bg-no-repeat"
        >
          <p className="flex items-center gap-2 text-xl p-2 text-gray-500 font-medium">
            <FaRegEnvelope className="text-gray-500" />
            Contact Us
          </p>
          <hr />
          <p className="text-sm ml-5 mt-3">
            <a
              href="mailto:registrar.pb@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.pb@g.batstate-u.edu.ph
            </a>
          </p>

          <p className="text-sm ml-5">
            <a
              href="mailto:registrar.alangilan@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.alangilan@g.batstate-u.edu.ph
            </a>
          </p>

          <p className="text-sm ml-5">
            <a
              href="mailto:registrar.lipa@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.lipa@g.batstate-u.edu.ph
            </a>
          </p>

          <p className="text-sm ml-5">
            <a
              href="mailto:registrar.nasugbu@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.nasugbu@g.batstate-u.edu.ph
            </a>
          </p>

          <p className="text-sm ml-5">
            <a
              href="mailto:registrar.malvar@g.batstate-u.edu.ph"
              className="hover:underline"
            >
              registrar.malvar@g.batstate-u.edu.ph
            </a>
          </p>
        </div>

        {/* advisory */}
        <div
          style={{ backgroundImage: `url(${CARDBG})` }}
          className="border border-gray-400 rounded-md p-3  bg-contain bg-bottom bg-no-repeat"
        >
          <p className="flex items-center gap-2 text-xl p-2 text-gray-500 font-medium">
            <FaBullhorn className="text-gray-500" />
            Advisory
          </p>
          <hr />
          <p className="text-sm mt-3">
            Your document request PIN (4 digit) together with the REFERENCE NO.
            is now required for tracking. You can find the PIN on the
            confirmation email sent to you. You can ask the assistance of the
            Registration Services office if you accidentally deleted the email.
          </p>
        </div>
      </div>
      <div className="max-w-full border-[#17a2b8] border-2 rounded-md bg-[#d1ecf1] p-3 m-1">
        <p className="flex items-start text-[#0c5460] gap-2">
          <FaInfoCircle className="mt-1 text-xl" />
          <span>
            To track the status of your document request, please enter the{" "}
            <span className="font-bold">REFERENCE NUMBER</span> and{" "}
            <span className="font-bold">PIN</span> below.
          </span>
        </p>
      </div>

      <div className="flex  w-full max-w-full translate-y-4 p-1">
        <div className="flex items-center flex-1 border border-gray-900 rounded-md mb-10 bg-white">
          {/* Reference Number Section */}
          <div className="flex border-r border-gray-300">
            <label className="px-3 py-2 font-medium text-sm text-gray-600 bg-gray-100 border-r border-gray-300 whitespace-nowrap">
              Reference Number
            </label>
            <input
              type="text"
              placeholder="Reference No."
              className="px-3 py-2 text-sm outline-none w-[21.5rem]"
            />
          </div>

          {/* PIN Section */}
          <div className="flex items-center border-r border-gray-300">
            <label className="px-3 py-2 font-medium text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
              PIN
            </label>
            <input
              type="password"
              placeholder="4 digit PIN"
              maxLength={4}
              inputMode="numeric"
              className="px-3 py-2 text-sm outline-none w-[21.3rem]"
            />
          </div>

          {/* Track Button */}
          <button className="flex items-center font-medium gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            <FaSearch size={16} />
            Track
          </button>
        </div>
      </div>
    </>
  );
};

export default OdrRequestTracker;
