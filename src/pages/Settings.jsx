// src/pages/Settings.jsx
import React, { useContext } from "react";
import { FaChevronDown, FaCloudUploadAlt } from "react-icons/fa";
import { ThemeContext } from "../context/ThemeContext";

const Settings = () => {
  const academicYears = ["2024-2025", "2025-2026", "2026-2027"];
  const startDates = ["September 1", "September 15", "October 1"];
  const endDates = ["June 15", "June 30", "July 15"];
  const themeColors = ["Blue", "Green", "Orange", "Purple", "Gray"];
  const languages = ["English", "Arabic", "French"];
  const themes = ["light", "dark"];

  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] dark:bg-[#1F2937] min-h-screen text-gray-800 dark:text-white transition-all">
      <h2 className="text-2xl font-bold mb-8 tracking-tight">
        ⚙️ System Settings
      </h2>

      {/* Academic Year Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">Academic Year Settings</h3>
          <FaChevronDown className="text-gray-400" />
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-4">
          <select className="input dark:bg-gray-700 dark:text-white dark:border-gray-600">
            {academicYears.map((year) => (
              <option key={year} className="dark:text-white">{year}</option>
            ))}
          </select>

          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded px-4 py-2">
            <label className="text-sm dark:text-white">Enable Academic Year Lock</label>
            <input type="checkbox" className="accent-blue-600 w-5 h-5" />
          </div>

          <select className="input dark:bg-gray-700 dark:text-white dark:border-gray-600">
            {startDates.map((date) => (
              <option key={date} className="dark:text-white">{date}</option>
            ))}
          </select>

          <select className="input dark:bg-gray-700 dark:text-white dark:border-gray-600">
            {endDates.map((date) => (
              <option key={date} className="dark:text-white">{date}</option>
            ))}
          </select>
        </div>
      </div>

      {/* User Roles & Access */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">User Roles & Access</h3>
          <FaChevronDown className="text-gray-400" />
        </div>
        <div className="p-6 overflow-auto">
          <table className="w-full text-sm text-left border">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b text-gray-600 dark:text-gray-300">
                <th className="py-2 px-4">Permission</th>
                <th>Admin</th>
                <th>IT</th>
                <th>Coordinator</th>
                <th>Teacher</th>
              </tr>
            </thead>
            <tbody>
              {[
                "Attendance",
                "Scheduling",
                "Exams",
                "Substitution",
                "Reports",
                "User Management",
              ].map((perm, i) => (
                <tr key={i} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium dark:text-white">{perm}</td>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} className="text-center">
                      <input type="checkbox" className="accent-blue-600 w-5 h-5" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">Notification Settings</h3>
          <FaChevronDown className="text-gray-400" />
        </div>
        <div className="p-6 space-y-4">
          {["Email Notifications", "SMS Alerts", "Auto-sub Alert to IT/Coordinator"].map(
            (text, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-sm dark:text-white">{text}</span>
                <input type="checkbox" className="accent-blue-600 w-5 h-5" />
              </div>
            )
          )}
        </div>
      </div>

      {/* Customization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">Customization</h3>
          <FaChevronDown className="text-gray-400" />
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-4">
          {/* Theme Dropdown */}
          <select
            className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
            value={theme}
            onChange={(e) => toggleTheme(e.target.value)}
          >
            {themes.map((t) => (
              <option key={t} value={t} className="dark:text-white">
                {t.charAt(0).toUpperCase() + t.slice(1)} Mode
              </option>
            ))}
          </select>

          <select className="input dark:bg-gray-700 dark:text-white dark:border-gray-600">
            {languages.map((lang) => (
              <option key={lang} className="dark:text-white">{lang}</option>
            ))}
          </select>

          <div className="col-span-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-700">
            <FaCloudUploadAlt className="mx-auto mb-2 text-gray-400 text-3xl" />
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Click to upload or drag and drop <br />
              <span className="text-xs">PNG, JPG up to 2MB</span>
            </p>
            <button className="mt-4 px-4 py-2 text-sm rounded bg-white dark:bg-gray-600 border hover:bg-gray-100 dark:hover:bg-gray-500">
              Choose File
            </button>
          </div>
        </div>
      </div>

      {/* Backup & Data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">Backup & Data</h3>
          <FaChevronDown className="text-gray-400" />
        </div>
        <div className="p-6 flex gap-4">
          <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded shadow text-sm">
            📥 Export Data
          </button>
          <button className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded shadow text-sm">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="text-right mt-6">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm rounded shadow">
          ✅ Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings;
