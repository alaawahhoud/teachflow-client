// src/pages/Subjects.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaDownload, FaPlus, FaTrash } from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// استبدلي التعريف القديم بهالتعريف:
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) ||
  (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app")
    ? "https://teachflow-server.onrender.com/api"
    : "http://localhost:4000/api");

/* ---------------- Helpers ---------------- */
const unwrap = (x) =>
  Array.isArray(x)
    ? x
    : x?.subjects ||
      x?.users ||
      x?.teachers ||
      x?.classes ||
      x?.data ||
      x?.rows ||
      [];

const toTeacherLite = (u) => ({
  id: Number(u.id),
  name: u.full_name || u.name || u.username || u.email || String(u.id),
  role: u.role || "",
});

const isTeachRole = (r) => r === "Teacher" || r === "Coordinator";

/* ---------------- Fetchers ---------------- */
async function fetchTeachersFlexible() {
  try {
    const r1 = await fetch(`${API_BASE}/users/teachers`);
    if (r1.ok) {
      const j1 = await r1.json();
      const arr = unwrap(j1).map(toTeacherLite);
      if (arr.length) return arr;
      if (Array.isArray(j1.teachers)) return j1.teachers.map(toTeacherLite);
    }
  } catch {}
  try {
    const r2 = await fetch(`${API_BASE}/users`);
    if (r2.ok) {
      const j2 = await r2.json();
      let arr = unwrap(j2).map(toTeacherLite);
      arr = arr.filter((u) => isTeachRole(u.role));
      return arr;
    }
  } catch {}
  return [];
}

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

async function linkSubjectToClass(subjectId, classId) {
  if (!subjectId || !classId) return;
  try {
    const r = await fetch(
      `${API_BASE}/classes/${classId}/subjects/${subjectId}`,
      { method: "POST" }
    );
    if (r.ok) return true;
  } catch {}
  try {
    const r = await fetch(`${API_BASE}/subjects/${subjectId}/class`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_id: Number(classId),
        classId: Number(classId),
        class: Number(classId),
      }),
    });
    if (r.ok) return true;
  } catch {}
  try {
    const r = await fetch(`${API_BASE}/subjects/${subjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_id: Number(classId),
        classId: Number(classId),
        class: Number(classId),
      }),
    });
    if (r.ok) return true;
  } catch {}
  return false;
}

async function linkSubjectToTeacher(subjectId, teacherId) {
  if (!subjectId || !teacherId) return;
  try {
    const r = await fetch(
      `${API_BASE}/subjects/${subjectId}/teachers/${teacherId}`,
      { method: "POST" }
    );
    if (r.ok) return true;
  } catch {}
  try {
    const r = await fetch(`${API_BASE}/subjects/${subjectId}/teacher`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacher_id: Number(teacherId),
        teacherId: Number(teacherId),
        teacher: Number(teacherId),
      }),
    });
    if (r.ok) return true;
  } catch {}
  try {
    const r = await fetch(`${API_BASE}/subjects/${subjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacher_id: Number(teacherId),
        teacherId: Number(teacherId),
        teacher: Number(teacherId),
      }),
    });
    if (r.ok) return true;
  } catch {}
  return false;
}

