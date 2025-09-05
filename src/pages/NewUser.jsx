// src/pages/NewUser.jsx
import React, { useEffect, useMemo, useState } from "react";
import FingerprintEnroll from "../components/FingerprintEnroll.jsx";

/* ===================== API BASE ===================== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000/api";

/* ===================== Auth Fetch (cookies + optional JWT) ===================== */
const authFetch = (url, opts = {}) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return fetch(url, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    ...opts,
  });
};

/* ===================== Fingerprint helpers ===================== */
// حفظ/قراءة معرف جهاز ESP32 (مثلاً "scanner-001")
const getFpDeviceId = () => localStorage.getItem("fp_device_id") || "scanner-001";
const setFpDeviceIdLocal = (val) => localStorage.setItem("fp_device_id", String(val || "scanner-001"));

// طلب بدء تسجيل بصمة لمستخدم
async function apiRequestEnroll(userId) {
  const res = await authFetch(`${API_BASE}/fingerprints/enroll-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, device_id: getFpDeviceId() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  // متوقع يرجّع { pageId, user_id, device_id }
  return data;
}

// فحص حالة التسجيل (polling)
async function apiCheckEnrollStatus(userId) {
  const res = await authFetch(`${API_BASE}/fingerprints/enroll-status?user_id=${encodeURIComponent(userId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  // متوقع { status: "pending"|"done"|"failed", pageId?, note? }
  return data;
}

/* ============ Availability (Mon–Thu, Sat) ============ */
const DAY_KEYS = [
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Sat", label: "Saturday" },
];

const defaultDay = () => ({
  enabled: false,
  slots: [{ start: "08:00", end: "14:20" }],
});

const minutesBetween = (a, b) => {
  const [h1, m1] = String(a || "00:00").split(":").map((n) => parseInt(n || "0", 10));
  const [h2, m2] = String(b || "00:00").split(":").map((n) => parseInt(n || "0", 10));
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1));
};

const computeWeeklyMinutes = (availability) => {
  let total = 0;
  for (const k of Object.keys(availability || {})) {
    const day = availability[k];
    if (!day?.enabled) continue;
    for (const s of day.slots || []) total += minutesBetween(s.start, s.end);
  }
  return total;
};

const anyInvalidSlot = (availability) => {
  for (const k of Object.keys(availability || {})) {
    const day = availability[k];
    if (!day?.enabled) continue;
    for (const s of day.slots || []) if (minutesBetween(s.start, s.end) <= 0) return true;
  }
  return false;
};

const formatDate = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dateMinusYears = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return formatDate(d);
};

/* ===================== Helpers: fetch classes & subjects (per class) ===================== */
const unwrap = (x) =>
  Array.isArray(x)
    ? x
    : x?.subjects || x?.users || x?.teachers || x?.classes || x?.data || x?.rows || [];

async function fetchClassesFlexible() {
  try {
    const r = await authFetch(`${API_BASE}/classes`);
    if (r.ok) {
      const j = await r.json();
      return unwrap(j)
        .map((c) => ({
          id: String(c.id ?? c.class_id ?? c._id ?? c.uuid),
          name:
            c.name ||
            `${c.grade ?? ""}${c.section ? ` ${c.section}` : ""}`.trim() ||
            `Class ${c.id}`,
        }))
        .filter((c) => c.id && c.name);
    }
  } catch {}
  try {
    const r = await authFetch(`${API_BASE}/grades`);
    if (r.ok) {
      const j = await r.json();
      return unwrap(j)
        .map((c) => ({
          id: String(c.id ?? c.class_id ?? c._id ?? c.uuid),
          name: c.name || c.title || `Class ${c.id}`,
        }))
        .filter((c) => c.id && c.name);
    }
  } catch {}
  return [];
}

