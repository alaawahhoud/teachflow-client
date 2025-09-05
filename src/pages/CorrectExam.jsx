// ✅ تعديل ملف UploadExam.jsx لدعم dark mode بالكامل

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const UploadExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState({
    id,
    title: "",
    type: "Midterm",
    grade: "Grade 10",
    date: "",
    time: "",
    duration: "1 hour",
    teacher: "",
    status: "Draft",
    coordinator: "",
    file: null,
  });

  const statusOptions = [
    "Draft",
    "Done Not Corrected",
    "Not Done Yet",
    "Correction in Progress",
  ];

  const typeOptions = ["Midterm", "Final", "Quiz", "Essay"];

  const gradeOptions = [
    "KG1", "KG2", ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
  ];

  const durationOptions = [
    "1 hour", "1.5 hours", "2 hours", "2.5 hours", "3 hours", "3.5 hours", "4 hours",
  ];

  const handleChange = (key, value) => {
    setExam((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = () => {
    if (!exam.file) {
      alert("Please select a file to upload.");
      return;
    }
    console.log("Uploading file for exam:", exam.id);
    console.log("File:", exam.file);
    alert("File uploaded successfully!");
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[#F9FAFB] dark:bg-[#1F2937] text-gray-800 dark:text-white">
      <button
        onClick={() => navigate("/exams")}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Back to Exams
      </button>

      <h2 className="text-2xl font-bold mb-6">Upload Exam File</h2>

      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 max-w-3xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Exam ID</label>
          <input
            type="text"
            value={exam.id}
            readOnly
            className="w-full border px-3 py-2 rounded text-sm bg-gray-100 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Title</label>
          <input
            type="text"
            value={exam.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Type</label>
            <select
              value={exam.type}
              onChange={(e) => handleChange("type", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
            >
              {typeOptions.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Grade</label>
            <select
              value={exam.grade}
              onChange={(e) => handleChange("grade", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
            >
              {gradeOptions.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Date</label>
            <input
              type="date"
              value={exam.date}
              onChange={(e) => handleChange("date", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Time</label>
            <input
              type="time"
              value={exam.time}
              onChange={(e) => handleChange("time", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Duration</label>
            <select
              value={exam.duration}
              onChange={(e) => handleChange("duration", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
            >
              {durationOptions.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Status</label>
            <select
              value={exam.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
            >
              {statusOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Teacher Name</label>
            <input
              type="text"
              value={exam.teacher}
              onChange={(e) => handleChange("teacher", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Coordinator Name</label>
            <input
              type="text"
              value={exam.coordinator}
              onChange={(e) => handleChange("coordinator", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 dark:text-white">Upload File</label>
          <input
            type="file"
            onChange={(e) => handleChange("file", e.target.files[0])}
            className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleFileUpload}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Upload File
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Notes</label>
          <textarea
            rows={4}
            value={exam.notes || ""}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Enter any additional notes..."
            className="w-full border px-3 py-2 rounded text-sm resize-none dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default UploadExam;
