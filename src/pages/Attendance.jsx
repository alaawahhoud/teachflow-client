// client/src/pages/Attendance.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* ===================== إعدادات عامة ===================== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) ||
  "http://localhost:4000/api";

// اختياري محلي فقط
const LATE_AFTER = "07:40:00";

/* ===================== Helpers مشتركة (مثل Subjects.jsx) ===================== */
const unwrap = (x) =>
  Array.isArray(x)
    ? x
    : x?.data || x?.rows || x?.items || x?.users || x?.teachers || x?.classes || x?.profiles || [];

/** معلّمين (fallback مرن) */
async function fetchTeachersFlexible() {
  try {
    const r1 = await fetch(`${API_BASE}/users/teachers`);
    if (r1.ok) {
      const j = await r1.json();
      const arr = unwrap(j).map((u) => ({
        id: Number(u.id ?? u.user_id),
        name: u.full_name || u.name || u.username || u.email || String(u.id),
      }));
      if (arr.length) return arr;
    }
  } catch {}
  try {
    const r2 = await fetch(`${API_BASE}/users`);
    if (r2.ok) {
      const j = await r2.json();
      const arr = unwrap(j)
        .filter((u) =>
          ["Teacher", "Coordinator", "Principal", "Admin", "IT Support", "Cycle Head"].includes(
            u.role
          )
        )
        .map((u) => ({
          id: Number(u.id),
          name: u.full_name || u.name || u.username || u.email || String(u.id),
        }));
      return arr;
    }
  } catch {}
  return [];
}

/** الصفوف من DB */
async function fetchClassesFlexible() {
  try {
    const r = await fetch(`${API_BASE}/classes`);
    if (r.ok) {
      const j = await r.json();
      return unwrap(j).map((c) => ({
        id: Number(c.id),
        name:
          c.name ||
          `${c.grade ?? ""}${c.section ? ` ${c.section}` : ""}`.trim() ||
          `Class ${c.id}`,
        grade: c.grade ?? null,
        section: c.section ?? null,
      }));
    }
  } catch {}
  return [];
}

/** teacher_profile مرن: منصيد أكتر من endpoint */
async function fetchTeacherProfilesFlexible() {
  const urls = [
    `${API_BASE}/lookups/teacher-profiles`,
    `${API_BASE}/teacher-profiles`,
    `${API_BASE}/users/teacher-profiles`,
    `${API_BASE}/teachers/profiles`,
    `${API_BASE}/users?with=profile`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const j = await r.json();
      const arr = unwrap(j);
      if (!Array.isArray(arr) || !arr.length) continue;

      // نوحّد الحقول
      const profiles = arr.map((p) => ({
        user_id: Number(p.user_id ?? p.id ?? p.uid),
        display_name:
          p.display_name ||
          p.full_name ||
          p.ar_name ||
          p.name ||
          p.username ||
          null,
        class_id:
          Number(
            p.class_id ??
              p.homeroom_class_id ??
              p.main_class_id ??
              p.assigned_class_id ??
              p.classId ??
              NaN
          ) || null,
      }));
      // رجّع كخارطة
      const map = new Map();
      for (const pr of profiles) {
        if (!pr.user_id) continue;
        map.set(pr.user_id, pr);
      }
      return map;
    } catch {}
  }
  return new Map();
}

/* ===================== أدوات وقت/حالة (محلية) ===================== */
const isAfter = (t, cutoff) => (t ? t.localeCompare(cutoff) === 1 : false);
const statusFromCheckIn = (checkIn) => (!checkIn ? "Absent" : isAfter(checkIn, LATE_AFTER) ? "Late" : "Present");

/* ===================== توحيد صفوف السيرفر ===================== */
const normalizeRow = (r) => {
  const id = r.user_id ?? r.teacher_id ?? r.id;
  const name = r.full_name ?? r.name ?? r.teacher_name ?? "";
  const cls = r.class_name ?? r.class ?? r.grade ?? "—";
  const subject = r.subject_name ?? r.subject ?? "—";
  const check_in = (r.check_in_time ?? r.check_in ?? r.in_time ?? "")?.slice(0, 8) || "";
  const check_out = (r.check_out_time ?? r.check_out ?? r.out_time ?? "")?.slice(0, 8) || "";
  const note = r.note ?? r.notes ?? r.reason ?? "";
  const status = r.status ? r.status : statusFromCheckIn(check_in);

  return {
    id,
    name,
    class: cls,         // قد نعيد كتابتها لاحقًا من profile + classes
    subject,
    status,
    notes: note,
    check_in_time: check_in,
    check_out_time: check_out,
    // سنضيف _classId لاحقًا بعد مزج الـ profile
    initials: String(name)
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 3)
      .toUpperCase(),
  };
};

