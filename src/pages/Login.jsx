// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEye, FaEyeSlash } from "react-icons/fa";

// ✅ قاعدة الـ API: بتاخد من ENV وإلا بتستعمل /api (للـ rewrites)
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "/api";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Email/username and password are required.");
      return;
    }

    setLoading(true);
    try {
      // حضّري البيلود: إذا فيه @ استعملي email، غير هيك username
      const id = email.trim();
      const payload = { password };
      if (id.includes("@")) payload.email = id;
      else payload.username = id;

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
const body = ct.includes("application/json") ? await res.json() : { message: await res.text() };

// نجاح
if (!res.ok || body?.ok === false) {
  setErrorMsg(body?.message || `Login failed (HTTP ${res.status}).`);
  return;
}

// خزّني بالمفاتيح الجديدة والقديمة (توافق)
const userStr  = JSON.stringify(body.user || {});
const tokenStr = body.token || "";
localStorage.setItem("tf_user",  userStr);
localStorage.setItem("tf_token", tokenStr);
localStorage.setItem("user",       userStr);     // ✅ legacy
localStorage.setItem("token",      tokenStr);    // ✅ legacy
localStorage.setItem("currentUser",userStr);     // ✅ لو في صفحات بتستعمله
localStorage.setItem("authToken",  tokenStr);    // ✅ لو في صفحات بتستعمله

navigate("/dashboard"); // بدّلي المسار إذا بروفايلك مختلف

      // نجاح
      if (body?.token) localStorage.setItem("tf_token", body.token);
      if (body?.user) localStorage.setItem("tf_user", JSON.stringify(body.user));
      navigate("/dashboard"); // بدّلي المسار إذا لزم
    } catch (err) {
      console.error("login error:", err);
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#7ABCD2]/20 flex items-center justify-start overflow-hidden">
      {/* Image on the right side */}
      <motion.img
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 0.6, x: 0 }}
        transition={{ duration: 0.6 }}
        src="/school.jpg"
        alt="School"
        className="absolute right-0 top-0 h-full w-[65%] object-cover object-left z-0"
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 bg-white px-8 py-10 rounded-xl shadow-xl w-full max-w-sm mx-6 ml-40"
      >
        <Link to="/" className="text-blue-600 text-sm hover:underline mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="text-center mb-6">
          <img src="/logo.png" alt="TeachFlow Logo" className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800">TeachFlow</h1>
          <p className="text-gray-500 text-sm">School Management System</p>
        </div>

        <form onSubmit={handleSignIn}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1">Email or Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="you@teachflow.local or admin"
              autoComplete="username"
            />
          </div>

          <div className="mb-2 relative">
            <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute top-9 right-3 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 mb-4"
            >
              {errorMsg}
            </motion.div>
          )}

          <div className="text-right mb-4">
            <a href="#" className="text-sm text-red-500 hover:underline">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold transition flex items-center justify-center disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 20 10 10 0 000-20v4l-3-3z"
                  />
                </svg>
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </motion.div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full text-center py-2 text-xs text-gray-500 bg-white shadow-inner z-20">
        TeachFlow © 2025. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
