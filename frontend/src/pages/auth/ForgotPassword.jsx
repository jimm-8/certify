import { Link } from "react-router-dom";
import bg from "../../assets/bsu-bg.webp";
import bsuNEU from "../../assets/system-logo.png";

export default function ForgotPassword() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="absolute inset-0 backdrop-blur-sm bg-black/50" />

      <div className="relative z-10 bg-white rounded-xl shadow-2xl border-[#B22222] border-1 p-4 w-full max-w-sm">
        <img
          loading="lazy"
          src={bsuNEU}
          alt="BatStateU Logo"
          className="mb-2"
        />

        <h1 className="text-lg font-semibold text-gray-800 mb-2">
          Forgot Password
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Password resets are handled by the system administrator. Please
          contact the registrar or your system admin to regain access.
        </p>

        <Link
          to="/login"
          className="inline-block w-full text-center bg-[#B22222] hover:bg-[#9c1e1e] text-white text-sm font-semibold py-2 rounded-md transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
