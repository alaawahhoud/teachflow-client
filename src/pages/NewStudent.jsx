import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FaChevronDown } from "react-icons/fa";

// نستعمل proxy تبع CRA → fetch('/api/...') بيروح على :4000 تلقائياً

export default function NewStudent() {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [students, setStudents] = useState([]); // [{id,name,class_id,created_at}]
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState("");

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  // Load classes once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/classes`);
        const payload = await res.json();
        const rows = Array.isArray(payload) ? payload : (payload?.data || []);
        const normalized = rows.map((c) => ({
          id: String(c.id),
          name:
            c.name ??
            (c.grade ? `Grade ${c.grade}${c.section ? ` - ${c.section}` : ""}` : `Class ${c.id}`),
        }));
        setClasses(normalized);
      } catch (e) {
        console.error("classes fetch error", e);
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  // Load students when class changes
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    (async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch(`/api/students?class_id=${classId}`);
        const payload = await res.json();
        const rows = Array.isArray(payload) ? payload : (payload?.data || []);
        setStudents(rows);
      } catch (e) {
        console.error("students fetch error", e);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [classId]);

  // Close export menu when clicking outside
  useEffect(() => {
    const onClickAway = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("click", onClickAway);
    return () => document.removeEventListener("click", onClickAway);
  }, []);

  const classNameSelected = useMemo(() => {
    const c = classes.find((x) => x.id === classId);
    return c ? c.name : "";
  }, [classes, classId]);

  const canSave = name.trim().length > 0 && !!classId;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      if (editingId) {
        // UPDATE
        const res = await fetch(`/api/students/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);
        const payload = await res.json();
        const updated = payload?.data ?? payload;
        setStudents((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        setToast("Student updated successfully");
      } else {
        // CREATE
        const res = await fetch(`/api/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), class_id: Number(classId) }),
        });
        if (res.status === 409) {
          setToast("Student already exists in this class");
        } else {
          if (!res.ok) throw new Error(`Create failed (${res.status})`);
          const payload = await res.json();
          const created = payload?.data ?? payload;
          if (created && created.id) {
            setStudents((prev) => [...prev, created]);
          } else {
            // احتياط: في حال السيرفر رجّع {ok:true} بدون جسم
            const refetch = await fetch(`/api/students?class_id=${classId}`);
            const p2 = await refetch.json();
            setStudents(Array.isArray(p2) ? p2 : (p2?.data || []));
          }
          setToast("Student saved successfully");
        }
      }
      setName("");
      setEditingId(null);
    } catch (e) {
      console.error(e);
      setToast("Operation failed");
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(""), 2000);
    }
  };

  const handleCancel = () => {
    setName("");
    setEditingId(null);
  };

  const startEdit = (student) => {
    setName(student.name);
    setEditingId(student.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (student) => {
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setToast("Student deleted");
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      console.error(e);
      setToast("Delete failed");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const exportPDF = () => {
    if (!classId || students.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Students — ${classNameSelected}`, 14, 16);
    const rows = students.map((s, i) => [String(i + 1), s.name]);
    autoTable(doc, {
      head: [["#", "Student Name"]],
      body: rows,
      startY: 22,
      styles: { fontSize: 11 },
      headStyles: { fillColor: [219, 234, 254], textColor: 44 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      theme: "striped",
    });
    const safeName = classNameSelected.replace(/\s+/g, "_").toLowerCase();
    doc.save(`students_${safeName}.pdf`);
  };

  const exportExcel = () => {
    if (!classId || students.length === 0) return;
    const sheetData = [["#", "Student Name"], ...students.map((s, i) => [i + 1, s.name])];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, classNameSelected || "Students");
    const safeName = (classNameSelected || "class").replace(/\s+/g, "_").toLowerCase();
    XLSX.writeFile(wb, `students_${safeName}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-800 p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-4xl mx-auto"
      >
        {/* Card: Add/Update Student */}
        <div className="bg-white rounded-xl shadow p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">New Student</h1>
          </div>

          <form onSubmit={handleSave} className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Student Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ali Ahmad"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Grade (from classes)</label>
              <div className="relative">
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 pr-9"
                  disabled={loadingClasses}
                >
                  <option value="">{loadingClasses ? "Loading..." : "Select grade"}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2 items-center">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSave || isSaving}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? (isSaving ? "Updating..." : "Update Student") : (isSaving ? "Saving..." : "Save Student")}
              </button>

              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 4, opacity: 0 }}
                    className="ml-4 text-green-600 text-sm font-medium"
                  >
                    {toast}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow mt-6 p-6 relative">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-gray-700 font-semibold">
              {classId ? `New Students — ${classNameSelected}` : "Select a grade to view students"}
              {loadingStudents && <span className="ml-2 text-xs text-gray-500">(loading...)</span>}
            </div>

            <div ref={exportRef} className="relative">
              <button
                onClick={() => setExportOpen((s) => !s)}
                disabled={!classId || students.length === 0}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export
              </button>
              <AnimatePresence>
                {exportOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow"
                  >
                    <button
                      onClick={() => { setExportOpen(false); exportPDF(); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    >
                      Export PDF
                    </button>
                    <button
                      onClick={() => { setExportOpen(false); exportExcel(); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-t border-gray-100"
                    >
                      Export Excel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {classId && (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-blue-200 rounded-lg overflow-hidden">
                <thead className="bg-blue-100 text-sm text-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left w-16">#</th>
                    <th className="px-4 py-2 text-left">Student Name</th>
                    <th className="px-4 py-2 text-left w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-gray-500">
                        No students yet.
                      </td>
                    </tr>
                  )}
                  {students.map((s, idx) => (
                    <tr key={s.id} className={idx % 2 ? "bg-blue-50" : "bg-white"}>
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{s.name}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
