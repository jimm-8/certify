import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import {
  FaRegFile,
  FaSearch,
} from "react-icons/fa";
import OdrRequestTracker from "../../pages/odr/odr_request_tracker";
import OdrNewRequest from "../../pages/odr/odr_new_request";

const OdrTabs = () => {
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
            <OdrNewRequest />
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
