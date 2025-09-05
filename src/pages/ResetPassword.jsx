// src/pages/ResetPassword.jsx
import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000/api";

const authFetch = (url, opts = {}) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  });
};

export default function ResetPassword() {
  const { id } = useParams();
  const navigate = useNavigate();

  // === refs بدل state للقيم (uncontrolled) ===
  const usernameRef = useRef(null);
  const pwd1Ref = useRef(null);
  const pwd2Ref = useRef(null);

  // state بس للأيقونة (ما منستعملها لتغيير خصائص input)
  const [showPwd1, setShowPwd1] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const toggleInputType = (ref, setShow) => {
    const el = ref?.current;
    if (!el) return;
    // خزّن مكان المؤشر
    const start = el.selectionStart ?? null;
    const end = el.selectionEnd ?? null;

    // بدّل النوع مباشرة على الـDOM
    const nextIsText = el.type === "password";
    el.type = nextIsText ? "text" : "password";
    setShow(nextIsText);

    // رجّع الفوكس والمؤشر بعد تبديل النوع
    // (Safari/iOS يحتاج setTimeout صغير)
    setTimeout(() => {
      try {
        el.focus({ preventScroll: true });
        if (start !== null && end !== null) el.setSelectionRange(start, end);
      } catch {}
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOkMsg("");

    const username = usernameRef.current?.value?.trim() || "";
    const pwd1 = pwd1Ref.current?.value || "";
    const pwd2 = pwd2Ref.current?.value || "";

    if (pwd1.length < 6) return setErr("Password must be at least 6 characters.");
    if (pwd1 !== pwd2) return setErr("Passwords do not match.");

    setSaving(true);
    try {
      const body = { newPassword: pwd1 };
      if (username) body.username = username;

      const res = await authFetch(`${API_BASE}/users/${id}/credentials`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      setOkMsg("Credentials updated successfully ✅");
      setTimeout(() => navigate(-1), 700);
    } catch (e) {
      setErr(e.message || "Failed to update credentials");
    } finally {
      setSaving(false);
    }
  };

  const PasswordField = ({ label, id, inputRef, isShown, onToggle }) => (
    <div>
      <label className="block text-sm mb-1" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          // النوع الابتدائي: password دائماً. التبديل يتم عبر ref (DOM) مش عبر render.
          type="password"
          name={id}
          className="w-full border rounded px-3 py-2 pr-12"
          defaultValue=""
          placeholder="••••••"
          autoComplete="new-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          // منع إنتر من الـsubmit الغلط أثناء الكتابة
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          // حيل ضد مدراء كلمات السر
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
        />
        {/* span (مش button) حتى ما ياخد فوكس */}
        <span
          role="button"
          aria-label={isShown ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer select-none"
          onMouseDown={(e) => { e.preventDefault(); toggleInputType(inputRef, isShown ? () => setShowState(false) : () => setShowState(true)); }}
          onClick={(e) => {
            e.preventDefault();
            toggleInputType(inputRef, isShown ? setShowPwd1 : setShowPwd1); // سيُستبدل أسفل لكل حقل
          }}
          onTouchStart={(e) => { e.preventDefault(); /* سنحدد أدناه تابع صحيح لكل حقل */ }}
        >
          {isShown ? <FaEyeSlash /> : <FaEye />}
        </span>
      </div>
    </div>
  );

  // لأننا بدنا نمرّر setShow الصحيح لكل حقل:
  const PasswordField1 = () => (
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
  );

  const PasswordField2 = () => (
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
  );

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

          <PasswordField1 />
          <PasswordField2 />

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
