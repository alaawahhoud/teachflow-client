// src/pages/Exams.jsx
import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { FaFilePdf, FaFileExcel, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000/api";

/* UI helpers */
const getStatusStyle = (status) => {
  switch (status) {
    case "Draft": return "bg-gray-200 text-gray-800 ring-1 ring-gray-300";
    case "Done Not Corrected": return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300";
    case "Not Done Yet": return "bg-red-100 text-red-700 ring-1 ring-red-300";
    case "Correction in Progress": return "bg-orange-100 text-orange-700 ring-1 ring-orange-300";
    default: return "bg-gray-100 text-gray-600";
  }
};

const examTypeOptions = ["Midterm", "Final", "Quiz", "Essay"];
const durationOptions = ["1 hour","1.5 hours","2 hours","2.5 hours","3 hours","3.5 hours","4 hours"];
const statusOptions = ["Draft", "Done Not Corrected", "Not Done Yet", "Correction in Progress"];

/* utils */
const toStr = (v) => (v === null || v === undefined ? "" : String(v));
const todayISO = () => new Date().toISOString().split("T")[0];

const Exams = () => {
  const navigate = useNavigate();

  // DB-backed options
  const [classes, setClasses] = useState([{ id: "All", name: "All" }]);
  const [subjects, setSubjects] = useState([{ id: "All", name: "All" }]); // subjects of selected grade
  const [subjectsByClass, setSubjectsByClass] = useState({}); // cache per class_id

  // Filters
  const [filters, setFilters] = useState({
    grade: "All",
    subject: "All",
    type: "All",
    status: "All",
    date: "", // "" = All
  });

  // Exams list
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  /* Load classes */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/classes`);
        const j = await r.json();
        const rows = (j.classes || j.data || []).map((c) => ({
          id: String(c.id),
          name: c.name || `${c.grade ?? ""}${c.section ? ` ${c.section}` : ""}`.trim() || `Class ${c.id}`,
        }));
        setClasses([{ id: "All", name: "All" }, ...rows]);
      } catch (e) {
        console.error("classes error", e);
        setClasses([{ id: "All", name: "All" }]);
      }
    })();
  }, []);

  /* Ensure subjects for a class (with caching) */
  const ensureSubjectsForClass = async (classId) => {
    const cid = String(classId || "");
    if (!cid || cid === "All") return [];
    if (subjectsByClass[cid]) return subjectsByClass[cid];
    try {
      const r = await fetch(`${API_BASE}/classes/${cid}/subjects`);
      const j = await r.json();
      const rows = (j.subjects || j.data || []).map((s) => ({
        id: String(s.id),
        name: s.name,
      }));
      setSubjectsByClass((m) => ({ ...m, [cid]: rows }));
      if (cid === String(filters.grade)) {
        setSubjects([{ id: "All", name: "All" }, ...rows]);
      }
      return rows;
    } catch (e) {
      console.error("ensureSubjectsForClass error", e);
      return [];
    }
  };

  /* Load subjects when grade changes (use cache if available) */
  useEffect(() => {
    (async () => {
      if (filters.grade === "All") {
        setSubjects([{ id: "All", name: "All" }]);
        return;
      }
      const rows = await ensureSubjectsForClass(filters.grade);
      setSubjects([{ id: "All", name: "All" }, ...(rows || [])]);
    })();
  }, [filters.grade]);

  /* Fetch exams (extracted to reuse after save) */
  const fetchExams = async () => {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      if (filters.grade !== "All") qs.set("class_id", filters.grade);
      const r = await fetch(`${API_BASE}/exams?` + qs.toString());
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const raw = await r.json();

      const arr = Array.isArray(raw)
        ? raw
        : raw.exams || raw.rows || raw.data || [];

      const norm = arr.map((e) => ({
        id: e.id,
        title: e.title || "",
        class_id: toStr(e.class_id ?? e.classId ?? e.class ?? ""),
        class_name: e.class_name || e.className || "",
        subject_id: toStr(e.subject_id ?? e.subjectId ?? e.subject ?? ""),
        subject_name: e.subject_name || e.subjectName || "",
        type: e.type || "Midterm",
        date: e.date ? String(e.date).slice(0, 10) : todayISO(),
        time: e.time || "08:00",
        duration: e.duration || durationOptions[0],
        status: e.status || "Draft",
        _status: "clean",
      }));

      setExams(norm);
    } catch (e) {
      console.warn("exams fetch fallback (no API yet?)", e.message);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [filters.grade]);

  /* Local filtering */
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (filters.grade !== "All" && toStr(e.class_id) !== toStr(filters.grade)) return false;
      if (filters.subject !== "All" && toStr(e.subject_id) !== toStr(filters.subject)) return false;
      if (filters.type !== "All" && String(e.type) !== filters.type) return false;
      if (filters.status !== "All" && String(e.status) !== filters.status) return false;
      if (filters.date && String(e.date).slice(0,10) !== filters.date) return false;
      return true;
    });
  }, [exams, filters]);

  /* Mutations */
  const mark = (row) => (row._status === "new" ? "new" : "dirty");

  const updateExam = (id, key, value) => {
    setExams((prev) =>
      prev.map((exam) => exam.id === id ? { ...exam, [key]: value, _status: mark(exam) } : exam)
    );
  };

  const addExam = async () => {
    // Default class (selected grade or first real class)
    const classIdDefault =
      filters.grade !== "All"
        ? filters.grade
        : (classes.find((c) => c.id !== "All")?.id || "");

    // Ensure subjects for that class
    let rowSubjects = [];
    if (classIdDefault) {
      rowSubjects = subjectsByClass[classIdDefault] || await ensureSubjectsForClass(classIdDefault);
    } else {
      rowSubjects = subjects.filter((s) => s.id !== "All");
    }

    // Default subject: chosen in filters (if not All) else first available
    let subjDefault = { id: "", name: "" };
    if (classIdDefault) {
      if (filters.subject && filters.subject !== "All") {
        const picked = rowSubjects.find((s) => String(s.id) === String(filters.subject));
        subjDefault = picked || {
          id: String(filters.subject),
          name: (subjects.find((s) => String(s.id) === String(filters.subject))?.name) || "",
        };
      } else {
        subjDefault = rowSubjects[0] || { id: "", name: "" };
      }
    }

    const newExam = {
      id: `tmp_${Date.now()}`,
      title: "",
      class_id: classIdDefault,
      class_name: classes.find((c) => String(c.id) === String(classIdDefault))?.name || "",
      subject_id: subjDefault?.id || "",
      subject_name: subjDefault?.name || "",
      type: examTypeOptions[0],
      date: filters.date || todayISO(),
      time: "08:00",
      duration: durationOptions[0],
      status: "Draft",
      _status: "new",
    };

    setExams((prev) => [...prev, newExam]);
  };

  const saveAll = async () => {
    try {
      setMsg("");

      // Pre-validate
      for (const row of exams) {
        if (row._status === "new" || row._status === "dirty") {
          const cid = toStr(row.class_id);
          const sid = toStr(row.subject_id);
          if (!cid || cid === "All" || !sid || sid === "All") {
            setMsg("Please select Grade and Subject for all rows before saving.");
            setTimeout(() => setMsg(""), 2500);
            return;
          }
        }
      }

      // Create
      for (const row of exams) {
        if (row._status === "new") {
          const res = await fetch(`${API_BASE}/exams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: row.title || "",
              class_id: Number(row.class_id),
              subject_id: Number(row.subject_id),
              type: row.type,
              date: row.date,
              time: row.time,
              duration: row.duration,
              status: row.status,
            }),
          });
          if (!res.ok) { console.warn("Create failed", await res.text()); continue; }
          const d = await res.json().catch(() => ({}));
          const newId = d?.id || d?.data?.id;
          if (newId) {
            setExams((prev) => prev.map((e) => (e.id === row.id ? { ...e, id: newId, _status: "clean" } : e)));
          }
        }
      }

      // Update
      for (const row of exams) {
        if (row._status === "dirty" && row.id && !String(row.id).startsWith("tmp_")) {
          await fetch(`${API_BASE}/exams/${row.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: row.title || "",
              class_id: Number(row.class_id),
              subject_id: Number(row.subject_id),
              type: row.type,
              date: row.date,
              time: row.time,
              duration: row.duration,
              status: row.status,
            }),
          }).catch(() => {});
        }
      }

      // Refresh from DB
      await fetchExams();
      setMsg("Saved ✅");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      console.error(e);
      setMsg("Save failed");
      setTimeout(() => setMsg(""), 2500);
    }
  };

  /* Export (filtered) */
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Exams Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Title", "Subject", "Type", "Grade", "Date", "Time", "Duration", "Status"]],
      body: filteredExams.map((e) => [
        e.title,
        e.subject_name || e.subject_id,
        e.type,
        classes.find((c) => c.id === e.class_id)?.name || e.class_name || e.class_id,
        e.date,
        e.time,
        e.duration,
        e.status,
      ]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255, halign: "center" },
      bodyStyles: { halign: "center" },
      theme: "striped",
    });
    doc.save("exams_report.pdf");
  };

  const exportExcel = () => {
    const rows = filteredExams.map((e) => ({
      Title: e.title,
      Subject: e.subject_name || e.subject_id,
      Type: e.type,
      Grade: classes.find((c) => c.id === e.class_id)?.name || e.class_name || e.class_id,
      Date: e.date,
      Time: e.time,
      Duration: e.duration,
      Status: e.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exams");
    XLSX.writeFile(wb, "exams_report.xlsx");
  };

  const hasChanges = exams.some((e) => e._status === "new" || e._status === "dirty");

  /* Helper to display subject name (for badge) */
  const subjectNameOf = (e) =>
    e.subject_name ||
    subjects.find((s) => s.id === e.subject_id)?.name ||
    (e.subject_id ? `Subj ${e.subject_id}` : "—");

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-screen text-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Exams & Correction Panel</h2>
        <div className="flex gap-2">
          <div className="relative group">
            <button className="flex items-center gap-1 bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm hover:bg-gray-300">
              Export ▼
            </button>
            <div className="absolute z-20 hidden group-hover:block mt-1 w-32 bg-white border shadow rounded">
              <button onClick={exportPDF} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">PDF</button>
              <button onClick={exportExcel} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">Excel</button>
            </div>
          </div>
          <button onClick={addExam} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
            <FaPlus /> Add Exam
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Grade */}
        <div>
          <label className="block text-sm font-medium mb-1">Grade</label>
          <select
            className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-sm shadow-sm"
            value={filters.grade}
            onChange={(e) => setFilters({ ...filters, grade: e.target.value, subject: "All" })}
          >
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Subject (depends on grade) */}
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <select
            className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-sm shadow-sm"
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            disabled={filters.grade === "All"}
            title={filters.grade === "All" ? "Choose a grade first" : undefined}
          >
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-sm shadow-sm"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            {["All", ...examTypeOptions].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-sm shadow-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            {["All", ...statusOptions].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-sm shadow-sm"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
          {filters.date && (
            <button
              className="text-xs text-gray-500 mt-1 underline"
              onClick={() => setFilters({ ...filters, date: "" })}
            >
              Clear date
            </button>
          )}
        </div>
      </div>

      {/* Table (Subject/Type/Grade removed). Title narrower + subject badge. */}
      <motion.div
        className="bg-white border border-gray-200 shadow rounded-xl max-h-[70vh] overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <table className="table-fixed w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="text-left border-b">
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3 w-[28%] md:w-[30%] xl:w-[28%]">Exam Title</th>
              <th className="px-4 py-3 w-[18%]">Date</th>
              <th className="px-4 py-3 w-[18%]">Time</th>
              <th className="px-4 py-3 w-[14%]">Duration</th>
              <th className="px-4 py-3 w-[16%]">Status</th>
              <th className="px-4 py-3 w-[190px]">Actions</th>
            </tr>
          </thead>
        <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-gray-500 text-center">Loading...</td>
              </tr>
            )}

            {!loading && filteredExams.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-gray-500 text-center">No exams match the selected filters.</td>
              </tr>
            )}

            {!loading && filteredExams.map((exam, idx) => (
              <tr key={exam.id} className="hover:bg-gray-50">
                {/* # */}
                <td className="px-4 py-3 align-middle">{idx + 1}</td>

                {/* Title + subject badge (title width controlled) */}
                <td className="px-4 py-3 align-middle">
                  <div className="mb-1">
                    <span className="inline-block text-[10px] leading-4 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                      {subjectNameOf(exam)}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={exam.title}
                    onChange={(e) => updateExam(exam.id, "title", e.target.value)}
                    className="border border-gray-300 px-2 py-1 rounded text-xs w-full max-w-[320px] md:max-w-[360px] lg:max-w-[420px]"
                    placeholder="Exam title..."
                  />
                </td>

                <td className="px-4 py-3 align-middle">
                  <input
                    type="date"
                    value={exam.date}
                    onChange={(e) => updateExam(exam.id, "date", e.target.value)}
                    className="border border-gray-300 px-2 py-1 rounded text-xs w-full"
                  />
                </td>

                <td className="px-4 py-3 align-middle">
                  <input
                    type="time"
                    value={exam.time}
                    onChange={(e) => updateExam(exam.id, "time", e.target.value)}
                    className="border border-gray-300 px-2 py-1 rounded text-xs w-full"
                  />
                </td>

                <td className="px-4 py-3 align-middle">
                  <select
                    value={exam.duration}
                    onChange={(e) => updateExam(exam.id, "duration", e.target.value)}
                    className="border border-gray-300 px-2 py-1 rounded text-xs w-full"
                  >
                    {durationOptions.map((dur) => (
                      <option key={dur}>{dur}</option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-3 align-middle">
                  <select
                    value={exam.status}
                    onChange={(e) => updateExam(exam.id, "status", e.target.value)}
                    className={`px-2 py-1 rounded text-xs font-medium w-full ${getStatusStyle(exam.status)}`}
                  >
                    {statusOptions.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-3 align-middle">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/exam/${exam.id}/view`)}
                      className="border border-blue-500 text-blue-500 px-3 py-1 rounded text-xs hover:bg-blue-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/exam/${exam.id}/message`)}
                      className="border border-yellow-500 text-yellow-600 px-3 py-1 rounded text-xs hover:bg-yellow-50"
                    >
                      Message
                    </button>
                    <button
                      onClick={() => navigate(`/exam/${exam.id}/correction`)}
                      className="border border-green-500 text-green-600 px-3 py-1 rounded text-xs hover:bg-green-50"
                    >
                      Correct
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <div className="flex justify-end mt-6">
        <button
          onClick={saveAll}
          className={`px-6 py-2 rounded text-white transition ${hasChanges ? "bg-green-600 hover:bg-green-700" : "bg-green-300 cursor-not-allowed"}`}
          disabled={!hasChanges}
        >
          Save Exam
        </button>
      </div>

      {msg && (
        <div className="fixed bottom-4 right-4 bg-white border shadow px-4 py-2 rounded text-sm">{msg}</div>
      )}
    </div>
  );
};

export default Exams;
