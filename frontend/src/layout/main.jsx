import CertifyNavbar from "../components/common/certify_navbar";

const main = ({ children }) => {
  return (
    <div>
      <CertifyNavbar />
      {children}
    </div>
  );
};

export default main;