/** أهم نقطة: هالدالة دايمًا بترجّع مواد **الصف المطلوب فقط** */
async function fetchSubjectsForClassFlexible(classId) {
  const cidNum = Number(classId);

  // 1) /classes/:id/subjects
  try {
    const r = await fetch(`${API_BASE}/classes/${classId}/subjects`);
    if (r.ok) {
      const j = await r.json();
      const arr = unwrap(j);
      if (arr.length) {
        return arr.map((s) => ({
          id: s.id ?? s.subject_id ?? s.class_subject_id,
          name: s.name,
          hours: Number(s.hours ?? 1),
          description: s.description || "",
          classId: Number(s.class_id ?? s.classId ?? s.class ?? cidNum) || cidNum,
          teacherId: s.teacher_id ?? s.teacherId ?? s.user_id ?? s.teacher?.id ?? null,
          teacherName: s.teacher_name ?? s.teacher?.full_name ?? s.teacher?.name ?? "",
        }));
      }
    }
  } catch {}

  // 2) /subjects?class_id=ID
  try {
    const r = await fetch(`${API_BASE}/subjects?class_id=${encodeURIComponent(classId)}`);
    if (r.ok) {
      const j = await r.json();
      const arr = unwrap(j);
      if (arr.length) {
        return arr
          .filter((s) => Number(s.class_id ?? s.classId ?? s.class ?? NaN) === cidNum)
          .map((s) => ({
            id: s.id ?? s.subject_id ?? s.class_subject_id,
            name: s.name,
            hours: Number(s.hours ?? 1),
            description: s.description || "",
            classId: Number(s.class_id ?? s.classId ?? s.class ?? cidNum) || cidNum,
            teacherId: s.teacher_id ?? s.teacherId ?? s.user_id ?? s.teacher?.id ?? null,
            teacherName: s.teacher_name ?? s.teacher?.full_name ?? s.teacher?.name ?? "",
          }));
      }
    }
  } catch {}

  // 3) fallback: /subjects  ← منفلتر محليًا
  try {
    const r = await fetch(`${API_BASE}/subjects`);
    if (r.ok) {
      const j = await r.json();
      const arr = unwrap(j);
      return arr
        .filter((s) => Number(s.class_id ?? s.classId ?? s.class ?? NaN) === cidNum)
        .map((s) => ({
          id: s.id ?? s.subject_id ?? s.class_subject_id,
          name: s.name,
          hours: Number(s.hours ?? 1),
          description: s.description || "",
          classId: Number(s.class_id ?? s.classId ?? s.class ?? cidNum) || cidNum,
          teacherId: s.teacher_id ?? s.teacherId ?? s.user_id ?? s.teacher?.id ?? null,
          teacherName: s.teacher_name ?? s.teacher?.full_name ?? s.teacher?.name ?? "",
        }));
    }
  } catch {}

  return [];
}

