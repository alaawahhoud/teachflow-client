// src/pages/Schedule.jsx
import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

/* ===================== CONFIG ===================== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000/api";


// المتوقع:
// GET  /classes
// GET  /users/teachers
// GET  /subjects
// GET  /classes/:id/subjects
// GET  /users/:id                -> يحتوي availability_json
// GET  /schedule?classId=ID
// PUT  /schedule?classId=ID
const ENDPOINTS = {
  classes: "/classes",
  teachers: "/users/teachers",
  subjectsAll: "/subjects",
  subjectsForClass: (classId) => `/classes/${encodeURIComponent(classId)}/subjects`,
  teacherOne: (id) => `/users/${id}`,
  scheduleGet: (classId) => `/schedule?classId=${encodeURIComponent(classId)}`,
  schedulePut: (classId) => `/schedule?classId=${encodeURIComponent(classId)}`,
};

/* ===================== Helpers ===================== */
const unwrap = (x) =>
  Array.isArray(x) ? x : x?.classes || x?.teachers || x?.subjects || x?.data || x?.rows || [];

const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

const pick = (obj, keys) => {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return undefined;
};

/* ===== Period timing helpers (7 × 50د + استراحة 25د) ===== */
function getBreakAfterIndexByClassName(className = "") {
  const n = String(className || "").toLowerCase();
  if (/(kg1|kg2|kg3|grade\s*one|grade\s*1|grade\s*two|grade\s*2|grade\s*three|grade\s*3)/i.test(n)) {
    return 3; // بين الثالثة والرابعة
  }
  return 4; // باقي الصفوف: بين الرابعة والخامسة
}
const toHHMM = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}`;
};
function buildPeriodTimeSpans({ startHH = 8, startMM = 0, perMin = 50, breakAfter = 4, breakMin = 25 }) {
  const spans = [];
  let cur = startHH * 60 + startMM;
  for (let i = 1; i <= 7; i++) {
    const s = cur;
    const e = s + perMin;
    spans.push({ start: toHHMM(s), end: toHHMM(e) });
    cur = e;
    if (i === breakAfter) cur += breakMin;
  }
  return { spans, endOfDayHHMM: toHHMM(cur) };
}

/* ===================== Component ===================== */
export default function Schedule() {
  const subjectColors = {
 Math:                 "bg-blue-50        border-blue-100   text-blue-800",
  English:              "bg-rose-50        border-rose-100   text-rose-800",
  Science:              "bg-emerald-50     border-emerald-100 text-emerald-800",
  History:              "bg-yellow-50      border-yellow-100 text-yellow-800",
  Arabic:               "bg-violet-50      border-violet-100 text-violet-800",
  French:               "bg-indigo-50      border-indigo-100 text-indigo-800",
  "Physical Education": "bg-slate-50       border-slate-200  text-slate-800",
  Arts:                 "bg-red-50         border-red-100    text-red-800",
  Biology:              "bg-teal-50        border-teal-100   text-teal-800",
  Chemistry:            "bg-orange-50      border-orange-100 text-orange-800",
  Civics:               "bg-lime-50        border-lime-100   text-lime-800",
  Computer:             "bg-cyan-50        border-cyan-100   text-cyan-800",
  Economics:            "bg-amber-50       border-amber-100  text-amber-800",
  Geography:            "bg-sky-50         border-sky-100    text-sky-800",
  Philosophy:           "bg-purple-50      border-purple-100 text-purple-800",
  Physics:              "bg-fuchsia-50     border-fuchsia-100 text-fuchsia-800",
  Religion:             "bg-stone- 100       border-stone-300  text-stone-800",
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"];
  const periods = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

  // UI
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Filters (من الداتابيس)
  const [selectedClassId, setSelectedClassId] = useState("All");
  const [selectedTeacher, setSelectedTeacher] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");

  // Master data
  const [classes, setClasses] = useState([]);   // [{id,name}]
  const [teachers, setTeachers] = useState([]); // ["name", ...]
  const [subjects, setSubjects] = useState([]); // ["name", ...]
  const [subjectsDetail, setSubjectsDetail] = useState([]); // [{name,hours,teacherId,teacherName}]

  // Schedule
const emptySchedule = useMemo(
  () => ({
    Monday: Array(7).fill(null),
    Tuesday: Array(7).fill(null),
    Wednesday: Array(7).fill(null),
    Thursday: Array(7).fill(null),
    Saturday: Array(7).fill(null),
  }),
  []
);
const [scheduleData, setScheduleData] = useState(emptySchedule);

  /* ========== Loaders (من الداتابيس) ========== */
  const fetchClassesFromDb = async () => {
    try {
      const res = await fetch(`${API_BASE}${ENDPOINTS.classes}`);
      if (!res.ok) throw new Error("Failed to load classes");
      const j = await res.json();
      const arr = unwrap(j);
      const normalized = arr
        .map((c, i) => {
          const id =
            c.id !== undefined
              ? c.id
              : c.class_id !== undefined
              ? c.class_id
              : i + 1;
          const name =
            pick(c, ["name", "class_name", "title"]) !== undefined
              ? pick(c, ["name", "class_name", "title"])
              : `Class ${id}`;
          return { id, name };
        })
        .filter((c) => c.id != null && c.name);
      setClasses(normalized);
      if (normalized.length && selectedClassId === "All") {
        setSelectedClassId(String(normalized[0].id));
      }
    } catch (e) {
      console.warn(e);
      setClasses([]);
    }
  };

  const fetchTeachersFromDb = async () => {
    try {
      const res = await fetch(`${API_BASE}${ENDPOINTS.teachers}`);
      if (!res.ok) throw new Error("Failed to load teachers");
      const j = await res.json();
      const arr = unwrap(j);
      const names = unique(
        arr
          .map((t) => String(pick(t, ["name", "full_name", "username"]) || ""))
          .filter(Boolean)
      );
      setTeachers(names);
    } catch (e) {
      console.warn(e);
      setTeachers([]);
    }
  };

  // يجلب مواد الصف المحدد مع الساعات والأستاذ المعيّن من جدول subjects
  const fetchSubjectsFromDb = async (classId) => {
    try {
      let arr = [];
      if (classId && classId !== "All") {
        const r1 = await fetch(`${API_BASE}${ENDPOINTS.subjectsForClass(classId)}`);
        if (r1.ok) {
          const j1 = await r1.json();
          arr = unwrap(j1);
        }
        if (!arr.length) {
          const r2 = await fetch(`${API_BASE}${ENDPOINTS.subjectsAll}`);
          if (r2.ok) {
            const j2 = await r2.json();
            arr = unwrap(j2);
          }
        }
      } else {
        const r = await fetch(`${API_BASE}${ENDPOINTS.subjectsAll}`);
        if (r.ok) {
          const j = await r.json();
          arr = unwrap(j);
        }
      }

      // صفّي حسب الصف (إذا الحقل موجود)
      const cidNum = parseInt(classId || "0", 10);
      const filtered = arr.filter((s) => {
        const sid = s.class_id != null ? s.class_id : s.classId != null ? s.classId : s.class;
        return classId && classId !== "All" ? Number(sid) === cidNum : true;
      });

      const detail = filtered.map((s) => ({
        id: s.id != null ? s.id : s.subject_id != null ? s.subject_id : s.class_subject_id,
        name: pick(s, ["name", "subject", "subject_name"]) || "",
        hours: Number(s.hours != null ? s.hours : s.weekly_hours != null ? s.weekly_hours : 1),
        classId: Number(s.class_id != null ? s.class_id : s.classId != null ? s.classId : s.class),
        teacherId:
          s.teacher_id != null
            ? s.teacher_id
            : s.teacherId != null
            ? s.teacherId
            : s.user_id != null
            ? s.user_id
            : s.teacher && s.teacher.id != null
            ? s.teacher.id
            : null,
        teacherName:
          s.teacher_name ||
          (s.teacher && (s.teacher.full_name || s.teacher.name)) ||
          "",
      }));

      setSubjectsDetail(detail);
      setSubjects(unique(detail.map((d) => d.name).filter(Boolean)));
    } catch (e) {
      console.warn(e);
      setSubjectsDetail([]);
      setSubjects([]);
    }
  };

const normalizeSchedule = (raw) => {
  if (!raw || typeof raw !== "object") return emptySchedule;
  const out = {};
  days.forEach((d) => {
    const arr = Array.isArray(raw[d]) ? raw[d] : [];
    const row = Array(7).fill(null);
    for (let i = 0; i < Math.min(7, arr.length); i++) {
      const s = arr[i];
      row[i] = s ? { subject: s.subject || "", teacher: s.teacher || "", room: s.room || "" } : null;
    }
    out[d] = row;
  });
  return out;
};

// استبدل الدالة كاملة
const fetchSchedule = async (classId) => {
  const effectiveClassId =
    classId === "All" && classes.length ? String(classes[0].id) : classId;

  setLoading(true);
  setError("");
  try {
    if (!effectiveClassId || effectiveClassId === "All") {
      setScheduleData(emptySchedule);
      return;
    }

    const url = `${API_BASE}${ENDPOINTS.scheduleGet(effectiveClassId)}`;
    console.log("[Schedule] GET:", url);

    const res = await fetch(url);

    // جرّب تقرأ JSON، وإذا فشل خُد النص كما هو لتعرض رسالة السيرفر
    let payload, text;
    try { payload = await res.json(); } catch { text = await res.text(); }

    if (!res.ok) {
      const msg = (payload && payload.message) || text || `HTTP ${res.status}`;
      setError(`Schedule GET failed (${res.status}): ${msg}`);
      setScheduleData(emptySchedule);
      return;
    }

    const data = payload || {};
    setScheduleData(
      data && typeof data === "object" && Object.keys(data).length
        ? normalizeSchedule(data)
        : emptySchedule
    );
  } catch (e) {
    setError(`Schedule fetch crashed: ${e.message || e}`);
    setScheduleData(emptySchedule);
  } finally {
    setLoading(false);
  }
};

function isTeacherAvailable(av, dayLabel, pStart, pEnd) {
  const map = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Saturday: "Sat" };
  const key = map[dayLabel] || "Mon";
  const slots = av[key] || [];
  if (!slots.length) return true; // بدون بيانات = متاح
  return slots.some((s) => pStart >= s.start && pEnd <= s.end);
}

  /* ========== Effects ========== */
  useEffect(() => {
    fetchClassesFromDb();
    fetchTeachersFromDb();
  }, []);

  useEffect(() => {
    fetchSubjectsFromDb(selectedClassId);
    fetchSchedule(selectedClassId);
  }, [selectedClassId, classes.length]);

  /* ===== Derived for timing ===== */
  const currentClassName =
    classes.find((c) => String(c.id) === String(selectedClassId))?.name || "";
  const breakAfter = getBreakAfterIndexByClassName(currentClassName);
  const { spans: periodSpans } = buildPeriodTimeSpans({
    startHH: 8,
    startMM: 0,
    perMin: 50,
    breakAfter,
    breakMin: 25,
  });

  /* ========== Editing helpers ========== */
  const handleSubjectChange = (day, periodIndex, newSubject) => {
    setScheduleData((prev) => {
      const updated = { ...prev, [day]: [...prev[day]] };
      const oldSession = updated[day][periodIndex] || { subject: "", teacher: "", room: "" };
      updated[day][periodIndex] = { ...oldSession, subject: newSubject };
      return updated;
    });
  };

  const filteredSchedule = useMemo(() => {
    const out = {};
    for (const day of days) {
      out[day] = (scheduleData?.[day] || []).map((session) => {
        if (!session) return null;
        const matchTeacher = selectedTeacher === "All" || session.teacher === selectedTeacher;
        const matchSubject = selectedSubject === "All" || session.subject === selectedSubject;
        return matchTeacher && matchSubject ? session : null;
      });
    }
    return out;
  }, [scheduleData, selectedTeacher, selectedSubject]);

  /* ========== Export PDF ========== */
  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Period", ...days];
    const tableRows = [];

    const rows = [];
    for (let i = 0; i < periods.length; i++) {
      rows.push({ type: "period", idx: i, label: `${periods[i]} Period (${periodSpans[i].start}–${periodSpans[i].end})` });
      if (i === breakAfter - 1) rows.push({ type: "break", label: "Break (25 min)" });
    }

    rows.forEach((r) => {
      if (r.type === "break") {
        tableRows.push(["Break (25 min)", ...days.map(() => "—")]);
      } else {
        const i = r.idx;
        const row = [r.label];
        days.forEach((day) => {
          const session = filteredSchedule[day]?.[i];
          const value = session ? `${session.subject}\n${session.teacher}\n${session.room}` : "—";
          row.push(value);
        });
        tableRows.push(row);
      }
    });

    doc.text("Weekly Class Schedule", 14, 14);
    if (selectedClassId !== "All") {
      const cls = classes.find((c) => String(c.id) === String(selectedClassId));
      doc.text(`Class: ${cls?.name || selectedClassId}`, 14, 20);
    }

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 26,
      styles: { fontSize: 8 },
      theme: "grid",
    });

    doc.save("filtered_schedule.pdf");
  };

  /* ========== Save ========== */
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const effectiveClassId =
        selectedClassId === "All" && classes.length ? String(classes[0].id) : selectedClassId;

      const res = await fetch(`${API_BASE}${ENDPOINTS.schedulePut(effectiveClassId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleData),
      });
      if (!res.ok) throw new Error("Failed to save schedule");
      setInfo("Saved ✅");
      setTimeout(() => setInfo(""), 2000);
    } catch (e) {
      console.warn(e);
      setError("Saving failed. Please check server logs/endpoints.");
    } finally {
      setSaving(false);
    }
  };
