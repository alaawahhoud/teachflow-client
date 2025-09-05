import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const Substitution = () => {
  const [logData, setLogData] = useState([
    {
      class: "Grade 9B",
      period: "2nd Period",
      absent: "Mr. Ahmad",
      substitute: "Ms. Rana",
      status: "Completed",
    },
    {
      class: "Grade 7A",
      period: "1st Period",
      absent: "Dr. Sarah",
      substitute: "Mr. Hassan",
      status: "Not Completed Yet",
    },
    {
      class: "Grade 10C",
      period: "3rd Period",
      absent: "Ms. Fatima",
      substitute: "Ms. Claire",
      status: "Completed",
    },
  ]);

  const [showDropdown, setShowDropdown] = useState(false);

  const handleStatusChange = (index, value) => {
    const updated = [...logData];
    updated[index].status = value;
    setLogData(updated);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Substitution Log", 14, 16);
    const tableColumn = ["Class", "Period", "Absent", "Substitute", "Status"];
    const tableRows = logData.map((log) => [
      log.class,
      log.period,
      log.absent,
      log.substitute,
      log.status,
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Substitution_Log.pdf");
    setShowDropdown(false);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(logData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Substitution Log");
    XLSX.writeFile(wb, "Substitution_Log.xlsx");
    setShowDropdown(false);
  };

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-screen text-gray-800">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-gray-800">
          Substitution Panel
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm bg-gray-100 px-4 py-2 rounded-lg shadow">
            📅{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              Export ▾
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded shadow z-10">
                <button
                  onClick={exportToPDF}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Export as PDF
                </button>
                <button
                  onClick={exportToExcel}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Export as Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <select className="bg-gray-100 rounded-lg px-4 py-2 shadow-sm text-sm">
          <option disabled selected>
            Select Grade
          </option>
          <option>KG1</option>
          <option>KG2</option>
          <option>Grade 1A</option>
          <option>Grade 1B</option>
          <option>Grade 2A</option>
          <option>Grade 3A</option>
          <option>Grade 4B</option>
          <option>Grade 5C</option>
          <option>Grade 6A</option>
          <option>Grade 7B</option>
          <option>Grade 8C</option>
          <option>Grade 9A</option>
          <option>Grade 10B</option>
          <option>Grade 11A</option>
          <option>Grade 12</option>
        </select>

        <select className="bg-gray-100 rounded-lg px-4 py-2 shadow-sm text-sm">
          <option disabled selected>
            Select Subject
          </option>
          <option>Math</option>
          <option>Physics</option>
          <option>Chemistry</option>
          <option>Biology</option>
          <option>Arabic</option>
          <option>English</option>
          <option>History</option>
          <option>Geography</option>
          <option>Philosophy</option>
          <option>Economics</option>
          <option>Religion</option>
          <option>Social Studies</option>
          <option>Physical Education</option>
          <option>Arts</option>
          <option>ICT</option>
        </select>

        <select className="bg-gray-100 rounded-lg px-4 py-2 shadow-sm text-sm">
          <option disabled selected>
            Select Teacher
          </option>
          <option>Mr. Ahmad</option>
          <option>Ms. Rana</option>
          <option>Mr. Hassan</option>
          <option>Dr. Sarah</option>
          <option>Ms. Fatima</option>
          <option>Ms. Claire</option>
          <option>Mr. Bilal</option>
          <option>Ms. Zeina</option>
          <option>Dr. Nabil</option>
          <option>Ms. Hala</option>
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Absent Info */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Substitution Required
          </h3>
          <p className="text-sm mb-2">
            <strong>Absent Teacher:</strong> Mr. Ahmad
          </p>
          <p className="text-sm mb-2">
            <strong>Subject:</strong>{" "}
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
              Math
            </span>
          </p>
          <p className="text-sm mb-2">
            <strong>Class:</strong> Grade 9B
          </p>
          <p className="text-sm mb-2">
            <strong>Period:</strong> 2nd Period
          </p>
          <p className="text-sm">
            <strong>Time:</strong> 9:00 – 9:45
          </p>
        </div>

        {/* Suggested Replacement */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Suggested Replacement
          </h3>
          <div className="flex justify-between text-sm mb-2">
            <span>
              <strong>Suggested Substitute:</strong>
            </span>
            <span className="font-medium">Ms. Rana</span>
          </div>
          <p className="text-sm mb-4">
            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium mr-2">
              Available
            </span>
            Math Qualified
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-2 rounded-lg font-medium text-sm">
            Assign as Substitute
          </button>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl text-sm text-yellow-800 mb-8 shadow-sm flex justify-between items-start">
        <div>
          <strong>⚠️ Auto-substitution triggered</strong>
          <p>Ms. Rana assigned to Grade 9B (Math, Period 2)</p>
        </div>
        <button className="text-xl font-bold hover:opacity-60 leading-none">
          ×
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">
          Today's Substitution Log
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-100 text-gray-700">
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Absent</th>
                <th className="py-3 px-4">Substitute</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {logData.map((log, index) => (
                <tr
                  key={index}
                  className="border-b last:border-none hover:bg-gray-50 transition"
                >
                  <td className="py-2 px-4 font-medium">{log.class}</td>
                  <td className="py-2 px-4">{log.period}</td>
                  <td className="py-2 px-4">{log.absent}</td>
                  <td className="py-2 px-4">{log.substitute}</td>
                  <td className="py-2 px-4">
                    <select
                      value={log.status}
                      onChange={(e) =>
                        handleStatusChange(index, e.target.value)
                      }
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        log.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      <option value="Completed">Completed</option>
                      <option value="Not Completed Yet">
                        Not Completed Yet
                      </option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Substitution;
