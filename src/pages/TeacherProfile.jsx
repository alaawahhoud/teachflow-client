// src/pages/TeacherProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/* ===================== API BASE ===================== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000/api";

/* ===================== Storage & Token helpers ===================== */
const readJSON = (k) => {
  try { const raw = localStorage.getItem(k) || sessionStorage.getItem(k); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};
const readStr = (k) => (localStorage.getItem(k) || sessionStorage.getItem(k) || null);

/** رجّع كل الأشكال المحتملة للتوكن: raw & bare (بدون Bearer) */
const getTokenVariants = () => {
  const keys = ["token","accessToken","jwt","authToken","Authorization","auth_token"];
  let raw = null;
  for (const k of keys) {
    const v = readStr(k);
    if (!v) continue;
    raw = v;
    break;
  }
  // أحيانًا التوكن محفوظ كـ JSON { token: "...", accessToken: "..." }
  if (!raw) {
    const jsonKeys = ["auth","user","authUser","currentUser","session"];
    for (const k of jsonKeys) {
      const obj = readJSON(k);
      if (obj && typeof obj === "object") {
        raw = obj.accessToken || obj.token || obj.jwt || obj.authToken || null;
        if (raw) break;
      }
    }
  }
  if (!raw) return { raw: null, bare: null };

  const fromHeader = raw.replace(/^Bearer\s+/i, "");
  return { raw, bare: fromHeader };
};

const safeAtob = (s) => { try { return atob(s.replace(/-/g, "+").replace(/_/g, "/")); } catch { return ""; } };
const parseJWT = (t) => {
  if (!t) return null;
  const parts = String(t).split(".");
  if (parts.length < 2) return null;
  try { return JSON.parse(safeAtob(parts[1])); } catch { return null; }
};

const userFromToken = (payload) => {
  if (!payload) return null;
  return {
    id: payload.sub || payload.id || payload.userId || payload._id || null,
    name: payload.name || payload.full_name || payload.username || "",
    full_name: payload.full_name || payload.name || "",
    email: payload.email || "",
    role: payload.role || payload.user_role || "Teacher",
    phone: payload.phone || "",
    subjects: payload.subjects || payload.subject_names || "",
    grades: payload.grades || payload.class_names || "",
    experience_years: payload.experience_years ?? payload.expYears ?? "",
    job_title: payload.job_title || "",
  };
};

const readUserFromStorage = () =>
  readJSON("currentUser") || readJSON("authUser") || readJSON("user");

/* ===================== Auth Fetch ===================== */
const authFetch = (url, opts = {}) => {
  const { raw, bare } = getTokenVariants();
  const headers = new Headers(opts.headers || {});
  // Authorization
  if (bare) {
    headers.set("Authorization", raw?.startsWith("Bearer ") ? raw : `Bearer ${bare}`);
    headers.set("x-auth-token", bare);   // لبعض السيرفرات
    headers.set("token", bare);          // لبعض السيرفرات القديمة
  }
  return fetch(url, {
    credentials: "include",
    ...opts,
    headers,
  });
};

/* ===================== Utils ===================== */
const toArrCSV = (v) =>
  Array.isArray(v) ? v.map(String).map(s=>s.trim()).filter(Boolean)
  : v ? String(v).split(",").map(x=>x.trim()).filter(Boolean) : [];

const initials = (name="") =>
  name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("") || "U";

/* ===================== Server fetchers ===================== */
const tryFetchMe = async () => {
  const candidates = [
    `${API_BASE}/auth/me`,
    `${API_BASE}/users/me`,
    `${API_BASE}/me`,
    `${API_BASE}/users/current`,
  ];
  for (const ep of candidates) {
    try {
      const r = await authFetch(ep);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401 || r.status === 404) continue;
        throw new Error(d?.message || `HTTP ${r.status}`);
      }
      return d?.user || d?.data?.user || d?.data || d;
    } catch {
      continue;
    }
  }
  return null;
};

