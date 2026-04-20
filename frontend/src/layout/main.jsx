import CertifyNavbar from "../components/common/certify_navbar";
import GlobalPrintQueue from "../components/common/global_print_queue";

const Main = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CertifyNavbar />
      <div className="px-3">{children}</div>
      <GlobalPrintQueue />
    </div>
  );
};

export default Main;
