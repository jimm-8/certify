import React from "react";
import { useSearchParams } from "react-router-dom";
import CertifyHeader from "../../components/common/certify_header";
import Dashboard from "./dashboard";
import CheckingOfRequest from "./checking";
import RequestTracker from "./tracker";
import Ready from "./ready";
import History from "./history";

const tabs = [
  { key: "dashboard", component: <Dashboard /> },
  { key: "received", component: <CheckingOfRequest /> },
  { key: "processing", component: <RequestTracker /> },
  { key: "ready", component: <Ready /> },
  { key: "history", component: <History /> },
];

const CertifyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabKey = searchParams.get("tab") || "dashboard";
  const activeTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeTabKey),
  );

  const handleTabChange = (index) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabs[index].key);
    setSearchParams(nextParams);
  };

  return (
    <div>
      <CertifyHeader
        activeTab={activeTabIndex}
        onTabChange={handleTabChange}
      />
      <div className="mt-4">{tabs[activeTabIndex].component}</div>
    </div>
  );
};

export default CertifyPage;