const fetchById = async (id) => {
  const r = await authFetch(`${API_BASE}/users/${encodeURIComponent(id)}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || `HTTP ${r.status}`);
  return d?.user || d?.data?.user || d?.data || d;
};

/* ===================== Component ===================== */
export default function TeacherProfile() {
  const { id } = useParams();                     // اختياري: لو فتنا /teacher/:id من Users
  const navigate = useNavigate();
  const location = useLocation();

  // لو واصلين بـ state من صفحة أخرى
  const passedUser = location.state?.currentUser || null;

  // Bootstrap user (بلا ما ننطر السيرفر)
  const storageUser = readUserFromStorage();
  const { bare: tokenBare } = getTokenVariants();
  const tokenPayload = parseJWT(tokenBare);
  const tokenUser = userFromToken(tokenPayload);

  // إذا في id بالـ URL، اعتبريه أولوية (عرض بروفايل أي يوزر)
  const bootUser = passedUser || (id ? null : (storageUser || tokenUser || null));

  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading]     = useState(!bootUser);
  const [err, setErr]             = useState("");
  const [u, setU]                 = useState(bootUser);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setErr("");
      try {
        let user = null;

        // 1) لو في id بالرابط -> جيبي هيدا اليوزر
        if (id) {
          user = await fetchById(id);
        } else {
          // 2) جرّبي endpoints تبع "me"
          user = await tryFetchMe();

          // 3) لو ما زبطت وجبنا id من الستورج/التوكن -> جيبي /users/:id
          if (!user) {
            const fallbackId =
              storageUser?.id || storageUser?._id ||
              tokenUser?.id ||
              tokenPayload?.sub || tokenPayload?.id || tokenPayload?.userId || tokenPayload?._id ||
              null;

            if (fallbackId) {
              try { user = await fetchById(fallbackId); }
              catch { /* تجاهلي */ }
            }
          }

          // 4) آخر علاج: لو عندنا bootUser مبدئي، اعرضيه بدل ما نعتبره غير مسجل
          if (!user && bootUser) user = bootUser;
        }

        if (!ignore) {
          setU(user);
          // خزّني نسخة خفيفة
          try { if (user) localStorage.setItem("currentUser", JSON.stringify(user)); } catch {}
        }
      } catch (e) {
        if (!ignore) setErr(e.message || "Unable to load current user");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
  }, [id]);

  /* ---------- Presentation ---------- */
  const name  = u?.name || u?.full_name || "—";
  const email = u?.email || "—";
  const phone = u?.phone || "—";
  const role  = u?.role || "Teacher";

  const subjects = useMemo(() => toArrCSV(u?.subjects), [u]);
  const grades   = useMemo(() => toArrCSV(u?.grades || u?.class_names), [u]);
  const avatar   = useMemo(() => initials(name), [name]);
  const jobTitle = useMemo(() => u?.job_title || (subjects[0] ? `${subjects[0]} Teacher` : role), [u, subjects, role]);
  const yearsExp = useMemo(
    () => (u?.experience_years != null && u?.experience_years !== "" ? `${u.experience_years} years` : "—"),
    [u]
  );

  const attendanceData = useMemo(() => ([
    { date: "2025-08-01", class: "Grade 9A", periods: 3, status: "Present" },
    { date: "2025-08-02", class: "Grade 9B", periods: 2, status: "Absent" },
    { date: "2025-08-03", class: "Grade 10A", periods: 1, status: "Present" },
  ]), []);

  const scheduleData = useMemo(() => ({
    Monday: [
      { subject: subjects[0] || "—", grade: grades[0] || "—", time: "8:00 - 9:00",  room: "R201" },
      { subject: subjects[0] || "—", grade: grades[1] || "—", time: "10:00 - 11:00", room: "R203" },
    ],
    Tuesday: [{ subject: subjects[0] || "—", grade: grades[0] || "—", time: "9:00 - 10:00", room: "R202" }],
  }), [subjects, grades]);

  const examData = useMemo(() => ([
    { name: "Algebra Midterm", grade: "9A", subject: subjects[0] || "—", date: "2025-08-01", status: "Correction In Progress" },
    { name: "Geometry Quiz",   grade: "9B", subject: subjects[0] || "—", date: "2025-07-25", status: "Corrected" },
  ]), [subjects]);

  /* ---------- UI ---------- */
  if (loading) return <div className="p-6">Loading profile…</div>;

  if (!u) {
    // ما لقينا أي شي لا من سيرفر ولا من توكن/ستورج
    return (
      <div className="p-6">
        <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-4 rounded">
          يلزم تسجيل الدخول لعرض الملف الشخصي.
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => navigate("/login")} className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
          <button onClick={() => navigate(-1)} className="border px-4 py-2 rounded">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen text-gray-800">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-xl shadow flex flex-col md:flex-row gap-6">

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
          className="md:w-1/3 bg-white rounded-xl border p-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-semibold">
            {avatar}
          </div>
          <h2 className="mt-4 font-bold text-xl">{name}</h2>
          <p className="text-gray-500 mb-4">{jobTitle}</p>
          <div className="w-full text-left text-sm space-y-2">
            <div><strong>Grades:</strong> <span className="float-right">{grades.length ? grades.join(", ") : "—"}</span></div>
            <div><strong>Subjects:</strong> <span className="float-right">{subjects.length ? subjects.join(", ") : "—"}</span></div>
            <div><strong>Email:</strong> <span className="float-right">{email}</span></div>
            <div><strong>Phone:</strong> <span className="float-right">{phone}</span></div>
            <div><strong>Years of Experience:</strong> <span className="float-right">{yearsExp}</span></div>
          </div>
        </motion.div>

        {/* Right Section */}
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="md:w-2/3">
          {/* Tabs */}
          <div className="flex gap-6 border-b mb-6">
            {["Overview", "Attendance", "Schedule", "Exams"].map((tab) => (
              <button key={tab}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-blue-600"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === "Overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#DBEAFE] text-blue-800 rounded-xl p-4 flex flex-col items-center">
                  <div className="text-sm">Total Classes</div>
                  <div className="text-2xl font-bold">{grades.length ? grades.length * 2 : 24}</div>
                </div>
                <div className="bg-[#DCFCE7] text-green-800 rounded-xl p-4 flex flex-col items-center">
                  <div className="text-sm">Attendance Rate</div>
                  <div className="text-2xl font-bold">92%</div>
                </div>
                <div className="bg-[#FEF3C7] text-orange-800 rounded-xl p-4 flex flex-col items-center">
                  <div className="text-sm">Active Exams</div>
                  <div className="text-2xl font-bold">3</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-4">Recent Activity</h3>
                <ul className="space-y-2 text-sm pl-4 list-disc">
                  <li className="text-blue-600">Created "Algebra Midterm Exam"</li>
                  <li className="text-green-600">Marked attendance for all classes</li>
                  <li className="text-orange-600">Corrected "Geometry Quiz"</li>
                </ul>
              </div>
            </div>
          )}

          {/* Attendance */}
          {activeTab === "Attendance" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border">
                  <thead className="bg-gray-100">
                    <tr><th className="p-2">Date</th><th className="p-2">Class</th><th className="p-2">Periods</th><th className="p-2">Status</th></tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{row.date}</td>
                        <td className="p-2">{row.class}</td>
                        <td className="p-2">{row.periods}</td>
                        <td className={`p-2 font-semibold ${row.status === "Present" ? "text-green-600" : "text-red-500"}`}>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => navigate("/attendance")} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                View Full Attendance
              </button>
            </div>
          )}

          {/* Schedule */}
          {activeTab === "Schedule" && (
            <div className="space-y-4 text-sm">
              {Object.entries(scheduleData).map(([day, classes]) => (
                <div key={day}>
                  <h4 className="font-semibold mb-2">{day}</h4>
                  <table className="w-full text-left border text-sm mb-4">
                    <thead className="bg-gray-100"><tr><th className="p-2">Subject</th><th className="p-2">Grade</th><th className="p-2">Time</th><th className="p-2">Room</th></tr></thead>
                    <tbody>
                      {classes.map((c, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{c.subject}</td>
                          <td className="p-2">{c.grade}</td>
                          <td className="p-2">{c.time}</td>
                          <td className="p-2">{c.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <button onClick={() => navigate("/schedule")} className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                View Full Schedule
              </button>
            </div>
          )}

          {/* Exams */}
          {activeTab === "Exams" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border">
                  <thead className="bg-gray-100"><tr><th className="p-2">Exam Name</th><th className="p-2">Grade</th><th className="p-2">Subject</th><th className="p-2">Date</th><th className="p-2">Status</th></tr></thead>
                  <tbody>
                    {examData.map((exam, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{exam.name}</td>
                        <td className="p-2">{exam.grade}</td>
                        <td className="p-2">{exam.subject}</td>
                        <td className="p-2">{exam.date}</td>
                        <td className={`p-2 font-semibold ${exam.status === "Corrected" ? "text-green-600" : "text-orange-500"}`}>
                          {exam.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => navigate("/exams")} className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                View All Exams
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