/* ---------------- Component ---------------- */
export default function Subjects() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [subjects, setSubjects] = useState([]); // مواد الصف الحالي فقط
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // فلتر الأستاذ
  const [teacherFilter, setTeacherFilter] = useState("");

  // Modal + form
  const [showModal, setShowModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: "",
    desc: "",
    hours: "1",
    teacher: "", // userId
    classId: "", // الصف للإضافة
  });

  /* أول تحميل */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setMsg("");
        const [cls, tea] = await Promise.all([
          fetchClassesFlexible(),
          fetchTeachersFlexible(),
        ]);
        setClasses(cls);
        setTeachers(tea);

        const firstId = cls?.[0]?.id ? String(cls[0].id) : "";
        setSelectedClassId(firstId);
        setNewSubject((s) => ({ ...s, classId: firstId }));

        if (firstId) {
          const baseSubs = await fetchSubjectsForClassFlexible(firstId);
          const rows = await attachTeacherInfo(baseSubs, firstId);
          setSubjects(rows);
        } else {
          setSubjects([]);
        }
      } catch (e) {
        setMsg(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** ضيف teacherName/teacherId إذا ناقصين */
  const attachTeacherInfo = async (list, classId) => {
    const rows = await Promise.all(
      (list || []).map(async (s) => {
        if (s.teacherId) {
          const t = teachers.find((x) => x.id === Number(s.teacherId));
          return {
            id: s.id,
            name: s.name,
            hours: Number(s.hours ?? 1),
            desc: s.description || "",
            teacherId: Number(s.teacherId),
            teacherName: s.teacherName || t?.name || "",
            _teachers: t ? [t] : [],
            _classId: Number(s.classId ?? classId ?? 0),
            _status: "clean",
          };
        }
        try {
          const trRaw = await fetch(
            `${API_BASE}/subjects/${s.id}/teachers`
          ).then((r) => r.json());
          const tArr = unwrap(trRaw).map(toTeacherLite);
          const first = tArr?.[0];
          return {
            id: s.id,
            name: s.name,
            hours: Number(s.hours ?? 1),
            desc: s.description || "",
            teacherId: first?.id || null,
            teacherName: first?.name || "",
            _teachers: tArr || [],
            _classId: Number(s.classId ?? classId ?? 0),
            _status: "clean",
          };
        } catch {
          return {
            id: s.id,
            name: s.name,
            hours: Number(s.hours ?? 1),
            desc: s.description || "",
            teacherId: null,
            teacherName: "",
            _teachers: [],
            _classId: Number(s.classId ?? classId ?? 0),
            _status: "clean",
          };
        }
      })
    );
    return rows;
  };

  /* تغيير الصف */
  const onChangeClass = async (val) => {
    const cid = String(val || "");
    setSelectedClassId(cid);
    setNewSubject((s) => ({ ...s, classId: cid }));
    setTeacherFilter(""); // صفّي فلتر الأستاذ عند تغيير الصف

    if (!cid) {
      setSubjects([]);
      return;
    }
    setLoading(true);
    try {
      const baseSubs = await fetchSubjectsForClassFlexible(cid);
      const rows = await attachTeacherInfo(baseSubs, cid);
      setSubjects(rows);
    } catch (e) {
      setMsg(e.message || "Failed to load class subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  /* UI-only edits */
  const touch = (s) => (s._status === "new" ? "new" : "dirty");

  const handleInputChange = (e) => {
    setNewSubject({ ...newSubject, [e.target.name]: e.target.value });
  };

  const handleAddSubject = () => {
    if (!newSubject.name || !newSubject.hours || !newSubject.classId) {
      setMsg("Please fill subject name, hours, and class");
      return;
    }
    // منع تكرار الاسم داخل نفس الصف
    const existsInSameClass = subjects.some(
      (x) =>
        Number(x._classId) === Number(newSubject.classId) &&
        (x.name || "").trim().toLowerCase() === newSubject.name.trim().toLowerCase()
    );
    if (existsInSameClass) {
      setMsg("Subject already exists in this class");
      return;
    }
    const t = teachers.find((x) => String(x.id) === String(newSubject.teacher));
    const row = {
      id: undefined,
      name: newSubject.name.trim(),
      hours: Number(newSubject.hours),
      desc: newSubject.desc || "",
      teacherId: t?.id || null,
      teacherName: t?.name || "",
      _teachers: t ? [t] : [],
      _classId: Number(newSubject.classId),
      _status: "new",
    };
    if (String(newSubject.classId) === String(selectedClassId)) {
      setSubjects((prev) => [...prev, row]);
    }
    setNewSubject({
      name: "",
      desc: "",
      hours: "1",
      teacher: "",
      classId: selectedClassId || "",
    });
    setShowModal(false);
  };

  const handleTeacherChange = (index, userId) => {
    const updated = [...subjects];
    const t = teachers.find((x) => String(x.id) === String(userId));
    updated[index] = {
      ...updated[index],
      teacherId: userId ? Number(userId) : null,
      teacherName: t?.name || "",
      _status: touch(updated[index]),
    };
    setSubjects(updated);
  };

  const handleHourChange = (index, value) => {
    const updated = [...subjects];
    updated[index] = {
      ...updated[index],
      hours: parseInt(value, 10),
      _status: touch(updated[index]),
    };
    setSubjects(updated);
  };

  const handleDeleteSubject = async (id) => {
    if (!id) {
      setSubjects((prev) => prev.filter((s) => s.id));
      return;
    }
    if (!window.confirm("Delete this subject?")) return;
    try {
      await fetch(`${API_BASE}/subjects/${id}`, { method: "DELETE" });
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setMsg("Delete failed");
    }
  };

  /* -------- SAVE -------- */
  const saveAll = async () => {
    try {
      setMsg("");
      const next = [...subjects];

      // 1) إنشاء السطور الجديدة
      for (let i = 0; i < next.length; i++) {
        const s = next[i];
        if (s._status !== "new") continue;

        const classId = Number(s._classId);
        const teacherId = s.teacherId ?? null;

        let res = await fetch(`${API_BASE}/classes/${classId}/subjects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: s.name,
            hours: Number(s.hours),
            class_id: classId,
            teacher_id: teacherId ?? undefined,
          }),
        });

        if (!res.ok) {
          if (res.status === 409) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j?.message || "Subject already exists in this class");
          }
          const res2 = await fetch(`${API_BASE}/subjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: s.name,
              hours: Number(s.hours),
              class_id: classId,
              teacher_id: teacherId ?? undefined,
            }),
          });
          if (!res2.ok) {
            if (res2.status === 409) {
              const j = await res2.json().catch(() => ({}));
              throw new Error(j?.message || "Subject already exists in this class");
            }
            const t = await res2.text().catch(() => "");
            throw new Error(t || "Create failed");
          }
          res = res2;
        }

        const data = await res.json().catch(() => ({}));
        const createdId =
          data?.id || data?.subject_id || data?.class_subject_id || data?.data?.id || null;

        if (!createdId) throw new Error("Create failed (no id)");

        await linkSubjectToClass(createdId, classId);
        if (teacherId) await linkSubjectToTeacher(createdId, teacherId);

        next[i] = { ...s, id: createdId, _status: "clean" };
      }

      // 2) تعديل السطور المعدّلة
      for (let i = 0; i < next.length; i++) {
        const s = next[i];
        if (s._status !== "dirty" || !s.id) continue;

        const classId = Number(s._classId);
        const teacherId = s.teacherId ?? null;

        await fetch(`${API_BASE}/subjects/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: s.name,
            hours: Number(s.hours),
            class_id: classId,
            teacher_id: teacherId,
          }),
        }).catch(() => {});

        await linkSubjectToClass(s.id, classId);
        if (teacherId) await linkSubjectToTeacher(s.id, teacherId);

        next[i] = { ...s, _status: "clean" };
      }

      setSubjects(next);
      setMsg("Saved ✅");
    } catch (e) {
      setMsg(e.message || "Save failed");
    }
  };

  /* -------- فلاتر العرض -------- */
  const visibleSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (teacherFilter && String(s.teacherId || "") !== String(teacherFilter)) return false;
      return true;
    });
  }, [subjects, teacherFilter]);

  /* -------- Export -------- */
  const exportAll = () => {
    const doc = new jsPDF();
    const tableColumn = ["#", "Subject", "Weekly Hours", "Teacher"];
    const tableRows = visibleSubjects.map((subj, index) => [
      index + 1,
      subj.name,
      subj.hours,
      subj.teacherName || "",
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows });
    doc.save("subject_plan.pdf");

    const excelRows = visibleSubjects.map((s, i) => ({
      "#": i + 1,
      Subject: s.name,
      "Weekly Hours": s.hours,
      Teacher: s.teacherName || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subjects");
    XLSX.writeFile(workbook, "subject_plan.xlsx");
  };

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-screen text-gray-800">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Subjects Management</h1>
        <button
          onClick={() => {
            setNewSubject((s) => ({ ...s, classId: selectedClassId || "" }));
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow text-sm"
        >
          <FaPlus /> Add Subject
        </button>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div>
          <h2 className="text-sm text-gray-600 mb-1">Classes</h2>
          <select
            className="w-full border rounded-md px-4 py-2 text-sm text-gray-700"
            value={selectedClassId}
            onChange={(e) => onChangeClass(e.target.value)}
          >
            {!selectedClassId && <option value="">Select class…</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h2 className="text-sm text-gray-600 mb-1">Teacher Filter</h2>
          <select
            className="w-full border rounded-md px-4 py-2 text-sm text-gray-700"
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
          >
            <option value="">All</option>
            {teachers.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">Subject</th>
              <th className="px-6 py-3">Weekly Hours</th>
              <th className="px-6 py-3">Assigned Teacher</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleSubjects.map((subj, index) => (
              <tr key={subj.id || `new-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4">{index + 1}</td>
                <td className="px-6 py-4">
                  <div className="font-medium">{subj.name}</div>
                  <div className="text-xs text-gray-500">{subj.desc}</div>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={subj.hours}
                    onChange={(e) => handleHourChange(index, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={subj.teacherId || ""}
                    onChange={(e) => handleTeacherChange(index, e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-full"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDeleteSubject(subj.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}

            {visibleSubjects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {selectedClassId
                    ? "No subjects match the current filters."
                    : "Choose a class to view its subjects."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end items-center gap-4 mt-6">
        <button
          onClick={exportAll}
          className="flex items-center gap-2 text-gray-600 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-100"
        >
          <FaDownload className="text-sm" />
          Export PDF & Excel
        </button>
        <button
          onClick={saveAll}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow font-medium"
          disabled={!selectedClassId}
          title={!selectedClassId ? "Choose a class first" : undefined}
        >
          Save Changes
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Add New Subject</h3>
            <div className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Subject Name"
                value={newSubject.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-md"
              />
              <input
                type="text"
                name="desc"
                placeholder="Short Description"
                value={newSubject.desc}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-md"
              />

              {/* الصف */}
              <select
                name="classId"
                value={newSubject.classId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* الساعات */}
              <select
                name="hours"
                value={newSubject.hours}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-md"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>

              {/* الأستاذ */}
              <select
                name="teacher"
                value={newSubject.teacher}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="">Select Teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubject}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!newSubject.classId}
                title={!newSubject.classId ? "Choose a class first" : undefined}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {msg && (
        <div className="fixed bottom-4 right-4 bg-white border shadow px-4 py-2 rounded text-sm">
          {msg}
        </div>
      )}
    </div>
  );
}
