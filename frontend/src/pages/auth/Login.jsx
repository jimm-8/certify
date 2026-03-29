import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import bg from "../../assets/bsu-bg.png";
import bsuLogo from "../../assets/bsu_logo.png";
import certifyLogo from "../../assets/certify-logo.png";
import bsuNEU from "../../assets/system-logo.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authService.login(username, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data || "Login failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/50" />

      {/* glass card */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl border-[#B22222] border-1 p-4 w-full max-w-sm">
        <img src={bsuNEU} alt="BatStateU Logo" className="mb-0" />

        {error && (
          <div className="mb-4 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {String(error)}
          </div>
        )}

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
              <p className="text-gray-300 text-xs hover:text-gray-500 justify-end flex">
                Forgot Password?
              </p>
              <p className="text-gray-300 text-xs hover:text-gray-500 justify-end flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="remember_me"
                  className="w-3 h-3 appearance-none border border-gray-300 rounded bg-white checked:bg-gray-500 checked:border-gray-500 cursor-pointer"
                />
                Remember me
              </p>
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
  );
}