// ضعها داخل الـ component (Schedule)
const handleClearAll = () => {
  if (!window.confirm("Are you sure to clear all table?")) return;

  // امسح الجدول بالكامل محليًا
  setScheduleData({
    Monday: Array(7).fill(null),
    Tuesday: Array(7).fill(null),
    Wednesday: Array(7).fill(null),
    Thursday: Array(7).fill(null),
    Saturday: Array(7).fill(null),
  });

  setInfo("Cleared. Click Save to persist.");
  setTimeout(() => setInfo(""), 2000);
};

  /* ===================== UI ===================== */
  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen text-gray-800">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Weekly Class Schedule</h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {selectedClassId !== "All" && (
            <p className="text-xs text-gray-500 mt-1">
              Class:&nbsp;
              {classes.find((c) => String(c.id) === String(selectedClassId))?.name || selectedClassId}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={exportToPDF}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            📄 Export as PDF
          </button>
<button
  onClick={handleClearAll}
  className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 transition"
>
  🗑️ Clear all
</button>

          <button
  onClick={async () => {
    try {
      const cid = selectedClassId === "All" && classes.length ? String(classes[0].id) : selectedClassId;
      if (!cid || cid === "All") return;
      setSaving(true); setError(""); setInfo("");

      const seed = Date.now(); // عشوائي كل كبسة
      const res = await fetch(`${API_BASE}/schedule/auto?classId=${encodeURIComponent(cid)}&seed=${seed}`, {
        method: "POST"
      });

      let payload, text;
      try { payload = await res.json(); } catch { text = await res.text(); }
      if (!res.ok) throw new Error(payload?.message || text || "Auto-build failed");

      if (payload?.schedule) setScheduleData(payload.schedule);   // اعرض النتيجة فوراً
      setInfo("تم التوليد ✅");                                   // تلميح بسيط
      if (payload?.meta?.leftover_unassigned > 0) {
        setError(`بقي ${payload.meta.leftover_unassigned} حصص غير معيّنة بسبب قيود التوافر/التضارب.`);
      }
    } catch (e) {
      setError(e.message || "Auto-build failed");
    } finally {
      setSaving(false);
      setTimeout(() => setInfo(""), 2000);
    }
  }}
  className="bg-amber-500 text-white px-3 py-2 rounded hover:bg-amber-700 transition"
