import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import { FaRegFile, FaSearch } from "react-icons/fa";

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
            <span className="flex items-center gap-2 whitespace-nowrap">
              <FaRegFile /> New Request
            </span>
          }
        >
          <p>Tab content for New Request</p>
        </Tab>

        <Tab
          eventKey="request_tracker"
          title={
            <span className="flex items-center gap-2 whitespace-nowrap">
              <FaSearch /> Request Tracker
            </span>
          }
        >
          <p>Tab content for Request Tracker</p>
        </Tab>
      </Tabs>
    </>
  );
};

export default OdrTabs;
