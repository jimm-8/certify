import React from "react";
import ODR from "../../assets/odr.png";
import OdrTabs from "../../components/common/odr_tabs";

const OdrRequests = () => {
  return (
    <div className="bg-[#eeee] w-screen h-screen flex justify-center p-10">
      <div className="flex flex-col items-center">
        <img
          src={ODR}
          alt="ODR"
          className="w-2/3 h-auto block shadow-md shadow-black/20"
        />
        <div className="w-2/3 h-full bg-white p-1 py-3">
          <OdrTabs />
        </div>
      </div>
    </div>
  );
};

export default OdrRequests;
