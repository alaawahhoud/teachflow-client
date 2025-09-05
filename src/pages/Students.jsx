// src/pages/Students.jsx 
import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000/api";

const getStatusColor = (status) => {
  switch (status) {
    case "Excellent": return "bg-green-100 text-green-700";
    case "Good":      return "bg-blue-100 text-blue-700";
    case "Average":   return "bg-yellow-100 text-yellow-700";
    case "Weak":      return "bg-red-100 text-red-700";
    default:          return "bg-gray-100 text-gray-700";
  }
};

const STATUS_OPTIONS = ["All", "Excellent", "Good", "Average", "Weak"];

/* helpers */
const toStr = (v) => (v === null || v === undefined ? null : String(v));
const eq = (a, b) => toStr(a) === toStr(b);
const numLikeStr = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : null;
};

const findClassIdByName = (name, classes) => {
  const n = String(name || "").toLowerCase().trim();
  const row = classes.find((c) => String(c.name || "").toLowerCase().trim() === n);
  return row ? String(row.id) : null;
};

/* ما في فلترة بالمادة نهائيًا — المادّة سياقية فقط */
const matchesFiltersLocally = (s, filters, classes) => {
  // الصف
  if (filters.grade !== "All") {
    const want = String(filters.grade);
    const classIdCandidates = [
      s.class_id, s.classId, s.grade_id, s.gradeId, s.class?.id, s.grade?.id,
      numLikeStr(s.class), numLikeStr(s.grade),
    ].map(toStr).filter(Boolean);

    let classOk = classIdCandidates.some((id) => eq(id, want));
    if (!classOk) {
      const classNameCand =
        (typeof s.class_name === "string" && s.class_name) ||
        (typeof s.className === "string" && s.className) ||
        (typeof s.class === "string" && s.class) ||
        (typeof s.grade_name === "string" && s.grade_name) ||
        (typeof s.grade === "string" && s.grade) ||
        null;
      const inferredId = classNameCand ? findClassIdByName(classNameCand, classes) : null;
      classOk = eq(inferredId, want);
    }
    if (!classOk) return false;
  }

  // الأسبوع (متسامحة: إذا السجل ما فيه week ما منستبعده)
  if (filters.week !== "All") {
    const wantWeek = Number(filters.week);
    if (!Number.isNaN(wantWeek)) {
      const rowWeek = Number(s.week ?? s.week_number ?? s.weekNumber ?? NaN);
      if (!Number.isNaN(rowWeek) && rowWeek !== wantWeek) return false;
    }
  }

  return true;
};