async function fetchSubjectsForClassFlexible(classId) {
  const cidNum = Number(classId);
  try {
    const r = await authFetch(`${API_BASE}/classes/${classId}/subjects`);
    if (r.ok) {
      const j = await r.json();
      const arr = unwrap(j);
      if (arr.length) {
        return arr
          .map((s) => ({
            id: String(s.id ?? s.subject_id ?? s.class_subject_id ?? s._id ?? s.uuid),
            name: s.name ?? s.subject_name ?? s.title,
          }))
          .filter((x) => x.id && x.name);
      }
    }
  } catch {}
  try {
    const r = await authFetch(`${API_BASE}/subjects?class_id=${encodeURIComponent(classId)}`);
    if (r.ok) {
      const j = await r.json();
      const arr = unwrap(j);
      if (arr.length) {
        return arr
          .filter((s) => Number(s.class_id ?? s.classId ?? s.class ?? NaN) === cidNum)
          .map((s) => ({
            id: String(s.id ?? s.subject_id ?? s.class_subject_id ?? s._id ?? s.uuid),
            name: s.name ?? s.subject_name ?? s.title,
          }))
          .filter((x) => x.id && x.name);
      }
    }
  } catch {}
  try {
    const r = await authFetch(`${API_BASE}/subjects`);
    if (r.ok) {
      const j = await r.json();
      const arr = unwrap(j);
      return arr
        .filter((s) => Number(s.class_id ?? s.classId ?? s.class ?? NaN) === cidNum)
        .map((s) => ({
          id: String(s.id ?? s.subject_id ?? s.class_subject_id ?? s._id ?? s.uuid),
          name: s.name ?? s.subject_name ?? s.title,
        }))
        .filter((x) => x.id && x.name);
    }
  } catch {}
  return [];
}

