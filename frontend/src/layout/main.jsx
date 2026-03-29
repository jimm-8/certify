import CertifyNavbar from "../components/common/certify_navbar";

const Main = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CertifyNavbar />
      <div className="px-3">{children}</div>
    </div>
  );
};

export default Main;
