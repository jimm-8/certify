import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CertifyHeader from "../../components/common/certify_header";
import Dashboard from "./dashboard";
import CheckingOfRequest from "./checking";
import RequestTracker from "./tracker";
import Ready from "./ready";
import History from "./history";
import requestService from "../../services/requestService";
import { filterCertifyEligibleRequests } from "../../utils/certifyRequestGuard";

const tabs = [
  { key: "dashboard", component: <Dashboard /> },
  { key: "received", component: <CheckingOfRequest /> },
  { key: "processing", component: <RequestTracker /> },
  { key: "ready", component: <Ready /> },
  { key: "history", component: <History /> },
];

const CertifyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabCounts, setTabCounts] = useState({
    received: 0,
    processing: 0,
    ready: 0,
    history: 0,
  });
  const lastSnapshotRef = useRef("");
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

  useEffect(() => {
    let mounted = true;

    const fetchTabCounts = async () => {
      try {
        const data = await requestService.getAllRequests({ page: 1, limit: 200 });
        const requests = filterCertifyEligibleRequests(
          Array.isArray(data) ? data : data.items || [],
        );
        const nextCounts = {
          received: requests.filter((r) => r.status === "APPROVED").length,
          processing: requests.filter((r) => r.status === "PROCESSING").length,
          ready: requests.filter((r) => r.status === "FOR_RELEASING").length,
          history: requests.filter((r) => r.status === "RELEASED").length,
        };

        const snapshot = JSON.stringify(nextCounts);
        if (mounted && snapshot !== lastSnapshotRef.current) {
          lastSnapshotRef.current = snapshot;
          setTabCounts(nextCounts);
        }
      } catch (error) {
        console.error("Failed to fetch certify tab counts:", error);
      }
    };

    fetchTabCounts();
    const intervalId = window.setInterval(fetchTabCounts, 5000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div>
      <CertifyHeader
        activeTab={activeTabIndex}
        onTabChange={handleTabChange}
        tabCounts={tabCounts}
      />
      <div className="mt-4">{tabs[activeTabIndex].component}</div>
    </div>
  );
};

export default CertifyPage;
