// src/pages/EditUser.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FingerprintEnroll from "../components/FingerprintEnroll.jsx";

/* ===================== API BASE ===================== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "/api";


/* ===================== Auth Fetch (cookies + optional JWT) ===================== */
const authFetch = (url, opts = {}) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return fetch(url, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
    ...opts,
  });
};

const fetchJSON = async (url, opts) => {
  const res = await authFetch(url, opts);
  const txt = await res.text().catch(() => "");
  let data = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch { data = {}; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status} @ ${url}`);
  return data;
};

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

/* ===================== Normalizers ===================== */
const normalizeClasses = (raw) => {
  const arr =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.items) ? raw.items :
    Array.isArray(raw?.data) ? raw.data :
    Array.isArray(raw?.classes) ? raw.classes :
    [];
  return arr
    .map((c) => {
      const id = c?.id ?? c?.class_id ?? c?.ID ?? c?.Id ?? c?._id ?? c?.uuid;
      const name = c?.name ?? c?.class_name ?? c?.title ?? c?.Name ?? c?.label;
      return id && name ? { id: String(id), name: String(name) } : null;
    })
    .filter(Boolean);
};

const normalizeSubjects = (raw) => {
  const arr =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.items) ? raw.items :
    Array.isArray(raw?.data) ? raw.data :
    Array.isArray(raw?.subjects) ? raw.subjects :
    [];
  return arr
    .map((s) => {
      const id = s?.id ?? s?.subject_id ?? s?.ID ?? s?._id ?? s?.uuid;
      const name = s?.name ?? s?.subject_name ?? s?.title ?? s?.label;
      return id && name ? { id: String(id), name: String(name) } : null;
    })
    .filter(Boolean);
};

/* ===================== Flexible fetchers ===================== */
const fetchClassesFlexible = async () => {
  const endpoints = [`${API_BASE}/classes`, `${API_BASE}/grades`, `${API_BASE}/class`];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const data = await fetchJSON(ep);
      const mapped = normalizeClasses(data);
      if (mapped.length) return mapped;
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return [];
};

const fetchSubjectsForClassFlexible = async (classId) => {
  const cid = encodeURIComponent(classId);
  const endpoints = [
    `${API_BASE}/classes/${cid}/subjects`,
    `${API_BASE}/subjects?class_id=${cid}`,
    `${API_BASE}/subjects/class/${cid}`,
  ];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const data = await fetchJSON(ep);
      const mapped = normalizeSubjects(data);
      if (mapped.length) return mapped;
      return [];
    } catch (e) { lastErr = e; }
  }
  if (lastErr) console.warn(lastErr);
  return [];
};

/* ===================== Fingerprint helpers ===================== */
const getFpDeviceId = () => localStorage.getItem("fp_device_id") || "scanner-001";
const setFpDeviceIdLS = (val) => localStorage.setItem("fp_device_id", String(val || "scanner-001"));

async function apiRequestEnroll(userId) {
  const res = await authFetch(`${API_BASE}/fingerprints/enroll-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, device_id: getFpDeviceId() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data; // { pageId, user_id, device_id }
}