>
  ⚙️ Auto Build
</button>

          <button
            onClick={() => setIsEditing((v) => !v)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {isEditing ? "✅ Done Editing" : "✏️ Edit Schedule"}
          </button>

          {isEditing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 disabled:opacity-60 text-white px-4 py-2 rounded hover:bg-emerald-700 transition"
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          )}
        </div>
      </div>

      {(error || info) && (
        <div
          className={`mb-4 p-3 rounded border ${
            error
              ? "bg-red-100 text-red-700 border-red-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {error || info}
        </div>
      )}

      {/* Filters (من الداتابيس) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Class */}
        <select
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          <option value="All">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || `Class ${c.id}`}
            </option>
          ))}
        </select>

        {/* Teacher filter */}
        <select
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm"
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
        >
          <option value="All">All Teachers</option>
          {teachers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Subject filter */}
        <select
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="All">All Subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center justify-center text-sm text-gray-600">
          📅 {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Table (نفس الشكل تمامًا) */}
      <div className="overflow-x-auto rounded-xl shadow bg-white">
        <table className="w-full text-sm text-left min-w-[800px]">
          <thead>
            <tr className="bg-gray-100 border-b text-gray-700">
              <th className="px-4 py-3">Period</th>
              {days.map((day) => (
                <th key={day} className="px-4 py-3 text-center">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = [];
              for (let i = 0; i < periods.length; i++) {
                rows.push({ type: "period", periodIndex: i, label: `${periods[i]} Period (${periodSpans[i].start}–${periodSpans[i].end})` });
                if (i === breakAfter - 1) rows.push({ type: "break", label: "Break (25 min)" });
              }
              return rows.map((row, idx) => {
                if (row.type === "break") {
                  return (
                    <tr key={`break-${idx}`} className="border-b bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-600">{row.label}</td>
                      {days.map((day) => (
                        <td key={`${day}-break`} className="px-4 py-3 text-center text-xs text-gray-500">
                          —
                        </td>
                      ))}
                    </tr>
                  );
                }
                const periodIndex = row.periodIndex;
                return (
                  <tr key={`p-${periodIndex}`} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-600">{row.label}</td>
                    {days.map((day) => {
                      const session = filteredSchedule?.[day]?.[periodIndex];
                      const baseSubject = scheduleData?.[day]?.[periodIndex]?.subject || "";
                      const color = subjectColors[session?.subject || baseSubject] || "bg-white";
                      return (
                        <td key={`${day}-${periodIndex}`} className={`px-4 py-3 ${color}`}>
                          {isEditing ? (
                            <div className="space-y-1">
                              <select
                                value={baseSubject}
                                onChange={(e) => handleSubjectChange(day, periodIndex, e.target.value)}
                                className="w-full rounded border-gray-300 p-1 text-sm"
                              >
                                {subjects.map((subj) => (
                                  <option key={subj} value={subj}>
                                    {subj}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="text"
                                className="w-full rounded border-gray-300 p-1 text-xs"
                                value={scheduleData?.[day]?.[periodIndex]?.teacher || ""}
                                onChange={(e) =>
                                  setScheduleData((prev) => {
                                    const updated = { ...prev, [day]: [...prev[day]] };
                                    const old = updated[day][periodIndex] || { subject: "", teacher: "", room: "" };
                                    updated[day][periodIndex] = { ...old, teacher: e.target.value };
                                    return updated;
                                  })
                                }
                                placeholder="Teacher"
                                list="teachers-list"
                              />
                              <datalist id="teachers-list">
                                {teachers.map((t) => (
                                  <option key={t} value={t} />
                                ))}
                              </datalist>

                              <input
                                type="text"
                                className="w-full rounded border-gray-300 p-1 text-xs"
                                value={scheduleData?.[day]?.[periodIndex]?.room || ""}
                                onChange={(e) =>
                                  setScheduleData((prev) => {
                                    const updated = { ...prev, [day]: [...prev[day]] };
                                    const old = updated[day][periodIndex] || { subject: "", teacher: "", room: "" };
                                    updated[day][periodIndex] = { ...old, room: e.target.value };
                                    return updated;
                                  })
                                }
                                placeholder="Room"
                              />
                            </div>
                          ) : session ? (
                            <>
                              <p className="font-semibold text-sm">{session.subject}</p>
                              <p className="text-xs text-gray-700">{session.teacher}</p>
                              <p className="text-xs text-gray-500">{session.room}</p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-400 italic text-center">—</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-3 text-sm text-gray-500">Loading schedule...</p>}
    </div>
  );
}
