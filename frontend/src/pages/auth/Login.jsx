import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import FeedbackDialog from "../../components/common/feedbackDialog";
import bg from "../../assets/bsu-bg.webp";
import bsuNEU from "../../assets/system-logo.png";

const getErrorMessage = (error) => {
  const payload = error?.response?.data;

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (typeof payload?.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }

  if (Array.isArray(payload?.detail)) {
    const messages = payload.detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.msg === "string") return item.msg;
        return null;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Login failed. Please check your credentials and try again.";
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authService.login(username, password, rememberMe);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bg})` }}
      >
        {/* overlay */}
        <div className="absolute inset-0 backdrop-blur-sm bg-black/50" />

        {/* glass card */}
        <div className="relative z-10 bg-white rounded-xl shadow-2xl border-[#B22222] border-1 p-4 w-full max-w-sm">
          <img
            loading="lazy"
            src={bsuNEU}
            alt="BatStateU Logo"
            className="mb-0"
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-between">
                <Link
                  to="/forgot-password"
                  className="text-gray-300 text-xs hover:text-gray-500 justify-end flex"
                >
                  Forgot Password?
                </Link>
                <label
                  htmlFor="remember_me"
                  className="text-gray-300 text-xs hover:text-gray-500 justify-end flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <input
                    id="remember_me"
                    type="checkbox"
                    name="remember_me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3 h-3 accent-gray-500 cursor-pointer"
                  />
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 bg-[#B22222] hover:bg-[#9c1e1e] text-white text-sm font-semibold py-2 rounded-md transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
      <FeedbackDialog
        open={Boolean(error)}
        title="Sign In Failed"
        message={error}
        tone="error"
        confirmLabel="Try Again"
        onClose={() => setError("")}
      />
    </>
  );
}