async function apiCheckEnrollStatus(userId) {
  const res = await authFetch(`${API_BASE}/fingerprints/enroll-status?user_id=${encodeURIComponent(userId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data; // { status: "pending"|"done"|"failed", pageId?, note? }
}
// رجّع بيانات اليوزر من السيرفر وحدث الحالة
async function refreshUserIntoState(userId, setFns) {
  const { setFullName, setRole, setStatus, setPhoneLocal, setAddress, setDob,
          setPlaceOfBirth, setGender } = setFns;

  const data = await fetchJSON(`${API_BASE}/users/${userId}`);
  // خزّني نسخة للأصل
  setFns.originalRef.current = data || {};

  // أقل شي حتى يبان بواجهة البصمة
  setFullName(data.name || data.full_name || "");
  setRole(data.role || "Teacher");
  setStatus(data.status || "Active");
  setDob((data.dob || "").slice(0,10));
  setPlaceOfBirth(data.place_of_birth || "");
  setGender(data.gender || "");

  // إذا بدّك إظهار سريع للتلفون/العنوان
  const phone = (data.phone || "").replace(/^\+961\s?/, "");
  setPhoneLocal(phone);
  setAddress(data.address || "");
}

// Fallback: لو لأي سبب السيرفر ما خزّن بالبصمة من /scan
async function persistFingerprintToUser(userId, pageId, deviceId) {
  if (!pageId) return;
  const fd = new FormData();
  fd.set("fingerprint_page_id", String(pageId));
  if (deviceId) fd.set("fingerprint_device_id", String(deviceId));
  await fetchJSON(`${API_BASE}/users/${userId}`, { method: "PATCH", body: fd });
}

/* ===================== Component ===================== */
export default function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Active");

  // مرجع لبيانات السيرفر الأصلية لتفادي مسح الحقول غير المعدّلة
  const originalRef = useRef({});

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

  // subjects cache لكل صف
  const [subjectsByClass, setSubjectsByClass] = useState({}); // { [cid]: { items:[], loading, error } }

  // اختيار المستخدم: صف ⇢ مجموعة مواد
  const [classSubjects, setClassSubjects] = useState({}); // { [cid]: Set(subjectId) }

  // availability
  const [availability, setAvailability] = useState(() => {
    const init = {};
    DAY_KEYS.forEach((d) => (init[d.key] = defaultDay()));
    return init;
  });

  // teaching load
  const [totalPeriods, setTotalPeriods] = useState(30);
  const [periodMinutes, setPeriodMinutes] = useState(50);
  const totalHours = Math.round(((totalPeriods * periodMinutes) / 60) * 100) / 100;

  // ui
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  // --- Fingerprint UI state ---
  const [fpDeviceId, setFpDeviceId] = useState(getFpDeviceId());
  const [fpPhase, setFpPhase] = useState("idle"); // idle | pending | done | failed
  const [fpInfo, setFpInfo] = useState(null);

  /* ===================== Load user ===================== */
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      setSuccessInfo(null);
      try {
        const data = await fetchJSON(`${API_BASE}/users/${id}`);
        if (ignore) return;

        originalRef.current = data || {};

        // basic
        setFullName(data.name || data.full_name || "");
        setRole(data.role || "Teacher");
        setStatus(data.status || data.active_status || "Active");

        // email split
        const email = data.email || "";
        if (email && email.includes("@")) {
          const [local, domain] = email.split("@");
          setEmailLocal(local || "");
          const preset = ["gmail.com","outlook.com","hotmail.com","yahoo.com","school.edu"];
          if (preset.includes(domain)) { setEmailDomain(domain); setCustomDomain(""); }
          else { setEmailDomain("other"); setCustomDomain(domain || ""); }
        }

        // phone split (+961)
        const phone = (data.phone || "").replace(/\s+/g, "");
        if (phone.startsWith("+961")) setPhoneLocal(phone.slice(4));
        else setPhoneLocal(phone.replace(/^\+/, ""));

        // identity
        setDob((data.dob || "").slice(0, 10));
        setPlaceOfBirth(data.place_of_birth || "");
        setGender(data.gender || "");

        // address
        setAddress(data.address || "");

        // social
        const ms = data.marital_status || "Single";
        setMaritalStatus(ms);
        let kids = [];
        const ci = data.children_info;
        if (Array.isArray(ci)) kids = ci;
        else if (typeof ci === "string" && ci.trim()) {
          try { kids = JSON.parse(ci); }
          catch {
            kids = ci.split(",").map(s => {
              const [name, age] = s.split("-").map(x => (x || "").trim());
              return name || age ? { name, age: age ? Number(age) : "" } : null;
            }).filter(Boolean);
          }
        }
        setHasChildren(kids.length ? "Yes" : "No");
        setChildren(() => {
          const arr = [...kids];
          while (arr.length < 4) arr.push({ name: "", age: "" });
          return arr.slice(0, 4);
        });

        // education/work
        setDegreeType(data.degree_title || "Select Degree Type");
        setSpecialization(data.degree_major || data.specialization || "");
        const gy = String(data.degree_year || "");
        setGraduationYear(gy && Number(gy) >= 2000 ? gy : "");
        setUniversity(data.degree_university || "");
        setExperienceYears(parseInt(data.experience_years || 1, 10) || 1);
        setSalary(String(data.salary || ""));

        // ---------- classes & subjects (existing mapping) ----------
        let preMap = {};
        const rawMap = data.class_subjects_map || data.subjects_by_class;
        if (Array.isArray(rawMap)) {
          rawMap.forEach((m) => {
            if (m?.class_id) preMap[String(m.class_id)] = new Set((m.subject_ids || []).map(String));
          });
        } else if (typeof rawMap === "string") {
          try {
            const arr = JSON.parse(rawMap);
            if (Array.isArray(arr)) {
              arr.forEach((m) => {
                if (m?.class_id) preMap[String(m.class_id)] = new Set((m.subject_ids || []).map(String));
              });
            }
          } catch {}
        }
        // fallback: ids فقط
        if (!Object.keys(preMap).length) {
          const classIdsCsv = data.class_ids || data.classes_ids || data.grades;
          if (classIdsCsv) {
            String(classIdsCsv)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .forEach((cid) => { preMap[String(cid)] = new Set(); });
          }
        }
        setClassSubjects(preMap);

        // availability & load
        try {
          const av = typeof data.availability_json === "string" ? JSON.parse(data.availability_json)
                    : (Array.isArray(data.availability_json) || typeof data.availability_json === "object")
                      ? data.availability_json
                      : {};
          const merged = {};
          DAY_KEYS.forEach((d) => merged[d.key] = av?.[d.key] ? { ...defaultDay(), ...av[d.key] } : defaultDay());
          setAvailability(merged);
        } catch {}

        setTotalPeriods(Number(data.total_periods || 30));
        setPeriodMinutes(Number(data.period_minutes || 50));
      } catch (e) {
        setErrorMsg(e.message || "Failed to load user");
      } finally {
        setLoading(false);
      }
    })();
    return () => { /* cleanup */ ignore = true; };
  }, [id]);

  /* ===== Load classes from DB ===== */
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
        setClassesError(e.message || "No classes found");
      } finally {
        if (mounted) setClassesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // حمّل مواد أي صف موجود بالماب بعد تحميل المستخدم أو الصفوف
  useEffect(() => {
    (async () => {
      const ids = Object.keys(classSubjects || {});
      for (const cid of ids) {
        await ensureSubjectsLoaded(cid);
      }
    })();
  }, [classes, JSON.stringify(Object.keys(classSubjects))]);

  /* ===================== Subjects helpers ===================== */
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
    const idStr = String(cid);
    setClassSubjects((prev) => {
      const next = { ...prev };
      if (next[idStr]) delete next[idStr];
      else next[idStr] = new Set();
      return next;
    });
    await ensureSubjectsLoaded(idStr);
  };

  const toggleSubjectForClass = (cid, sid) => {
    const key = String(cid);
    setClassSubjects((prev) => {
      const next = { ...prev };
      const set = new Set(next[key] || []);
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      next[key] = set;
      return next;
    });
  };

  // selected classes & names
  const selectedClassIds = useMemo(() => Object.keys(classSubjects), [classSubjects]);
  const selectedClassNames = useMemo(() => {
    const ids = new Set(selectedClassIds);
    return classes.filter((c) => ids.has(String(c.id))).map((c) => c.name);
  }, [selectedClassIds, classes]);

  // union subject names across all selected classes (توافق قديم)
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
    setPeriodMinutes(50);

    setErrorMsg("");
    setSuccessInfo(null);
    setExportOpen(false);

    // بصمة
    setFpPhase("idle");
    setFpInfo(null);
  };

  /* ===================== Save (PATCH) ===================== */
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

      // ما منبعث أي حقول فاضية لنتفادى مسحها على السيرفر
      const setIf = (key, val) => {
        if (val !== undefined && val !== null && String(val).trim() !== "") fd.set(key, String(val));
      };

      setIf("full_name", fullName.trim());
      setIf("role", role);
      setIf("email", email);
      setIf("phone", phoneFull);
      setIf("address", address);
      setIf("status", originalRef.current?.status || "Active");
      setIf("dob", dob);
      setIf("place_of_birth", placeOfBirth);
      setIf("gender", gender);
      if (civilFile) fd.set("civil_id_file", civilFile);

      setIf("marital_status", maritalStatus);
      const kids =
        maritalStatus !== "Single" && hasChildren === "Yes"
          ? children
              .filter((c) => c.name?.trim() || c.age?.toString())
              .map((c) => ({ name: c.name?.trim() || "", age: c.age ? Number(c.age) : "" }))
          : [];
      fd.set("children_info", JSON.stringify(kids));

      if (degreeType && degreeType !== "Select Degree Type") fd.set("degree_title", degreeType);
      setIf("degree_major", specialization);
      if (specialization) setIf("job_title", specialization);
      setIf("degree_year", graduationYear);
      setIf("degree_university", university);
      setIf("experience_years", experienceYears);
      if (salary) setIf("salary", Number(salary));

      // ---------- Classes & Subjects mapping ----------
      const selectedCid = Object.keys(classSubjects);
      if (role === "Teacher" && selectedCid.length) {
        fd.set("class_ids", selectedCid.join(","));
        const names = selectedClassNames;
        if (names.length) {
          fd.set("class_names", names.join(","));
          fd.set("grades", names.join(",")); // توافق قديم
        }
        const mapArr = selectedCid.map((cid) => ({
          class_id: cid,
          subject_ids: Array.from(classSubjects[cid] || []).map(String),
        }));
        fd.set("class_subjects_map", JSON.stringify(mapArr));
        // NEW: IDs تبع المواد أيضاً
        const subjectIdsUnion = selectedCid
          .flatMap((cid) => Array.from(classSubjects[cid] || []))
          .map(String);
        if (subjectIdsUnion.length) {
          fd.set("subjects_ids", subjectIdsUnion.join(","));
          fd.set("subject_ids", subjectIdsUnion.join(","));
          fd.set("subject_ids_json", JSON.stringify(subjectIdsUnion));
        }
        fd.set("subjects_by_class", JSON.stringify(mapArr));
        const subjectsUnionNames = unionSubjectNames.join(",");
        if (subjectsUnionNames) fd.set("subjects", subjectsUnionNames);
      }

      // Availability + load
      const weeklyMinutesVal = computeWeeklyMinutes(availability);
      fd.set("availability_json", JSON.stringify(availability));
      fd.set("weekly_minutes", String(weeklyMinutesVal));
      fd.set("total_periods", String(totalPeriods));
      fd.set("period_minutes", String(periodMinutes));
      fd.set("total_hours", String(totalHours));

      const res = await authFetch(`${API_BASE}/users/${id}`, { method: "PATCH", body: fd });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data?.message || `Save failed (HTTP ${res.status})`);

      setSuccessInfo({
        id: data?.id || id,
        username: data?.username,
        role: data?.role,
      });
    } catch (err) {
      setErrorMsg(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const weeklyMinutes = computeWeeklyMinutes(availability);
  const weeklyHours = Math.round((weeklyMinutes / 60) * 100) / 100;
  const canExport = !!successInfo;

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-screen text-gray-800">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow">
        <div className="mb-6 border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Teacher Information Form</h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Fingerprint mini-panel */}
            <input
              className="text-sm border px-2 py-1 rounded w-28"
              placeholder="ESP32 ID"
              value={fpDeviceId}
              onChange={(e) => {
                setFpDeviceId(e.target.value);
                setFpDeviceIdLS(e.target.value);
              }}
              title="Identifier of the ESP32 at the scanner (e.g., scanner-001)"
            />

  <button
  type="button"
  disabled={!id || fpPhase === "pending"}
  onClick={async () => {
    try {
      setFpPhase("pending");
      const req = await apiRequestEnroll(id);
      setFpInfo({ pageId: req.pageId });

      const start = Date.now();
      const poll = async () => {
        try {
          const s = await apiCheckEnrollStatus(id);
          if (s.status === "done") {
            setFpPhase("done");
            setFpInfo((p) => ({ ...(p || {}), ...s })); // فيه pageId و device_id أحيانًا

            // ✅ 1) نضمن الكتابة (fallback آمن، حتى لو السيرفر كتب من /scan)
            await persistFingerprintToUser(id, s.pageId || req.pageId, getFpDeviceId());

            // ✅ 2) نعمل refresh للسجل حتى يبين pageId فورًا بالواجهة
            await refreshUserIntoState(id, {
              setFullName, setRole, setStatus, setPhoneLocal, setAddress,
              setDob, setPlaceOfBirth, setGender, originalRef
            });

            return;
          }
          if (s.status === "failed") {
            setFpPhase("failed");
            setFpInfo((p) => ({ ...(p || {}), ...s }));
            return;
          }
          if (Date.now() - start > 120000) {
            setFpPhase("failed");
            setFpInfo({ note: "Timeout" });
            return;
          }
          setTimeout(poll, 2000);
        } catch (e) {
          setFpPhase("failed");
          setFpInfo({ note: e.message });
        }
      };
      setTimeout(poll, 1500);
    } catch (e) {
      setFpPhase("failed");
      setFpInfo({ note: e.message });
    }
  }}
  className={
    "text-sm px-3 py-1.5 rounded-md border transition " +
    (id
      ? (fpPhase === "pending" ? "bg-yellow-500 text-white border-yellow-500" : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700")
      : "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed")
  }
  title={!id ? "Missing user id" : "Send enroll command to ESP32"}
>
  {fpPhase === "pending" ? "Enrolling..." : "Add / Update Fingerprint"}
</button>

            <button
              type="button"
              onClick={clearForm}
              className="text-sm border px-3 py-1.5 rounded-md hover:bg-gray-50"
              title="Clear all fields"
            >
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
              <div
                className="relative"
                onMouseLeave={() => setExportOpen(false)}
              >
                <div className="absolute right-0 top-10 w-40 bg-white border rounded-md shadow z-10">
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => {
                      const obj = {
                        FullName: fullName,
                        Role: role,
                        Email: (() => {
                          const domain = emailDomain === "other" ? (customDomain || "").trim() : emailDomain;
                          return emailLocal && domain ? `${emailLocal.trim()}@${domain}` : "";
                        })(),
                        Phone: phoneLocal ? `+961${phoneLocal.replace(/\D+/g, "")}` : "",
                        Address: address,
                        DateOfBirth: dob,
                        PlaceOfBirth: placeOfBirth,
                        Gender: gender,
                        MaritalStatus: maritalStatus,
                        Children:
                          (maritalStatus !== "Single" && hasChildren === "Yes"
                            ? children.filter((c) => c.name?.trim() || c.age?.toString())
                            : []
                          ).map((k) => `${k.name || ""}${k.age ? ` (${k.age})` : ""}`).join("; "),
                        DegreeTitle: degreeType !== "Select Degree Type" ? degreeType : "",
                        Specialization: specialization,
                        GraduationYear: graduationYear,
                        University: university,
                        ExperienceYears: experienceYears,
                        Salary: salary,
                        Classes: selectedClassNames.join(", "),
                        Subjects: unionSubjectNames.join(", "),
                        WeeklyAvailabilityHours: weeklyHours,
                        TeachingLoad: `${totalPeriods} periods / ${totalHours} hrs`,
                        AvailabilityJSON: JSON.stringify(availability),
                        SavedUserId: id || "",
                        SavedUsername: successInfo?.username || "",
                      };
                      const rows = Object.entries(obj)
                        .map(
                          ([k, v]) =>
                            `<tr><td style="padding:6px 10px;border:1px solid #ddd;"><b>${k}</b></td><td style="padding:6px 10px;border:1px solid #ddd;">${String(v || "")
                              .replace(/&/g, "&amp;")
                              .replace(/</g, "&lt;")}</td></tr>`
                        )
                        .join("");
                      const html = `
                        <html><head><meta charset="utf-8"/><title>Teacher Export</title></head>
                        <body>
                          <h2 style="font-family:sans-serif">Teacher Information</h2>
                          <table style="border-collapse:collapse;font-family:sans-serif;font-size:12px;">${rows}</table>
                          <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300);}</script>
                        </body></html>`;
                      const win = window.open("", "_blank");
                      if (win) { win.document.open(); win.document.write(html); win.document.close(); }
                      setExportOpen(false);
                    }}
                  >
                    Export as PDF
                  </button>

                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => {
                      const headers = [
                        "FullName","Role","Email","Phone","Address","DateOfBirth","PlaceOfBirth","Gender","MaritalStatus",
                        "Children","DegreeTitle","Specialization","GraduationYear","University","ExperienceYears","Salary",
                        "Classes","Subjects","WeeklyAvailabilityHours","TeachingLoad","AvailabilityJSON","SavedUserId","SavedUsername"
                      ];
                      const obj = {
                        FullName: fullName,
                        Role: role,
                        Email: (() => {
                          const domain = emailDomain === "other" ? (customDomain || "").trim() : emailDomain;
                          return emailLocal && domain ? `${emailLocal.trim()}@${domain}` : "";
                        })(),
                        Phone: phoneLocal ? `+961${phoneLocal.replace(/\D+/g, "")}` : "",
                        Address: address,
                        DateOfBirth: dob,
                        PlaceOfBirth: placeOfBirth,
                        Gender: gender,
                        MaritalStatus: maritalStatus,
                        Children:
                          (maritalStatus !== "Single" && hasChildren === "Yes"
                            ? children.filter((c) => c.name?.trim() || c.age?.toString())
                            : []
                          ).map((k) => `${k.name || ""}${k.age ? ` (${k.age})` : ""}`).join("; "),
                        DegreeTitle: degreeType !== "Select Degree Type" ? degreeType : "",
                        Specialization: specialization,
                        GraduationYear: graduationYear,
                        University: university,
                        ExperienceYears: experienceYears,
                        Salary: salary,
                        Classes: selectedClassNames.join(", "),
                        Subjects: unionSubjectNames.join(", "),
                        WeeklyAvailabilityHours: weeklyHours,
                        TeachingLoad: `${totalPeriods} periods / ${totalHours} hrs`,
                        AvailabilityJSON: JSON.stringify(availability),
                        SavedUserId: id || "",
                        SavedUsername: successInfo?.username || "",
                      };
                      const values = headers.map((k) => `"${String(obj[k] ?? "").replace(/"/g, '""')}"`);
                      const csv = headers.join(",") + "\n" + values.join(",");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `teacher_${id || "edit"}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      setExportOpen(false);
                    }}
                  >
                    Export as Excel (CSV)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
<section className="mb-8">
  <FingerprintEnroll
    userId={id}
    initialPageId={originalRef.current?.fingerprint_page_id || null}
    defaultDeviceId="scanner-001"
  />
</section>

        {errorMsg && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
        {successInfo && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold">User updated successfully ✅</p>
            {successInfo.username && (
              <p>Username: <span className="font-mono">{successInfo.username}</span></p>
            )}
            <p>Role: {successInfo.role}</p>
          </div>
        )}

        {/* Basic Identity */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Basic Identity</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              placeholder="Full Name"
              className="w-full border px-4 py-2 rounded"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                className="w-full border px-4 py-2 rounded"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={dateMinusYears(20)}
              />
            </div>

            <input
              placeholder="Place of Birth"
              className="w-full border px-4 py-2 rounded"
              value={placeOfBirth}
              onChange={(e) => setPlaceOfBirth(e.target.value)}
            />

            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Civil Registry Extract / ID</label>
              <input
                type="file"
                className="w-full border px-4 py-2 rounded"
                onChange={(e) => setCivilFile(e.target.files?.[0] || null)}
              />
            </div>

            <select
              name="gender"
              className="w-full border px-4 py-2 rounded"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
            </select>

            <select
              className="w-full border px-4 py-2 rounded"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
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
            <input
              placeholder="Home Address"
              className="w-full border px-4 py-2 rounded col-span-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 rounded-l bg-gray-50 text-gray-600">
                +961
              </span>
              <input
                placeholder="Phone Number"
                className="w-full border rounded-r px-3 py-2"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
              />
            </div>

            <div className="flex items-stretch">
              <input
                placeholder="Email (before @)"
                className="w-full border rounded-l px-3 py-2"
                value={emailLocal}
                onChange={(e) => setEmailLocal(e.target.value)}
              />
              <span className="inline-flex items-center px-2 border-t border-b select-none">@</span>
              <select
                className="border-t border-b px-3 py-2"
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
              >
                <option value="gmail.com">gmail.com</option>
                <option value="outlook.com">outlook.com</option>
                <option value="hotmail.com">hotmail.com</option>
                <option value="yahoo.com">yahoo.com</option>
                <option value="school.edu">school.edu</option>
                <option value="other">Other</option>
              </select>
              <input
                placeholder="custom domain"
                className="w-full border rounded-r px-3 py-2"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                disabled={emailDomain !== "other"}
              />
            </div>
          </div>
        </section>

        {/* Social Status */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Social Status</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <select
              className="w-full border px-4 py-2 rounded"
              value={maritalStatus}
              onChange={(e) => {
                setMaritalStatus(e.target.value);
                if (e.target.value === "Single") setHasChildren("No");
              }}
            >
              <option>Single</option>
              <option>Married</option>
              <option>Divorced</option>
              <option>Widowed</option>
            </select>

            {maritalStatus !== "Single" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">Children?</span>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="childrenYesNo"
                    checked={hasChildren === "Yes"}
                    onChange={() => setHasChildren("Yes")}
                  />
                  <span>Yes</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="childrenYesNo"
                    checked={hasChildren === "No"}
                    onChange={() => setHasChildren("No")}
                  />
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
                    <input
                      placeholder={`Child ${idx + 1} Name`}
                      className="border rounded px-3 py-2"
                      value={c.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setChildren((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                      }}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Age"
                      className="border rounded px-3 py-2"
                      value={c.age}
                      onChange={(e) => {
                        const v = e.target.value;
                        setChildren((prev) => prev.map((x, i) => (i === idx ? { ...x, age: v } : x)));
                      }}
                    />
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
            <select
              className="w-full border px-4 py-2 rounded"
              aria-label="Degree Type"
              value={degreeType}
              onChange={(e) => setDegreeType(e.target.value)}
            >
              <option>Select Degree Type</option>
              <option>Bachelor</option>
              <option>Master</option>
              <option>PhD</option>
            </select>

            <input
              placeholder="Specialization"
              className="w-full border px-4 py-2 rounded"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            />

            <select
              className="w-full border px-4 py-2 rounded"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
            >
              <option value="">Select Graduation Year</option>
              {gradYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <input
              placeholder="University / Institute"
              className="w-full border px-4 py-2 rounded"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            />

            <div className="flex items-stretch md:col-span-2">
              <input
                type="number"
                min={0}
                placeholder="Monthly Salary"
                className="w-full border rounded-l px-3 py-2"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
              <span className="inline-flex items-center px-3 border border-l-0 rounded-r bg-gray-50 text-gray-600">
                $
              </span>
            </div>

            <div className="md:col-span-2">
              <select
                className="w-full border px-4 py-2 rounded"
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseInt(e.target.value || "1", 10))}
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} year{n > 1 ? "s" : ""} of experience</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ======= Teacher-only: Classes & Subjects per class ======= */}
        {role === "Teacher" && (
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
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleIncludeClass(c.id)}
                        />
                        <span className="font-medium">{c.name}</span>
                      </label>
                      {included && (
                        <span className="text-xs text-gray-500">
                          {cache.loading
                            ? "Loading subjects…"
                            : cache.error
                              ? cache.error
                              : `${set.size} selected`}
                        </span>
                      )}
                    </div>

                    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${!included ? "opacity-50 pointer-events-none" : ""}`}>
                      {cache.items.map((s) => {
                        const checked = set.has(String(s.id));
                        return (
                          <label key={s.id} className="inline-flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!included}
                              onChange={() => toggleSubjectForClass(String(c.id), String(s.id))}
                            />
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
        )}

        {role === "Teacher" && (
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
                <input
                  type="number"
                  min={0}
                  className="border rounded px-3 py-2 w-full"
                  value={totalPeriods}
                  onChange={(e) =>
                    setTotalPeriods(Math.max(0, parseInt(e.target.value || "0", 10)))
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 w-36">Period Length (min)</label>
                <input
                  type="number"
                  min={1}
                  className="border rounded px-3 py-2 w-full"
                  value={periodMinutes}
                  onChange={(e) =>
                    setPeriodMinutes(Math.max(1, parseInt(e.target.value || "1", 10)))
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 w-36">Total Hours</label>
                <input
                  readOnly
                  className="border rounded px-3 py-2 w-full bg-gray-50"
                  value={totalHours}
                />
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
                          setAvailability((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], enabled: !prev[key].enabled },
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <label htmlFor={`day-${key}`} className="font-medium">
                        {label}
                      </label>
                    </div>

                    <div
                      className={`space-y-2 ${
                        !day.enabled ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      {day.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) =>
                              setAvailability((prev) => {
                                const d = prev[key];
                                const slots = [...d.slots];
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
                                const d = prev[key];
                                const slots = [...d.slots];
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
                                return {
                                  ...prev,
                                  [key]: {
                                    ...d,
                                    slots: slots.length
                                      ? slots
                                      : [{ start: "08:00", end: "10:00" }],
                                  },
                                };
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
                            return {
                              ...prev,
                              [key]: {
                                ...d,
                                slots: [...d.slots, { start: "08:00", end: "10:00" }],
                              },
                            };
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
        )}

        <div className="mt-6 text-end">
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => navigate(-1)}
              className="border px-4 py-2 rounded hover:bg-gray-50"
              type="button"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              type="button"
              className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
