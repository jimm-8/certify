import Tab from "react-bootstrap/Tab";
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
import OdrRequestTracker from "../../pages/odr/odr_request_tracker";
import OdrNewRequest from "../../pages/odr/odr_new_request";

const OdrTabs = () => {
  const currentHour = new Date().getHours();
  const isOpenHours = currentHour >= 8 && currentHour < 24;

  return (
    <>
      <Tabs
        defaultActiveKey="new_request"
        id="uncontrolled-tab-example"
        className="mb-3"
      >
        <Tab
          eventKey="new_request"
          title={
            <span className="flex items-center text-[#28a745] gap-2 whitespace-nowrap">
              <FaRegFile /> New Request
            </span>
          }
        >
          <div>
            {isOpenHours ? (
              <>
                <OdrNewRequest />
              </>
            ) : (
              <>
                <div className=" bg-[#fff3cd] p-3 m-5 rounded-md border-2 border-[#ffeeba] flex justify-center items-center">
                  <h1 className="text-[#856404] text-4xl">CLOSED</h1>
                </div>
                <div className="border border-gray-400 m-5 p-3 rounded-md -translate-y-8">
                  <p className="flex items-center gap-2 text-xl p-2 text-gray-500 font-medium">
                    <FaRegClock className="text-gray-500 text-2xl" />
                    Office Hours
                  </p>
                  <hr />
                  <p className="text-xl mt-3 ml-5">Monday to Friday</p>
                  <p className="text-xl ml-5">8:00 AM to 5:00 PM</p>
                </div>
              </>
            )}
          </div>
        </Tab>

        <Tab
          eventKey="request_tracker"
          title={
            <span className="flex items-center text-[#17a2b8] gap-2 whitespace-nowrap">
              <FaSearch /> Request Tracker
            </span>
          }
        >
          <OdrRequestTracker />
        </Tab>
      </Tabs>
    </>
  );
};

export default OdrTabs;