/* ===================== Component ===================== */
export default function NewUser() {
  // minimal identity
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Teacher");

  // contact
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState("gmail.com");
  const [customDomain, setCustomDomain] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [address, setAddress] = useState("");

  // identity
  const [dob, setDob] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [civilFile, setCivilFile] = useState(null);
  const [gender, setGender] = useState("");

  // social
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const [hasChildren, setHasChildren] = useState("No");
  const [children, setChildren] = useState([
    { name: "", age: "" },
    { name: "", age: "" },
    { name: "", age: "" },
    { name: "", age: "" },
  ]);

  // education / work
  const currentYear = new Date().getFullYear();
  const gradYears = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => 2000 + i);
  const [degreeType, setDegreeType] = useState("Select Degree Type");
  const [specialization, setSpecialization] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [university, setUniversity] = useState("");
  const [experienceYears, setExperienceYears] = useState(1);
  const [salary, setSalary] = useState("");

  // classes list
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState("");

  // subjects cache per class
  const [subjectsByClass, setSubjectsByClass] = useState({}); // { [cid]: { items: [{id,name}], loading, error } }

  // selections: { [classId]: Set(subjectId) }
  const [classSubjects, setClassSubjects] = useState({});

  // availability
  const [availability, setAvailability] = useState(() => {
    const init = {};
    DAY_KEYS.forEach((d) => (init[d.key] = defaultDay()));
    return init;
  });

  // teaching load
  const [totalPeriods, setTotalPeriods] = useState(30);
  const [periodMinutes, setPeriodMinutes] = useState(45);
  const totalHours = Math.round(((totalPeriods * periodMinutes) / 60) * 100) / 100;

  // ui state
  const [saving, setSaving] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  // --- Fingerprint UI state ---
  const [fpDeviceId, setFpDeviceIdState] = useState(getFpDeviceId());
  const [fpPhase, setFpPhase] = useState("idle"); // idle | pending | done | failed
  const [fpInfo, setFpInfo] = useState(null);     // { pageId, note }

  /* ===== Load classes ===== */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setClassesLoading(true);
        setClassesError("");
        const cls = await fetchClassesFlexible();
        if (!mounted) return;
        setClasses(cls);
      } catch (e) {
        if (!mounted) return;
        setClasses([]);
        setClassesError(e.message || "Failed to load classes");
      } finally {
        if (mounted) setClassesLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  /* ===== Helpers ===== */
  const ensureSubjectsLoaded = async (cid) => {
    setSubjectsByClass((prev) => {
      const cur = prev[cid];
      if (cur && (cur.items?.length || cur.loading)) return prev;
      return { ...prev, [cid]: { items: [], loading: true, error: "" } };
    });
    try {
      const items = await fetchSubjectsForClassFlexible(cid);
      setSubjectsByClass((prev) => ({ ...prev, [cid]: { items, loading: false, error: "" } }));
    } catch (e) {
      setSubjectsByClass((prev) => ({ ...prev, [cid]: { items: [], loading: false, error: e.message || "Failed" } }));
    }
  };

  const toggleIncludeClass = async (cid) => {
    const id = String(cid);
    setClassSubjects((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = new Set();
      return next;
    });
    await ensureSubjectsLoaded(id);
  };

  const toggleSubjectForClass = (cid, sid) => {
    const key = String(cid); // توحيد المفتاح
    setClassSubjects((prev) => {
      const next = { ...prev };
      const set = new Set(next[key] || []);
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      next[key] = set;
      return next;
    });
  };

  const selectedClassIds = useMemo(() => Object.keys(classSubjects), [classSubjects]);
  const selectedClassNames = useMemo(() => {
    const ids = new Set(selectedClassIds);
    return classes.filter((c) => ids.has(String(c.id))).map((c) => c.name);
  }, [selectedClassIds, classes]);

  const unionSubjectNames = useMemo(() => {
    const names = [];
    for (const [cid, set] of Object.entries(classSubjects)) {
      const list = subjectsByClass[cid]?.items || [];
      const map = new Map(list.map((s) => [String(s.id), s.name]));
      set.forEach((sid) => {
        const name = map.get(String(sid));
        if (name) names.push(name);
      });
    }
    return Array.from(new Set(names));
  }, [classSubjects, subjectsByClass]);

  /* ===================== Export helpers ===================== */
  const buildExportObject = () => {
    const kids =
      maritalStatus !== "Single" && hasChildren === "Yes"
        ? children.filter((c) => c.name?.trim() || c.age?.toString())
        : [];

    const domain = emailDomain === "other" ? (customDomain || "").trim() : emailDomain;
    return {
      FullName: fullName,
      Role: role,
      Email: emailLocal && domain ? `${emailLocal.trim()}@${domain}` : "",
      Phone: phoneLocal ? `+961${phoneLocal.replace(/\D+/g, "")}` : "",
      Address: address,
      DateOfBirth: dob,
      PlaceOfBirth: placeOfBirth,
      Gender: gender,
      MaritalStatus: maritalStatus,
      Children: kids.map((k) => `${k.name || ""}${k.age ? ` (${k.age})` : ""}`).join("; "),
      DegreeTitle: degreeType !== "Select Degree Type" ? degreeType : "",
      Specialization: specialization,
      GraduationYear: graduationYear,
      University: university,
      ExperienceYears: experienceYears,
      Salary: salary,
      Classes: selectedClassNames.join(", "),
      Subjects: unionSubjectNames.join(", "),
      WeeklyAvailabilityHours: Math.round((computeWeeklyMinutes(availability) / 60) * 100) / 100,
      TeachingLoad: `${totalPeriods} periods / ${totalHours} hrs`,
      AvailabilityJSON: JSON.stringify(availability),
      SavedUserId: successInfo?.id || "",
      SavedUsername: successInfo?.username || "",
    };
  };

  const downloadBlob = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const obj = buildExportObject();
    const headers = Object.keys(obj);
    const values = headers.map((k) => `"${String(obj[k] ?? "").replace(/"/g, '""')}"`);
    const csv = headers.join(",") + "\n" + values.join(",");
    downloadBlob(`teacher_${successInfo?.id || "new"}.csv`, csv, "text/csv;charset=utf-8");
    setExportOpen(false);
  };

  const exportPDF = () => {
    const obj = buildExportObject();
    const rows = Object.entries(obj)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 10px;border:1px solid #ddd;"><b>${k}</b></td><td style="padding:6px 10px;border:1px solid #ddd;">${String(v || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")}</td></tr>`
      )
      .join("");
    const html = `
      <html>
        <head><meta charset="utf-8" /><title>Teacher Export</title></head>
        <body>
          <h2 style="font-family:sans-serif">Teacher Information</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;font-size:12px;">${rows}</table>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
        </body>
      </html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
    setExportOpen(false);
  };

  /* ===================== Clear ===================== */
  const clearForm = () => {
    setFullName("");
    setRole("Teacher");
    setEmailLocal("");
    setEmailDomain("gmail.com");
    setCustomDomain("");
    setPhoneLocal("");
    setAddress("");

    setDob("");
    setPlaceOfBirth("");
    setCivilFile(null);
    setGender("");

    setMaritalStatus("Single");
    setHasChildren("No");
    setChildren([
      { name: "", age: "" },
      { name: "", age: "" },
      { name: "", age: "" },
      { name: "", age: "" },
    ]);

    setDegreeType("Select Degree Type");
    setSpecialization("");
    setGraduationYear("");
    setUniversity("");
    setExperienceYears(1);
    setSalary("");

    setClassSubjects({});
    setSubjectsByClass({});

    const init = {};
    DAY_KEYS.forEach((d) => (init[d.key] = defaultDay()));
    setAvailability(init);
    setTotalPeriods(30);
    setPeriodMinutes(45);

    setErrorMsg("");
    setSuccessInfo(null);
    setExportOpen(false);
    // إعادة حالة البصمة
    setFpPhase("idle");
    setFpInfo(null);
  };

  /* ===================== Save (POST) ===================== */
  const handleSave = async (e) => {
    e?.preventDefault?.();
    setErrorMsg("");
    setSuccessInfo(null);

    if (!fullName || !fullName.trim()) return setErrorMsg("Full name is required.");
    const maxDOB = dateMinusYears(20);
    if (dob && dob > maxDOB) return setErrorMsg("Date of Birth must indicate age 20+.");
    const localDigits = phoneLocal.replace(/\D+/g, "");
    if (localDigits && localDigits.length < 6) return setErrorMsg("Phone number seems too short.");
    const phoneFull = localDigits ? `+961${localDigits}` : "";
    const domain = emailDomain === "other" ? (customDomain || "").trim() : emailDomain;
    const email = emailLocal && domain ? `${emailLocal.trim()}@${domain}` : "";

    if (role === "Teacher" && anyInvalidSlot(availability)) {
      return setErrorMsg("Please check time slots: end time must be after start time.");
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("full_name", fullName.trim());
      fd.set("role", role);
      if (email) fd.set("email", email);
      if (phoneFull) fd.set("phone", phoneFull);
      if (address) fd.set("address", address);
      if (dob) fd.set("dob", dob);
      if (placeOfBirth) fd.set("place_of_birth", placeOfBirth);
      if (gender) fd.set("gender", gender);
      if (civilFile) fd.set("civil_id_file", civilFile);

      if (maritalStatus) fd.set("marital_status", maritalStatus);
      fd.set(
        "children_info",
        JSON.stringify(
          maritalStatus !== "Single" && hasChildren === "Yes"
            ? children
                .filter((c) => c.name?.trim() || c.age?.toString())
                .map((c) => ({ name: c.name?.trim() || "", age: c.age ? Number(c.age) : "" }))
            : []
        )
      );

      if (degreeType && degreeType !== "Select Degree Type") fd.set("degree_title", degreeType);
      if (specialization) {
        fd.set("degree_major", specialization);
        fd.set("job_title", specialization);
      }
      if (graduationYear) fd.set("degree_year", String(graduationYear));
      if (university) fd.set("degree_university", university);
      if (experienceYears) fd.set("experience_years", String(experienceYears));
      if (salary) fd.set("salary", String(Number(salary)));

      const selectedCid = Object.keys(classSubjects);
      if (selectedCid.length) {
        fd.set("class_ids", selectedCid.join(","));
        const names = selectedClassNames;
        if (names.length) fd.set("class_names", names.join(","));
        const mapArr = selectedCid.map((cid) => ({
          class_id: cid,
          subject_ids: Array.from(classSubjects[cid]).map(String),
        }));
        // NEW: إرسال IDs للمواد بأكثر من شكل (توافق)
        const subjectIdsUnion = selectedCid
          .flatMap((cid) => Array.from(classSubjects[cid] || []))
          .map(String);
        if (subjectIdsUnion.length) {
          fd.set("subjects_ids", subjectIdsUnion.join(","));
          fd.set("subject_ids", subjectIdsUnion.join(","));
          fd.set("subject_ids_json", JSON.stringify(subjectIdsUnion));
        }
        fd.set("class_subjects_map", JSON.stringify(mapArr));
        fd.set("subjects_by_class", JSON.stringify(mapArr)); // توافق قديم
        fd.set("subjects", unionSubjectNames.join(","));
        fd.set("grades", names.join(","));
      }

      const weeklyMinutesVal = computeWeeklyMinutes(availability);
      fd.set("availability_json", JSON.stringify(availability));
      fd.set("weekly_minutes", String(weeklyMinutesVal));
      fd.set("total_periods", String(totalPeriods));
      fd.set("period_minutes", String(periodMinutes));
      fd.set("total_hours", String(totalHours));

      const res = await authFetch(`${API_BASE}/users`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Save failed (HTTP ${res.status})`);
      setSuccessInfo({
        id: data?.user?.id,
        username: data?.user?.username,
        tempPassword: data?.temp_password,
        role: data?.user?.role,
      });
      // إعادة ضبط حالة البصمة
      setFpPhase("idle");
      setFpInfo(null);
    } catch (err) {
      setErrorMsg(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const weeklyMinutes = computeWeeklyMinutes(availability);
  const weeklyHours = Math.round((weeklyMinutes / 60) * 100) / 100;
  const canExport = !!successInfo;

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-screen text-gray-800">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow">
        <div className="mb-6 border-b pb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Teacher Information Form</h2>

          <div className="relative flex items-center gap-2">
            <button type="button" onClick={clearForm} className="text-sm border px-3 py-1.5 rounded-md hover:bg-gray-50">
              Clear
            </button>

            <button
              type="button"
              disabled={!canExport}
              onClick={() => setExportOpen((v) => !v)}
              className={
                "text-sm px-3 py-1.5 rounded-md border transition " +
                (canExport
                  ? "bg-green-600 text-white border-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-300"
                  : "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed")
              }
              title={canExport ? "Export PDF or Excel" : "Export is available after saving"}
            >
              Export
            </button>

            {exportOpen && canExport && (
              <div className="absolute right-0 top-10 w-40 bg-white border rounded-md shadow z-10" onMouseLeave={() => setExportOpen(false)}>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={exportPDF}>
                  Export as PDF
                </button>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={exportCSV}>
                  Export as Excel (CSV)
                </button>
              </div>
            )}

            {/* Fingerprint mini-panel */}
            <input
              className="text-sm border px-2 py-1 rounded w-28"
              placeholder="ESP32 ID"
              value={fpDeviceId}
              onChange={(e) => {
                setFpDeviceIdState(e.target.value);
                setFpDeviceIdLocal(e.target.value);
              }}
              title="Identifier of the ESP32 at the scanner (e.g., scanner-001)"
            />
            <button
              type="button"
              disabled={!successInfo?.id || fpPhase === "pending"}
              onClick={async () => {
                try {
                  if (!successInfo?.id) return alert("Save the user first to get an ID.");
                  setFpPhase("pending");
                  const req = await apiRequestEnroll(successInfo.id);
                  setFpInfo({ pageId: req.pageId });
                  // polling loop
                  const start = Date.now();
                  const poll = async () => {
                    const s = await apiCheckEnrollStatus(successInfo.id);
                    if (s.status === "done") { setFpPhase("done"); setFpInfo((p)=>({...(p||{}), ...s})); return; }
                    if (s.status === "failed") { setFpPhase("failed"); setFpInfo((p)=>({...(p||{}), ...s})); return; }
                    if (Date.now() - start > 120000) { setFpPhase("failed"); setFpInfo({ note: "Timeout" }); return; }
                    setTimeout(poll, 2000);
                  };
                  setTimeout(poll, 1500);
                } catch (e) {
                  setFpPhase("failed");
                  setFpInfo({ note: e.message });
                }
              }}
              className={
                "text-sm px-3 py-1.5 rounded-md border transition " +
                (successInfo?.id
                  ? (fpPhase === "pending" ? "bg-yellow-500 text-white border-yellow-500" : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700")
                  : "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed")
              }
              title={!successInfo?.id ? "Save user first to enable fingerprint enrollment" : "Send enroll command to ESP32"}
            >
              {fpPhase === "pending" ? "Enrolling..." : "Add Fingerprint"}
            </button>
          </div>
        </div>

        {errorMsg && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}
        {successInfo && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold">User created successfully ✅</p>
            {successInfo?.id && (
  <section className="mb-8 mt-4">
    <FingerprintEnroll
      userId={successInfo.id}
      initialPageId={null}
      defaultDeviceId="scanner-001"
    />
  </section>
)}
            <p>Username: <span className="font-mono">{successInfo.username}</span></p>
            {successInfo.tempPassword && <p>Temporary password: <span className="font-mono">{successInfo.tempPassword}</span></p>}
            <p>Role: {successInfo.role}</p>
          </div>
        )}

        {/* FP status bar */}
        {fpPhase !== "idle" && (
          <div
            className={
              "mb-4 rounded-md px-4 py-3 text-sm " +
              (fpPhase === "done"
                ? "bg-green-50 border border-green-200 text-green-800"
                : fpPhase === "pending"
                ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
                : "bg-red-50 border border-red-200 text-red-700")
            }
          >
            {fpPhase === "pending" && <>Fingerprint enrollment started. Ask the teacher to place finger on the sensor… {fpInfo?.pageId ? <> (slot #{fpInfo.pageId})</> : null}</>}
            {fpPhase === "done" && <>Fingerprint enrolled successfully ✅ {fpInfo?.pageId ? <> (slot #{fpInfo.pageId})</> : null}</>}
            {fpPhase === "failed" && <>Fingerprint enrollment failed ❌ {fpInfo?.note ? ` – ${fpInfo.note}` : ""}</>}
          </div>
        )}

        {/* Basic Identity */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Basic Identity</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input placeholder="Full Name" className="w-full border px-4 py-2 rounded" value={fullName} onChange={(e) => setFullName(e.target.value)} />

            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Date of Birth</label>
              <input type="date" className="w-full border px-4 py-2 rounded" value={dob} onChange={(e) => setDob(e.target.value)} max={dateMinusYears(20)} />
            </div>

            <input placeholder="Place of Birth" className="w-full border px-4 py-2 rounded" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />

            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Civil Registry Extract / ID</label>
              <input type="file" className="w-full border px-4 py-2 rounded" onChange={(e) => setCivilFile(e.target.files?.[0] || null)} />
            </div>

            <select name="gender" className="w-full border px-4 py-2 rounded" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
            </select>

            <select className="w-full border px-4 py-2 rounded" value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Teacher</option>
              <option>Coordinator</option>
              <option>Admin</option>
              <option>IT Support</option>
              <option>Principal</option>
              <option>Cycle Head</option>
            </select>
          </div>
        </section>

        {/* Contact Details */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input placeholder="Home Address" className="w-full border px-4 py-2 rounded col-span-2" value={address} onChange={(e) => setAddress(e.target.value)} />

            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 rounded-l bg-gray-50 text-gray-600">+961</span>
              <input placeholder="Phone Number" className="w-full border rounded-r px-3 py-2" value={phoneLocal} onChange={(e) => setPhoneLocal(e.target.value)} />
            </div>

            <div className="flex items-stretch">
              <input placeholder="Email (before @)" className="w-full border rounded-l px-3 py-2" value={emailLocal} onChange={(e) => setEmailLocal(e.target.value)} />
              <span className="inline-flex items-center px-2 border-t border-b select-none">@</span>
              <select className="border-t border-b px-3 py-2" value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)}>
                <option value="gmail.com">gmail.com</option>
                <option value="outlook.com">outlook.com</option>
                <option value="hotmail.com">hotmail.com</option>
                <option value="yahoo.com">yahoo.com</option>
                <option value="school.edu">school.edu</option>
                <option value="other">Other</option>
              </select>
              <input placeholder="custom domain" className="w-full border rounded-r px-3 py-2" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} disabled={emailDomain !== "other"} />
            </div>
          </div>
        </section>

        {/* Social Status */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Social Status</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <select className="w-full border px-4 py-2 rounded" value={maritalStatus} onChange={(e) => { setMaritalStatus(e.target.value); if (e.target.value === "Single") setHasChildren("No"); }}>
              <option>Single</option>
              <option>Married</option>
              <option>Divorced</option>
              <option>Widowed</option>
            </select>

            {maritalStatus !== "Single" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">Children?</span>
                <label className="inline-flex items-center gap-1">
                  <input type="radio" name="childrenYesNo" checked={hasChildren === "Yes"} onChange={() => setHasChildren("Yes")} />
                  <span>Yes</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input type="radio" name="childrenYesNo" checked={hasChildren === "No"} onChange={() => setHasChildren("No")} />
                  <span>No</span>
                </label>
              </div>
            )}
          </div>

          {maritalStatus !== "Single" && hasChildren === "Yes" && (
            <div className="mt-4">
              <p className="font-medium text-sm mb-2">Children Details (up to 4)</p>
              <div className="space-y-2">
                {children.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input placeholder={`Child ${idx + 1} Name`} className="border rounded px-3 py-2" value={c.name} onChange={(e) => setChildren((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
                    <input type="number" min={0} placeholder="Age" className="border rounded px-3 py-2" value={c.age} onChange={(e) => setChildren((prev) => prev.map((x, i) => (i === idx ? { ...x, age: e.target.value } : x)))} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Education Background */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Education Background</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <select className="w-full border px-4 py-2 rounded" aria-label="Degree Type" value={degreeType} onChange={(e) => setDegreeType(e.target.value)}>
              <option>Select Degree Type</option>
              <option>Bachelor</option>
              <option>Master</option>
              <option>PhD</option>
            </select>

            <input placeholder="Specialization" className="w-full border px-4 py-2 rounded" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />

            <select className="w-full border px-4 py-2 rounded" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)}>
              <option value="">Select Graduation Year</option>
              {gradYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <input placeholder="University / Institute" className="w-full border px-4 py-2 rounded" value={university} onChange={(e) => setUniversity(e.target.value)} />

            <div className="flex items-stretch md:col-span-2">
              <input type="number" min={0} placeholder="Monthly Salary" className="w-full border rounded-l px-3 py-2" value={salary} onChange={(e) => setSalary(e.target.value)} />
              <span className="inline-flex items-center px-3 border border-l-0 rounded-r bg-gray-50 text-gray-600">$</span>
            </div>

            <div className="md:col-span-2">
              <select className="w-full border px-4 py-2 rounded" value={experienceYears} onChange={(e) => setExperienceYears(parseInt(e.target.value || "1", 10))}>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} year{n > 1 ? "s" : ""} of experience</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Teacher-only: Classes & Subjects */}
        {role === "Teacher" && (
          <>
            <section className="mb-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Classes & Subjects</h3>
                {classesLoading && <span className="text-sm text-gray-500">Loading classes…</span>}
              </div>
              {classesError && (
                <div className="mb-3 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
                  {classesError}
                </div>
              )}

              <div className="space-y-4">
                {classes.map((c) => {
                  const included = !!classSubjects[c.id];
                  const cache = subjectsByClass[c.id] || { items: [], loading: false, error: "" };
                  const set = classSubjects[c.id] || new Set();
                  return (
                    <div key={c.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={included} onChange={() => toggleIncludeClass(c.id)} />
                          <span className="font-medium">{c.name}</span>
                        </label>
                        {included && (
                          <span className="text-xs text-gray-500">
                            {cache.loading ? "Loading subjects…" : cache.error ? cache.error : `${set.size} selected`}
                          </span>
                        )}
                      </div>

                      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${!included ? "opacity-50 pointer-events-none" : ""}`}>
                        {cache.items.map((s) => {
                          const checked = set.has(String(s.id));
                          return (
                            <label key={s.id} className="inline-flex items-center gap-1 text-xs">
                              <input type="checkbox" checked={checked} disabled={!included} onChange={() => toggleSubjectForClass(c.id, String(s.id))} />
                              <span className={"rounded-full border px-2 py-1 " + (checked ? "border-blue-600 text-blue-700 bg-blue-50" : "text-gray-700")}>
                                {s.name}
                              </span>
                            </label>
                          );
                        })}
                        {!cache.loading && cache.items.length === 0 && (
                          <div className="text-xs text-gray-500">No subjects found for this class.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {classes.length === 0 && <div className="text-sm text-gray-500">No classes found.</div>}
              </div>
            </section>

            {/* Availability + Load */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Work Days</h3>
                <div className="text-right text-sm text-gray-600">
                  <div>Weekly availability: <b>{weeklyHours}</b> hrs</div>
                  <div>Teaching load: <b>{totalPeriods}</b> periods → <b>{totalHours}</b> hrs</div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 w-36">Total Periods</label>
                  <input type="number" min={0} className="border rounded px-3 py-2 w-full" value={totalPeriods} onChange={(e) => setTotalPeriods(Math.max(0, parseInt(e.target.value || "0", 10)))} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 w-36">Period Length (min)</label>
                  <input type="number" min={1} className="border rounded px-3 py-2 w-full" value={periodMinutes} onChange={(e) => setPeriodMinutes(Math.max(1, parseInt(e.target.value || "1", 10)))} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 w-36">Total Hours</label>
                  <input readOnly className="border rounded px-3 py-2 w-full bg-gray-50" value={totalHours} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {DAY_KEYS.map(({ key, label }) => {
                  const day = availability[key];
                  return (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          id={`day-${key}`}
                          type="checkbox"
                          checked={day.enabled}
                          onChange={() =>
                            setAvailability((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))
                          }
                          className="h-4 w-4"
                        />
                        <label htmlFor={`day-${key}`} className="font-medium">{label}</label>
                      </div>

                      <div className={`space-y-2 ${!day.enabled ? "opacity-50 pointer-events-none" : ""}`}>
                        {day.slots.map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                setAvailability((prev) => {
                                  const d = prev[key]; const slots = [...d.slots];
                                  slots[idx] = { ...slots[idx], start: e.target.value };
                                  return { ...prev, [key]: { ...d, slots } };
                                })
                              }
                              className="border rounded px-3 py-2 w-full"
                            />
                            <span className="text-gray-500">—</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                setAvailability((prev) => {
                                  const d = prev[key]; const slots = [...d.slots];
                                  slots[idx] = { ...slots[idx], end: e.target.value };
                                  return { ...prev, [key]: { ...d, slots } };
                                })
                              }
                              className="border rounded px-3 py-2 w-full"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAvailability((prev) => {
                                  const d = prev[key];
                                  const slots = d.slots.filter((_, i) => i !== idx);
                                  return { ...prev, [key]: { ...d, slots: slots.length ? slots : [{ start: "08:00", end: "10:00" }] } };
                                })
                              }
                              className="text-sm px-2 py-1 rounded border hover:bg-gray-50"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setAvailability((prev) => {
                              const d = prev[key];
                              return { ...prev, [key]: { ...d, slots: [...d.slots, { start: "08:00", end: "10:00" }] } };
                            })
                          }
                          className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                        >
                          + Add slot
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <div className="mt-6 text-end">
          <button onClick={handleSave} disabled={saving} type="button" className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition disabled:opacity-70">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}