const Students = () => {
  const [students, setStudents] = useState([]);

  // فلاتر من DB
  const [classes, setClasses]   = useState([{ id: "All", name: "All" }]);
  const [subjects, setSubjects] = useState([{ id: "All", name: "All" }]);

  const [filters, setFilters] = useState({ grade: "All", subject: "All", week: "All" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // تعديلات عامة (بدون سياق مادّة/أسبوع) => /students/:id
  const [edits, setEdits] = useState({}); // { [id]: { status?, note? } }

  // حالة/ملاحظة سياقية حسب (subject+week) محمّلة من جدول student_status_weeks
  const [ctxStatus, setCtxStatus] = useState({});   // { [studentId]: {status, note} }
  const [editsWeeks, setEditsWeeks] = useState({}); // { [studentId]: {status?, note?} }

  const [loading, setLoading] = useState(false);

  // مودالات
  const [viewNoteStudent, setViewNoteStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [modalNote, setModalNote] = useState("");

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      }),
    []
  );

  const isPerWeekContext = filters.subject !== "All" && filters.week !== "All";

  /* الصفوف */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/classes`);
        const data = await res.json();
        const rows = (data.classes || data.data || []).map((c) => ({
          id: String(c.id),
          name:
            c.name ||
            `${c.grade ?? ""}${c.section ? ` ${c.section}` : ""}`.trim() ||
            `Class ${c.id}`,
        }));
        setClasses([{ id: "All", name: "All" }, ...rows]);
      } catch (e) {
        console.error("classes error", e);
        setClasses([{ id: "All", name: "All" }]);
      }
    })();
  }, []);

  /* المواد حسب الصف */
  useEffect(() => {
    (async () => {
      if (filters.grade === "All") {
        setSubjects([{ id: "All", name: "All" }]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/classes/${filters.grade}/subjects`);
        const data = await res.json();
        const rows = (data.subjects || data.data || []).map((s) => ({
          id: String(s.id),
          name: s.name,
        }));
        setSubjects([{ id: "All", name: "All" }, ...rows]);
      } catch (e) {
        console.error("subjects error", e);
        setSubjects([{ id: "All", name: "All" }]);
      }
    })();
  }, [filters.grade]);

  /* جلب الطلاب — فقط حسب الصف/البحث/الحالة (المادّة والأسبوع محلياً/سياقي) */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (filters.grade !== "All")   qs.set("class_id", filters.grade);
        if (search) qs.set("q", search);
        if (statusFilter !== "All") qs.set("status", statusFilter);

        const res = await fetch(`${API_BASE}/students?` + qs.toString());
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : data.data || []);
        setEdits({});
      } catch (e) {
        console.error("list error", e);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.grade, search, statusFilter]);

  /* حمّل حالة/ملاحظة سياقية من جدول student_status_weeks */
  useEffect(() => {
    (async () => {
      // إذا ما في سياق كامل، فضّي الماب
      if (!isPerWeekContext) { setCtxStatus({}); setEditsWeeks({}); return; }

      try {
        const qs = new URLSearchParams({
          subject_id: String(filters.subject),
          week_number: String(filters.week),
        });
        if (filters.grade !== "All") qs.set("class_id", String(filters.grade));

        const res = await fetch(`${API_BASE}/student-status-weeks?` + qs.toString());
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
        const map = {};
        for (const r of rows) {
          const sid = String(r.student_id ?? r.studentId ?? r.student?.id ?? "");
          if (!sid) continue;
          map[sid] = {
            status: r.status || "",
            note: r.note || "",
          };
        }
        setCtxStatus(map);
        setEditsWeeks({});
      } catch (e) {
        console.error("ctx status load error", e);
        setCtxStatus({});
        setEditsWeeks({});
      }
    })();
  }, [isPerWeekContext, filters.subject, filters.week, filters.grade, students.length]);

  /* العرض + ترتيب أبجدي */
  const visibleStudents = useMemo(() => {
    const byName = (a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });

    let arr = students.filter((s) =>
      matchesFiltersLocally(s, filters, classes)
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((s) => String(s.name || "").toLowerCase().includes(q));
    }

    if (statusFilter !== "All") {
      // فلترة حسب حالة العرض الحالية (سياقية إذا موجودة)
      arr = arr.filter((s) => {
        const cur = isPerWeekContext
          ? (ctxStatus[String(s.id)]?.status ?? "")
          : String(s.status || "");
        return cur === statusFilter;
      });
    }

    return arr.sort(byName);
  }, [students, filters, search, statusFilter, classes, isPerWeekContext, ctxStatus]);

  /* helpers لعرض القيمة الحالية */
  const currentStatusFor = (s) =>
    isPerWeekContext ? (ctxStatus[String(s.id)]?.status ?? "") : (s.status || "");
  const currentNoteFor = (s) =>
    isPerWeekContext ? (ctxStatus[String(s.id)]?.note ?? "") : (s.note || "");

  /* تغيير الحالة inline */
  const changeStatusInline = (studentId, newStatus) => {
    const sid = String(studentId);

    if (isPerWeekContext) {
      // عدّل الحالة السياقية
      setCtxStatus((prev) => ({
        ...prev,
        [sid]: { ...(prev[sid] || { note: "" }), status: newStatus },
      }));
      setEditsWeeks((e) => ({
        ...e,
        [sid]: { ...(e[sid] || {}), status: newStatus },
      }));
    } else {
      // عدّل الحالة العامة
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
      );
      setEdits((e) => ({
        ...e,
        [sid]: { ...(e[sid] || {}), status: newStatus },
      }));
    }
  };

  /* الملاحظات */
  const openEditNote = (s) => {
    setEditingStudent(s);
    setModalNote(currentNoteFor(s));
  };

  const saveNoteFromModal = () => {
    if (!editingStudent) return;
    const sid = String(editingStudent.id);

    if (isPerWeekContext) {
      setCtxStatus((prev) => ({
        ...prev,
        [sid]: { ...(prev[sid] || { status: "" }), note: modalNote },
      }));
      setEditsWeeks((e) => ({
        ...e,
        [sid]: { ...(e[sid] || {}), note: modalNote },
      }));
    } else {
      setStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, note: modalNote } : s))
      );
      setEdits((e) => ({
        ...e,
        [sid]: { ...(e[sid] || {}), note: modalNote },
      }));
    }

    setEditingStudent(null);
  };

  /* حفظ مجمّع */
  const hasChanges = Object.keys(edits).length > 0 || Object.keys(editsWeeks).length > 0;

  const saveAll = async () => {
    if (!hasChanges) return;

    try {
      // 1) حفظ السياقي إلى student_status_weeks (إذا في سياق كامل)
      if (isPerWeekContext && Object.keys(editsWeeks).length) {
        const rows = Object.entries(editsWeeks).map(([sid, payload]) => ({
          student_id: Number(sid),
          subject_id: Number(filters.subject),
          week_number: Number(filters.week),
          status: payload.status ?? (ctxStatus[sid]?.status ?? ""),
          note:   payload.note   ?? (ctxStatus[sid]?.note   ?? ""),
        }));

        // جرّب bulk أولاً
        let ok = false;
        try {
          const r = await fetch(`${API_BASE}/student-status-weeks/bulk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows }),
          });
          ok = r.ok;
        } catch {}

        // fallback: upsert واحد واحد
        if (!ok) {
          for (const row of rows) {
            await fetch(`${API_BASE}/student-status-weeks`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(row), // upsert by (student_id, subject_id, week_number)
            }).catch(() => {});
          }
        }
      }

      // 2) حفظ التعديلات العامة (لما ما يكون في سياق)
      if (!isPerWeekContext && Object.keys(edits).length) {
        for (const sid of Object.keys(edits)) {
          await fetch(`${API_BASE}/students/${sid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(edits[sid]), // {status?, note?}
          }).catch(() => {});
        }
      }

      setEdits({});
      setEditsWeeks({});
      // ممكن تفعيل سناكبار هون إذا بدك
    } catch {
      alert("Save failed");
    }
  };

  /* Export حسب المعروض (يستخدم القيم السياقية إذا متوفرة) */
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Student Academic Overview", 14, 10);
    autoTable(doc, {
      startY: 20,
      head: [["#", "Full Name", "Academic Status", "Note"]],
      body: visibleStudents.map((s, i) => [i + 1, s.name, currentStatusFor(s), currentNoteFor(s)]),
    });
    doc.save("students.pdf");
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      visibleStudents.map((s, i) => ({
        "#": i + 1,
        "Full Name": s.name,
        "Academic Status": currentStatusFor(s),
        Note: currentNoteFor(s),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "students.xlsx");
  };

  const weekOptions = useMemo(
    () => ["All", ...Array.from({ length: 45 }, (_, i) => String(i + 1))],
    []
  );

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen">
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Student Academic Overview</h2>
      <p className="text-sm text-gray-500 mb-4">Today: {today}</p>

      {/* Export */}
      <div className="text-sm flex gap-3 mb-4">
        <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded">
          <FaFilePdf /> Export PDF
        </button>
        <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded">
          <FaFileExcel /> Export Excel
        </button>
      </div>

      {/* Filters: Grade / Subject / Week */}
      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Grade (Class)</label>
          <select
            value={filters.grade}
            onChange={(e) => setFilters({ ...filters, grade: e.target.value, subject: "All" })}
            className="w-full px-4 py-2 border rounded-md bg-gray-100 text-sm"
          >
            {classes.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Subject</label>
          <select
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            className="w-full px-4 py-2 border rounded-md bg-gray-100 text-sm"
            disabled={filters.grade === "All"}
            title={filters.grade === "All" ? "Choose a class first" : undefined}
          >
            {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Week</label>
          <select
            value={filters.week}
            onChange={(e) => setFilters({ ...filters, week: e.target.value })}
            className="w-full px-4 py-2 border rounded-md bg-gray-100 text-sm"
          >
            {weekOptions.map((w) => (<option key={w} value={w}>{w}</option>))}
          </select>
        </div>
      </div>

      {/* Search Row */}
      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Search by Name</label>
          <input
            type="text"
            placeholder="Type student name..."
            className="w-full px-4 py-2 border rounded-md bg-gray-100 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border rounded-md bg-gray-100 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm text-gray-700">
          <thead>
            <tr className="border-b bg-blue-50">
              <th className="text-left px-6 py-4 font-semibold w-12">#</th>
              <th className="text-left px-6 py-4 font-semibold">Full Name</th>
              <th className="text-left px-6 py-4 font-semibold">Academic Status</th>
              <th className="text-left px-6 py-4 font-semibold w-[50%]">Notes</th>
              <th className="px-4 py-4 w-20 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-6 py-6 text-gray-500">Loading...</td></tr>
            )}

            {!loading && visibleStudents.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-6 text-gray-500">No results.</td></tr>
            )}

            {!loading && visibleStudents.map((s, i) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{i + 1}</td>
                <td className="px-6 py-3">{s.name}</td>

                <td className="px-6 py-3">
                  <select
                    className={`rounded px-2 py-1 ${getStatusColor(currentStatusFor(s))}`}
                    value={currentStatusFor(s)}
                    onChange={(e) => changeStatusInline(s.id, e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Average">Average</option>
                    <option value="Weak">Weak</option>
                  </select>
                </td>

                <td className="px-6 py-3">
                  <div className="line-clamp-2 break-words">
                    {currentNoteFor(s) || <span className="text-gray-400">—</span>}
                  </div>
                </td>

                <td className="px-4 py-3 space-x-3 text-gray-500">
                  <button
                    className="hover:text-gray-700"
                    title="View note"
                    onClick={() => setViewNoteStudent(s)}
                  >
                    <FaEye />
                  </button>
                  <button
                    className="hover:text-gray-700"
                    title="Edit note"
                    onClick={() => openEditNote(s)}
                  >
                    <FaEdit />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Save */}
      <div className="flex justify-end mt-6">
        <button
          onClick={saveAll}
          disabled={!hasChanges}
          className={`px-5 py-2 rounded-md text-white shadow ${
            hasChanges ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
          }`}
        >
          Save
        </button>
      </div>

      {/* View Note Modal */}
      {viewNoteStudent && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Note</h3>
            <div className="max-h-[50vh] overflow-auto whitespace-pre-wrap text-sm">
              {currentNoteFor(viewNoteStudent) || "—"}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setViewNoteStudent(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Note</h3>
            <textarea
              className="w-full h-40 px-4 py-2 border rounded-md bg-gray-50"
              value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveNoteFromModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
