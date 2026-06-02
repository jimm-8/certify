import CertifyNavbar from "../components/common/certify_navbar";
import { useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

/* Lazy load heavy global component */
const GlobalPrintQueue = lazy(
  () => import("../components/common/global_print_queue"),
);

const Main = ({ children }) => {
  const location = useLocation();
  const shouldShowPrintQueue = location.pathname !== "/payment-tagging";

  /* Defer mounting to avoid blocking main thread */
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setShowQueue(true);
    }, 0); // defer execution

    return () => clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--school-surface)] text-[var(--school-ink)]">
      {/* Navbar stays immediate (lightweight) */}
      <CertifyNavbar />

      {/* Main content */}
      <div className="px-3">{children}</div>

      {/* Deferred + Lazy Global Component */}
      {shouldShowPrintQueue && showQueue && (
        <Suspense fallback={null}>
          <GlobalPrintQueue />
        </Suspense>
      )}
    </div>
  );
};

export default Main;
