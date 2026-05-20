import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CertifyHeader from "../../components/common/certify_header";
import Dashboard from "./dashboard";
import CheckingOfRequest from "./checking";
import RequestTracker from "./tracker";
import Ready from "./ready";
import History from "./history";
import requestService from "../../services/requestService";
import paymentService from "../../services/paymentService";
import { filterCertifyEligibleRequests } from "../../utils/certifyRequestGuard";
import { getTokenPayload } from "../../utils/auth";

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
  const ownerUsername = getTokenPayload()?.sub || "";
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
    let intervalId;

    const fetchTabCounts = async () => {
      try {
        const [data, ownedData] = await Promise.all([
          requestService.getAllRequests({
            page: 1,
            limit: 100,
          }),
          requestService.getAllRequests({
            page: 1,
            limit: 100,
            ownerUsername,
          }),
        ]);

        const requests = filterCertifyEligibleRequests(
          Array.isArray(data) ? data : data.items || [],
        );
        const ownedRequests = filterCertifyEligibleRequests(
          Array.isArray(ownedData) ? ownedData : ownedData.items || [],
        );
        const forReleasingRequests = ownedRequests.filter(
          (r) => r.status === "FOR_RELEASING",
        );
        const readyRefs = forReleasingRequests
          .map((r) => r.reference_number)
          .filter(Boolean);
        const paymentInfo =
          readyRefs.length > 0
            ? await paymentService.getPaymentsByReferences(readyRefs)
            : { items: [] };
        const paidReadyRefs = new Set(
          (paymentInfo?.items || [])
            .filter(
              (item) =>
                String(item?.payment_status || "").toUpperCase() === "PAID",
            )
            .map((item) => item.reference_number),
        );

        const nextCounts = {
          received: ownedRequests.filter((r) => r.status === "PROCESSING")
            .length,
          processing: forReleasingRequests.filter(
            (r) => !paidReadyRefs.has(r.reference_number),
          ).length,
          ready: forReleasingRequests.filter((r) =>
            paidReadyRefs.has(r.reference_number),
          ).length,
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

    const timeoutId = setTimeout(() => {
      fetchTabCounts();
      intervalId = setInterval(fetchTabCounts, 5000);
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [ownerUsername]);

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
