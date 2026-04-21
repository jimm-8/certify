import CertifyNavbar from "../components/common/certify_navbar";
import GlobalPrintQueue from "../components/common/global_print_queue";
import { useLocation } from "react-router-dom";

const Main = ({ children }) => {
  const location = useLocation();
  const shouldShowPrintQueue = location.pathname !== "/payment-tagging";

  return (
    <div className="min-h-screen bg-gray-50">
      <CertifyNavbar />
      <div className="px-3">{children}</div>
      {shouldShowPrintQueue ? <GlobalPrintQueue /> : null}
    </div>
  );
};

export default Main;
