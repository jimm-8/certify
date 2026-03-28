import React, { useState } from "react";
import CertifyHeader from "../../components/common/certify_header";
import Dashboard from "./dashboard";
import CheckingOfRequest from "./checking";
import RequestTracker from "./tracker";
import Ready from "./ready";
import History from "./history";
import Payments from "./payments";

const tabComponents = [
  <Dashboard />,
  <CheckingOfRequest />,
  <RequestTracker />,
  <Ready />,
  <Payments />,
  <History />,
];

const CertifyPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <CertifyHeader onTabChange={(index) => setActiveTab(index)} />
      <div className="mx-4 mt-4">{tabComponents[activeTab]}</div>
    </div>
  );
};

export default CertifyPage;
