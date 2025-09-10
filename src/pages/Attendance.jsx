// client/src/pages/Attendance.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* ===================== CONFIG ===================== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) ||
  (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app")
    ? "https://teachflow-server.onrender.com/api"
    : "http://localhost:4000/api");

const LATE_DEFAULT = "07:40:00";

/* ===================== Helpers ===================== */
const toHMS = (x) => {
  if (!x) return "";
  const s = String(x);
  return s.length >= 8 ? s.slice(0, 8) : s;
};
const computeStatus = (checkIn, cutoff = LATE_DEFAULT) => {
  const t = toHMS(checkIn);
  if (!t) return "Absent";
  return t > (cutoff || LATE_DEFAULT) ? "Late" : "Present";
};

function classDisplayName(c) {
  return (
    c?.name ||
    `${c?.grade ?? ""}${c?.section ? ` ${c.section}` : ""}`.trim() ||
    (c?.id ? `Class ${c.id}` : "—")
  );
}

/* ===================== Component ===================== */
export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedClassId, setSelectedClassId] = useState("All");
  const [selectedTeacherId, setSelectedTeacherId] = useState("All");
  const [statusFilters, setStatusFilters] = useState({
    Present: true,
    Late: true,
    Absent: true,
  });

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]); // list used for filter + Add form
  const [rows, setRows] = useState([]); // table data (attendance of selected day)
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [showExportOptions, setShowExportOptions] = useState(false);
  const exportRef = useRef(null);

  // Add Attendance modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    teacherId: "",
    checkIn: "",
    checkOut: "",
    status: "Absent",
  });

  /* ===================== Load filters (direct DB) ===================== */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setErr("");
        const [clsRes, teaRes] = await Promise.all([
          fetch(`${API_BASE}/classes`),
          fetch(`${API_BASE}/users/teachers`),
        ]);

        const clsJ = (await clsRes.json().catch(() => [])) || [];
        const teaJ = (await teaRes.json().catch(() => [])) || [];

        if (ignore) return;
        setClasses(Array.isArray(clsJ) ? clsJ : []);
        setTeachers(Array.isArray(teaJ) ? teaJ : []);
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load filters");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  /* ===================== Load attendance of selected day ===================== */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const params = new URLSearchParams();
        params.set("date", selectedDate);
        if (selectedClassId !== "All") params.set("class", String(selectedClassId));
        if (selectedTeacherId !== "All")
          params.set("teacherId", String(selectedTeacherId));

        // status filter: if not all enabled, send the enabled subset
        const enabled = Object.entries(statusFilters)
          .filter(([, on]) => on)
          .map(([k]) => k);
        if (enabled.length && enabled.length < 3) {
          params.set("status", enabled.join(","));
        }

        const r = await fetch(`${API_BASE}/attendance?${params.toString()}`);
        const j = await r.json().catch(() => []);
        if (ignore) return;

        const arr = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
        setRows(
          arr.map((x) => ({
            id: Number(x.id),
            name: x.name || "",
            class_id: x.class_id ?? null,
            class: x.class || "—",
            subject: x.subject || "—",
            status: x.status || "Absent",
            notes: x.notes || "",
            check_in_time: toHMS(x.check_in_time),
            check_out_time: toHMS(x.check_out_time),
            initials: String(x.name || "")
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .slice(0, 3)
              .toUpperCase(),
          }))
        );
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load attendance");
          setRows([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [selectedDate, selectedClassId, selectedTeacherId, statusFilters]);

  /* ===================== Derived ===================== */
  const classesMap = useMemo(
    () =>
      new Map(
        (classes || []).map((c) => [Number(c.id), classDisplayName(c)])
      ),
    [classes]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const okStatus = statusFilters[r.status];
      const okClass =
        selectedClassId === "All" ||
        String(r.class_id ?? "") === String(selectedClassId);
      const okTeacher =
        selectedTeacherId === "All" || Number(r.id) === Number(selectedTeacherId);
      return okStatus && okClass && okTeacher;
    });
  }, [rows, statusFilters, selectedClassId, selectedTeacherId]);

  /* ===================== UI Helpers ===================== */
  const getStatusPill = (status) => {
    const base = "rounded px-3 py-1 text-sm font-medium";
    switch (status) {
      case "Present":
        return `${base} bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300`;
      case "Late":
        return `${base} bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300`;
      case "Absent":
        return `${base} bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300`;
      default:
        return `${base} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  /* ===================== Actions ===================== */
  const saveAll = async () => {
    try {
      const payload = rows.map((r) => ({
        user_id: r.id,
        date: selectedDate,
        status: r.status,
        check_in_time: r.check_in_time || null,
        check_out_time: r.check_out_time || null,
        notes: r.notes || null,
      }));
      const res = await fetch(`${API_BASE}/attendance/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(j);
        alert("Failed to save ❌");
      } else {
        alert("Attendance saved ✅");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong ❌");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Name", "Class", "Subject", "Status", "Notes", "In", "Out"]],
      body: filteredRows.map((r) => [
        r.name,
        r.class,
        r.subject,
        r.status,
        r.notes || "",
        r.check_in_time || "",
        r.check_out_time || "",
      ]),
    });
    doc.save(`attendance_${selectedDate}.pdf`);
    setShowExportOptions(false);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredRows.map((r) => ({
        Name: r.name,
        Class: r.class,
        Subject: r.subject,
        Status: r.status,
        Notes: r.notes || "",
        "Check In": r.check_in_time || "",
        "Check Out": r.check_out_time || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `attendance_${selectedDate}.xlsx`);
    setShowExportOptions(false);
  };

  const openAdd = () => {
    setAddForm({ teacherId: "", checkIn: "", checkOut: "", status: "Absent" });
    setAddOpen(true);
  };

  const onAddChange = (k, v) => {
    setAddForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "checkIn") {
        next.status = computeStatus(v, LATE_DEFAULT);
      }
      return next;
    });
  };

  const submitAdd = async () => {
    try {
      if (!addForm.teacherId || !selectedDate) {
        alert("Please select teacher and date");
        return;
      }
      const body = {
        user_id: Number(addForm.teacherId),
        date: selectedDate,
        status: addForm.status,
        check_in_time: addForm.checkIn || null,
        check_out_time: addForm.checkOut || null,
      };
      const res = await fetch(`${API_BASE}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(j);
        alert("Add failed ❌");
        return;
      }
      // refresh table (simple way: re-fetch)
      setAddOpen(false);
      // Quick optimistic merge:
      const t = teachers.find((x) => Number(x.id) === Number(addForm.teacherId));
      const clsName = classesMap.get(Number(j?.class_id)) || rows.find(r => r.id===Number(addForm.teacherId))?.class || "—";
      const newRow = {
        id: Number(addForm.teacherId),
        name: t?.full_name || t?.name || "",
        class_id: j?.class_id ?? rows.find(r=>r.id===Number(addForm.teacherId))?.class_id ?? null,
        class: clsName,
        subject: "—",
        status: addForm.status || "Absent",
        notes: "",
        check_in_time: toHMS(addForm.checkIn),
        check_out_time: toHMS(addForm.checkOut),
        initials: String(t?.full_name || t?.name || "")
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0])
          .join("")
          .slice(0, 3)
          .toUpperCase(),
      };
      // If exists replace, else push
      setRows((prev) => {
        const idx = prev.findIndex((x) => x.id === newRow.id);
        if (idx >= 0) {
          const cp = [...prev];
          cp[idx] = { ...cp[idx], ...newRow };
          return cp;
        }
        return [newRow, ...prev];
      });
      alert("Added ✅");
    } catch (e) {
      console.error(e);
      alert("Something went wrong ❌");
    }
  };

  /* ===================== Render ===================== */
  return (
    <div className="p-6 bg-[#F9FAFB] dark:bg-[#1F2937] min-h-screen text-gray-800 dark:text-white">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Attendance Panel</h2>
        <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-300">TeachFlow</h2>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Date</label>
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Class</label>
          <select
            className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="All">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {classDisplayName(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Teacher</label>
          <select
            className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
          >
            <option value="All">All Teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.full_name || t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block font-semibold mb-2 dark:text-white">Filter by Status</label>
          <div className="flex gap-4 flex-wrap">
            {Object.keys(statusFilters).map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm dark:text-white">
                <input
                  type="checkbox"
                  checked={statusFilters[s]}
                  onChange={() =>
                    setStatusFilters((p) => ({ ...p, [s]: !p[s] }))
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Add Attendance + Alert */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl shadow hover:bg-emerald-700"
        >
          + Add Attendance
        </button>

        <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-4 rounded-xl shadow flex items-start gap-2 w-full lg:w-[420px]">
          <span className="text-xl font-bold">⚠️</span>
          <div className="text-sm">
            <strong className="block font-semibold mb-1">Auto-substitution Alert</strong>
            <p className="leading-tight">Auto-substitution triggered for a teacher in a selected class.</p>
          </div>
        </div>
      </div>

      {/* Table */}
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
              <th>In</th>
              <th>Out</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-6 px-4 text-sm text-gray-500 dark:text-gray-300" colSpan={8}>
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td className="py-6 px-4 text-sm text-red-600" colSpan={8}>
                  {err}
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => (
                <tr key={`${r.id}-${i}`} className="border-t dark:border-gray-600">
                  <td className="py-3 px-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                        i % 3 === 0 ? "bg-blue-500" : i % 3 === 1 ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {r.initials}
                    </div>
                  </td>
                  <td className="dark:text-white">{r.name}</td>
                  <td className="dark:text-white">{r.class}</td>
                  <td className="dark:text-white">{r.subject}</td>
                  <td>
                    <select
                      value={r.status}
                      className={getStatusPill(r.status)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, status: v } : x
                          )
                        );
                      }}
                    >
                      <option>Present</option>
                      <option>Late</option>
                      <option>Absent</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Write note..."
                      className="bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-1 rounded w-full sm:w-48"
                      value={r.notes || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, notes: v } : x
                          )
                        );
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      className="bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-1 rounded"
                      value={r.check_in_time || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        const nextStatus = computeStatus(v, LATE_DEFAULT);
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, check_in_time: v, status: nextStatus }
                              : x
                          )
                        );
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      className="bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-1 rounded"
                      value={r.check_out_time || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, check_out_time: v } : x
                          )
                        );
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-col sm:flex-row justify-end gap-4 relative" ref={exportRef}>
        <div className="relative">
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Export
          </button>
          {showExportOptions && (
            <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow z-[9999]">
              <button
                onClick={exportPDF}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                Export as PDF
              </button>
              <button
                onClick={exportExcel}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                Export as Excel
              </button>
            </div>
          )}
        </div>

        <button
          onClick={saveAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
        >
          Save Attendance
        </button>
      </div>

      {/* Add Attendance Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-5">
            <h3 className="text-lg font-semibold mb-3">Add Attendance</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Teacher</label>
                <select
                  className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-2 rounded"
                  value={addForm.teacherId}
                  onChange={(e) => onAddChange("teacherId", e.target.value)}
                >
                  <option value="">Select teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.full_name || t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Check-in</label>
                  <input
                    type="time"
                    className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-2 rounded"
                    value={addForm.checkIn}
                    onChange={(e) => onAddChange("checkIn", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Check-out</label>
                  <input
                    type="time"
                    className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-2 rounded"
                    value={addForm.checkOut}
                    onChange={(e) => onAddChange("checkOut", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Status</label>
                <select
                  className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-2 rounded"
                  value={addForm.status}
                  onChange={(e) => onAddChange("status", e.target.value)}
                >
                  <option>Present</option>
                  <option>Late</option>
                  <option>Absent</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Status auto-updates when you set Check-in time.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitAdd}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
