import React from "react";
import ODR from "../../assets/odr.webp";
import OdrTabs from "../../components/common/odr_tabs";

const OdrRequests = () => {
  return (
    <div className="bg-[#eeee] min-h-screen w-full flex justify-center overflow-x-hidden">
      <div className="flex flex-col items-center">
        <img
          src={ODR}
          alt="ODR"
          loading="lazy"
          className="w-2/3 h-auto block shadow-lg shadow-black/80"
        />
        <div className="w-2/3 h-full bg-white p-1 py-3 shadow-lg shadow-black/80">
          <OdrTabs />
        </div>
      </div>
    </div>
  );
};

export default OdrRequests;
