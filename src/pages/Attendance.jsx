// ✅ الكود المعدل لتفعيل dark mode في Attendance.jsx بالكامل

import React, { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// top
 
const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substr(0, 10));
  const [selectedTeacher, setSelectedTeacher] = useState("All Teachers");
  const [statusFilters, setStatusFilters] = useState({ Present: true, Absent: true, Late: true });
  const [showExportOptions, setShowExportOptions] = useState(false);
  const exportRef = useRef(null);

  const [teachers, setTeachers] = useState([]);

  const getStatusColor = (status) => {
    const base = "rounded px-3 py-1 text-sm font-medium";
    switch (status) {
      case "Present": return `${base} bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300`;
      case "Late": return `${base} bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300`;
      case "Absent": return `${base} bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300`;
      default: return `${base} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  const toggleStatusFilter = (status) => {
    setStatusFilters({ ...statusFilters, [status]: !statusFilters[status] });
  };

  const filteredTeachers = teachers.filter((s) => {
    const matchesTeacher = selectedTeacher === "All Teachers" || s.name === selectedTeacher;
    const matchesStatus = statusFilters[s.status];
    return matchesTeacher && matchesStatus;
  });
const handleSaveAttendance = async () => {
  try {
    const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:4000/api';

 // save attendance — send the actual teacher id + notes
for (let s of teachers) {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // If you use auth, include the token:
      // Authorization: `Bearer ${localStorage.getItem('tf_token')}`
    },
    body: JSON.stringify({
      user_id: s.id,            // <-- use teacher id
      date: selectedDate,
      status: s.status,         // "Present" | "Late" | "Absent"
      check_in_time: s.status === "Present" ? "07:30:00" : null,
      check_out_time: s.status === "Present" ? "14:30:00" : null,
      note: s.notes || null,    // <-- pass notes
      recorded_by: 1            // (optional) current admin id
    }),
  });
  const data = await res.json();
  if (!res.ok) console.error("Failed to save:", data?.message || data);
}

    alert("Attendance saved successfully ✅");
  } catch (error) {
    console.error("Error saving attendance:", error);
    alert("Something went wrong ❌");
  }
};


  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Name", "Class", "Subject", "Status", "Notes"]],
      body: filteredTeachers.map((s) => [s.name, s.class, s.subject, s.status, s.notes]),
    });
    doc.save("attendance_report.pdf");
    setShowExportOptions(false);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredTeachers.map((s) => ({ Name: s.name, Class: s.class, Subject: s.subject, Status: s.status, Notes: s.notes }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance_report.xlsx");
    setShowExportOptions(false);
  };

 useEffect(() => {
  const fetchTeachers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/users/teachers");
      const data = await res.json();
      setTeachers(data.map((t) => ({
        id: t.id,
        name: t.full_name,
        class: "Grade 9A", // مؤقتًا
        subject: "Math", // مؤقتًا
        status: "Present",
        notes: "",
        initials: t.full_name.split(" ").map((n) => n[0]).join(""),
      })));
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  fetchTeachers();
}, []);


  return (
    <div className="p-6 bg-[#F9FAFB] dark:bg-[#1F2937] min-h-screen text-gray-800 dark:text-white">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Attendance Panel</h2>
        <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-300">TeachFlow</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Select Date</label>
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Class</label>
          <select className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded px-3 py-2">
            <option>All Classes</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i}>Grade {i + 1}</option>)}
            <option>KG1</option>
            <option>KG2</option>
            <option>KG3</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <label className="block text-sm font-medium mb-1 dark:text-white">Teacher</label>
          <select
            className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
          >
            <option>All Teachers</option>
            {teachers.map((t) => (
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
            {filteredTeachers.map((teacher, i) => (
              <tr key={i} className="border-t dark:border-gray-600">
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
                      const updated = [...teachers];
                      updated[i].status = e.target.value;
                      setTeachers(updated);
                    }}
                  >
                    <option>Present</option>
                    <option>Late</option>
                    <option>Absent</option>
                  </select>
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
                        const updated = [...teachers];
                        updated[i].notes = e.target.value === "Other" ? "" : e.target.value;
                        setTeachers(updated);
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
                          const updated = [...teachers];
                          updated[i].notes = e.target.value;
                          setTeachers(updated);
                        }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