const Attendance = () => {
  /* ========== State للواجهة (بدون تغيير شكل) ========== */
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substr(0, 10));
  const [selectedTeacher, setSelectedTeacher] = useState("All Teachers");
  // تخزين الـ class كـ ID (بس منعرض الاسم) — بدون تغيير شكل الواجهة
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [statusFilters, setStatusFilters] = useState({ Present: true, Absent: true, Late: true });
  const [showExportOptions, setShowExportOptions] = useState(false);
  const exportRef = useRef(null);

  /* ========== بيانات من السيرفر ========== */
  const [teachers, setTeachers] = useState([]);              // صفوف اليوم (بعد التطبيع + الدمج)
  const [teachersMaster, setTeachersMaster] = useState([]);  // لائحة المعلّمين للفلاتر (اسم من profile إن وجد)
  const [classes, setClasses] = useState([]);                // من DB
  const [profilesMap, setProfilesMap] = useState(new Map()); // user_id → {display_name, class_id}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  /* ========== ألوان الحالة (بدون تغيير شكل) ========== */
  const getStatusColor = (status) => {
    const base = "rounded px-3 py-1 text-sm font-medium";
    switch (status) {
      case "Present": return `${base} bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300`;
      case "Late":    return `${base} bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300`;
      case "Absent":  return `${base} bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300`;
      default:        return `${base} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  /* ========== الفلاتر المحلية (للعرض فقط) ========== */
  const toggleStatusFilter = (status) => {
    setStatusFilters((p) => ({ ...p, [status]: !p[status] }));
  };

  const classesMap = useMemo(() => new Map(classes.map((c) => [Number(c.id), c.name])), [classes]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((s) => {
      const matchTeacher = selectedTeacher === "All Teachers" || s.name === selectedTeacher;
      const matchStatus = statusFilters[s.status];
      const matchClass =
        selectedClass === "All Classes" ||
        String(s._classId ?? "") === String(selectedClass); // نطابق بالـ ID
      return matchTeacher && matchStatus && matchClass;
    });
  }, [teachers, selectedTeacher, statusFilters, selectedClass]);

  /* ========== التحميل الأولي: classes + teachers + profiles ========== */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const [cls, tea, profMap] = await Promise.all([
          fetchClassesFlexible(),
          fetchTeachersFlexible(),
          fetchTeacherProfilesFlexible(),
        ]);
        if (ignore) return;

        setClasses(cls);

        // دمج الاسم من profile إذا موجود
        const master = tea.map((t) => {
          const pr = profMap.get(Number(t.id)) || {};
          return {
            id: Number(t.id),
            name: pr.display_name || t.name,
            classId: pr.class_id ?? null,
          };
        });
        setTeachersMaster(master);
        setProfilesMap(profMap);
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load lookups");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  /* ========== جلب حضور اليوم (من السيرفر) ثم دمجه مع profile/classes ========== */
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams();
        params.set("date", selectedDate);

        // فلتر الأستاذ — نبعث teacherId إذا قدرنا
        if (selectedTeacher !== "All Teachers") {
          const t = teachersMaster.find((x) => x.name === selectedTeacher);
          if (t?.id) params.set("teacherId", String(t.id));
          else params.set("teacherName", selectedTeacher);
        }

        // فلاتر الحالة (DB-side إن حابّة) — نتركها، والفلاتر النهائية محليًا كمان
        const enabled = Object.entries(statusFilters).filter(([, on]) => on).map(([k]) => k);
        if (enabled.length && enabled.length < 3) params.set("status", enabled.join(","));

        // جلب القائمة
        const r = await fetch(`${API_BASE}/attendance?${params.toString()}`);
        const j = await r.json().catch(() => ({}));
        let data = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];

        // طبّع
        let rows = (data || []).map(normalizeRow);

        // دمج الاسم من profile + الصف من profile (ثم تحويــله لاسم عبر classesMap)
        rows = rows.map((row) => {
          const pr = profilesMap.get(Number(row.id)) || {};
          const classId = pr.class_id ?? row._classId ?? null;
          const className = classId ? classesMap.get(Number(classId)) || `Class ${classId}` : row.class || "—";
          const name = pr.display_name || row.name;
          return { ...row, name, class: className, _classId: classId ?? null };
        });

        // لو ما في بيانات، إبني افتراضيًا من master (Absent)
        if ((!rows || rows.length === 0) && teachersMaster.length) {
          rows = teachersMaster.map((t) => {
            const className = t.classId ? classesMap.get(Number(t.classId)) || `Class ${t.classId}` : "—";
            return normalizeRow({
              user_id: t.id,
              full_name: t.name,
              class_name: className,
              check_in_time: "",
              check_out_time: "",
              status: "Absent",
              note: "",
            });
          }).map((r,i) => {
            const pr = profilesMap.get(Number(r.id)) || {};
            const classId = pr.class_id ?? teachersMaster.find(x=>x.id===r.id)?.classId ?? null;
            const className = classId ? classesMap.get(Number(classId)) || `Class ${classId}` : r.class || "—";
            const name = pr.display_name || r.name;
            return { ...r, name, class: className, _classId: classId ?? null };
          });
        }

        if (!ignore) setTeachers(rows);
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load attendance");
          setTeachers([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
  }, [selectedDate, selectedTeacher, statusFilters, teachersMaster, profilesMap, classesMap]);

  /* ========== حفظ الحضور ========== */
  const handleSaveAttendance = async () => {
    try {
      for (let s of teachers) {
        const body = {
          user_id: s.id,
          date: selectedDate,
          status: s.status,
          check_in_time: s.check_in_time || null,
          check_out_time: s.check_out_time || null,
          note: s.notes || null,
        };
        const res = await fetch(`${API_BASE}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) console.error("Failed to save:", data?.message || data);
      }
      alert("Attendance saved successfully ✅");
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Something went wrong ❌");
    }
  };

  /* ========== تصدير PDF/Excel (بدون تغيير شكل) ========== */
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Name", "Class", "Subject", "Status", "Notes"]],
      body: filteredTeachers.map((s) => [s.name, s.class, s.subject, s.status, s.notes || ""]),
    });
    doc.save("attendance_report.pdf");
    setShowExportOptions(false);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredTeachers.map((s) => ({
        Name: s.name,
        Class: s.class,
        Subject: s.subject,
        Status: s.status,
        Notes: s.notes || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance_report.xlsx");
    setShowExportOptions(false);
  };

  /* ===================== واجهة (الشكل كما هو) ===================== */
  return (
    <div className="p-6 bg-[#F9FAFB] dark:bg-[#1F2937] min-h-screen text-gray-800 dark:text-white">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Attendance Panel</h2>
        <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-300">TeachFlow</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Date */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Select Date</label>
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Class from DB */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Class</label>
          <select
            className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="All Classes">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Teacher (اسم من teacher_profile إذا متاح) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Teacher</label>
          <select
            className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
          >
            <option>All Teachers</option>
            {teachersMaster.map((t) => (
              <option key={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <label className="block font-semibold mb-2 dark:text-white">Filter by Status</label>
          <div className="flex gap-6 flex-wrap">
            {Object.keys(statusFilters).map((status) => (
              <label key={status} className="flex items-center gap-2 text-sm dark:text-white">
                <input type="checkbox" checked={statusFilters[status]} onChange={() => toggleStatusFilter(status)} />
                {status}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-4 rounded-xl shadow flex items-start gap-2 w-full lg:w-[380px]">
          <span className="text-xl font-bold">⚠️</span>
          <div className="text-sm">
            <strong className="block font-semibold mb-1">Auto-substitution Alert</strong>
            <p className="leading-tight">Auto-substitution triggered for Mr. Ahmad in Grade 9A.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="py-3 px-4">Photo</th>
              <th>Name</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-6 px-4 text-sm text-gray-500 dark:text-gray-300" colSpan={6}>Loading…</td>
              </tr>
            ) : err ? (
              <tr>
                <td className="py-6 px-4 text-sm text-red-600" colSpan={6}>{err}</td>
              </tr>
            ) : (
              filteredTeachers.map((teacher, i) => (
                <tr key={teacher.id ?? i} className="border-t dark:border-gray-600">
                  <td className="py-3 px-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                      i === 0 ? "bg-blue-500" : i === 1 ? "bg-green-500" : "bg-red-500"
                    }`}>
                      {teacher.initials}
                    </div>
                  </td>
                  <td className="dark:text-white">{teacher.name}</td>
                  <td className="dark:text-white">{teacher.class}</td>
                  <td className="dark:text-white">{teacher.subject}</td>
                  <td>
                    <select
                      value={teacher.status}
                      className={getStatusColor(teacher.status)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTeachers((prev) =>
                          prev.map((x) => (x.id === teacher.id ? { ...x, status: v } : x))
                        );
                      }}
                    >
                      <option>Present</option>
                      <option>Late</option>
                      <option>Absent</option>
                    </select>

                    {(teacher.check_in_time || teacher.check_out_time) && (
                      <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                        {teacher.check_in_time && <span>In: {teacher.check_in_time}</span>}
                        {teacher.check_out_time && <span className="ml-2">Out: {teacher.check_out_time}</span>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        className="bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-1 rounded w-36"
                        value={
                          ["Sick", "Death in family", "Transportation Delay"].includes(teacher.notes)
                            ? teacher.notes
                            : "Other"
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setTeachers((prev) =>
                            prev.map((x) => (x.id === teacher.id ? { ...x, notes: v === "Other" ? "" : v } : x))
                          );
                        }}
                      >
                        <option value="">Select reason</option>
                        <option value="Sick">Sick</option>
                        <option value="Death in family">Death in family</option>
                        <option value="Transportation Delay">Transportation Delay</option>
                        <option value="Other">Other</option>
                      </select>

                      {!["Sick", "Death in family", "Transportation Delay"].includes(teacher.notes) && (
                        <input
                          type="text"
                          placeholder="Write note..."
                          className="bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-1 rounded w-full sm:w-48"
                          value={teacher.notes}
                          onChange={(e) => {
                            const v = e.target.value;
                            setTeachers((prev) =>
                              prev.map((x) => (x.id === teacher.id ? { ...x, notes: v } : x))
                            );
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row justify-end gap-4 relative" ref={exportRef}>
        <div className="relative">
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Export
          </button>
          {showExportOptions && (
            <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow z-[9999]">
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                Export as PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                Export as Excel
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleSaveAttendance}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
        >
          Save Attendance
        </button>
      </div>
    </div>
  );
};

export default Attendance;
