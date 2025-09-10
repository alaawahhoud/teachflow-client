// src/pages/ResetPassword.jsx
import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

/* ===================== API BASE ===================== */
// استبدلي التعريف القديم بهالتعريف:
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) ||
  (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app")
    ? "https://teachflow-server.onrender.com/api"
    : "http://localhost:4000/api");

/* ===================== authFetch (يدعم tf_token) ===================== */
const authFetch = (url, opts = {}) => {
  const raw =
    localStorage.getItem("tf_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("tf_token") ||
    sessionStorage.getItem("token") ||
    "";

  const bare = raw.replace(/^Bearer\s+/i, "");
  const headers = {
    "Content-Type": "application/json",
    ...(bare ? { Authorization: `Bearer ${bare}` } : {}),
    ...(opts.headers || {}),
  };

  return fetch(url, {
    credentials: "include",
    ...opts,
    headers,
  });
};

export default function ResetPassword() {
  const { id } = useParams();
  const navigate = useNavigate();

  const usernameRef = useRef(null);
  const pwd1Ref = useRef(null);
  const pwd2Ref = useRef(null);

  const [showPwd1, setShowPwd1] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const toggleInputType = (ref, setShow) => {
    const el = ref?.current;
    if (!el) return;
    const start = el.selectionStart ?? null;
    const end = el.selectionEnd ?? null;
    const nextIsText = el.type === "password";
    el.type = nextIsText ? "text" : "password";
    setShow(nextIsText);
    setTimeout(() => {
      try {
        el.focus({ preventScroll: true });
        if (start !== null && end !== null) el.setSelectionRange(start, end);
      } catch {}
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOkMsg("");

    if (!id) {
      setErr("Missing user id in the URL.");
      return;
    }

    const username = usernameRef.current?.value?.trim() || "";
    const pwd1 = pwd1Ref.current?.value || "";
    const pwd2 = pwd2Ref.current?.value || "";

    if (pwd1.length < 6) return setErr("Password must be at least 6 characters.");
    if (pwd1 !== pwd2) return setErr("Passwords do not match.");

    setSaving(true);
    try {
      // ✅ الباك يستقبل password (مش newPassword)
      const body = { password: pwd1 };
      if (username) body.username = username;

      const res = await authFetch(`${API_BASE}/users/${encodeURIComponent(id)}/credentials`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      setOkMsg("Credentials updated successfully ✅");
      setTimeout(() => navigate(-1), 800);
    } catch (e) {
      setErr(e.message || "Failed to update credentials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-screen text-gray-800">
      <div className="bg-white rounded-xl shadow p-6 md:p-8 max-w-lg mx-auto">
        <div className="mb-6 border-b pb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reset Credentials</h2>
          <span className="text-blue-600 font-semibold">TeachFlow</span>
        </div>

        {err && <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded px-4 py-2 text-sm">{err}</div>}
        {okMsg && <div className="mb-4 bg-green-50 text-green-800 border border-green-200 rounded px-4 py-2 text-sm">{okMsg}</div>}

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <label className="block text-sm mb-1" htmlFor="username">Username (optional)</label>
            <input
              className="w-full border rounded px-3 py-2"
              id="username"
              name="username"
              autoComplete="username"
              ref={usernameRef}
              defaultValue=""
              placeholder="Leave empty to keep current username"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="new-password">New Password</label>
            <div className="relative">
              <input
                id="new-password"
                ref={pwd1Ref}
                type="password"
                name="new-password"
                className="w-full border rounded px-3 py-2 pr-12"
                defaultValue=""
                placeholder="••••••"
                autoComplete="new-password"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                data-1p-ignore="true"
                data-lpignore="true"
                data-form-type="other"
              />
              <span
                role="button"
                aria-label={showPwd1 ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer select-none"
                onMouseDown={(e) => { e.preventDefault(); toggleInputType(pwd1Ref, setShowPwd1); }}
                onTouchStart={(e) => { e.preventDefault(); toggleInputType(pwd1Ref, setShowPwd1); }}
              >
                {showPwd1 ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="new-password-confirm">Confirm New Password</label>
            <div className="relative">
              <input
                id="new-password-confirm"
                ref={pwd2Ref}
                type="password"
                name="new-password-confirm"
                className="w-full border rounded px-3 py-2 pr-12"
                defaultValue=""
                placeholder="••••••"
                autoComplete="new-password"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                data-1p-ignore="true"
                data-lpignore="true"
                data-form-type="other"
              />
              <span
                role="button"
                aria-label={showPwd2 ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer select-none"
                onMouseDown={(e) => { e.preventDefault(); toggleInputType(pwd2Ref, setShowPwd2); }}
                onTouchStart={(e) => { e.preventDefault(); toggleInputType(pwd2Ref, setShowPwd2); }}
              >
                {showPwd2 ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="border px-4 py-2 rounded hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          ملاحظة: عرض/إخفاء كلمة السر لا يغيّر قيمتها—بس بيبدّل طريقة العرض.
        </p>
      </div>
    </div>
  );
}
