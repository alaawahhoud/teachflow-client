// src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPenNib,
  FaCalendarCheck,
  FaSyncAlt,
  FaCalendarAlt,
  FaChartBar,
  FaUser,
  FaFileAlt,
  FaCheckCircle,
} from "react-icons/fa";

const Dashboard = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      label: "Add Exam",
      icon: <FaPenNib className="text-[#3B82F6] text-xl" />,
      bg: "bg-[#DBEAFE] dark:bg-[#1E3A8A]/30",
      onClick: () => navigate("/exams"),
    },
    {
      label: "Mark Attendance",
      icon: <FaCalendarCheck className="text-[#A855F7] text-xl" />,
      bg: "bg-[#F3E8FF] dark:bg-[#6B21A8]/30",
      onClick: () => navigate("/attendance"),
    },
    {
      label: "Request Substitution",
      icon: <FaSyncAlt className="text-[#0D9488] text-xl" />,
      bg: "bg-[#DCFCE7] dark:bg-[#064E3B]/30",
      onClick: () => navigate("/substitution"),
    },
    {
      label: "View Schedule",
      icon: <FaCalendarAlt className="text-[#EA580C] text-xl" />,
      bg: "bg-[#FFEDD5] dark:bg-[#7C2D12]/30",
      onClick: () => navigate("/schedule"),
    },
    {
      label: "Generate Report",
      icon: <FaChartBar className="text-[#2563EB] text-xl" />,
      bg: "bg-[#DBEAFE] dark:bg-[#1E3A8A]/30",
      onClick: () => navigate("/students"),
    },
    {
      label: "View Profile",
      icon: <FaUser className="text-[#B45309] text-xl" />,
      bg: "bg-[#FEF9C3] dark:bg-[#78350F]/30",
      onClick: () => navigate("/teacher-profile"),
    },
  ];

  return (
    <div className="h-screen bg-[#F9FAFB] dark:bg-[#1F2937] overflow-hidden flex flex-col text-gray-800 dark:text-white">
      <div className="flex flex-1 pt-16 h-full overflow-hidden">
        <main className="flex-1 md:ml-240 flex-col justify-between">
          <section>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {quickActions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={item.onClick}
                  className={`rounded-xl ${item.bg} px-4 py-5 shadow hover:shadow-md cursor-pointer transition-all text-center`}
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-white dark:bg-gray-900 rounded-xl shadow flex items-center justify-center">
                    {item.icon}
                  </div>
                  <p className="text-sm font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Recent Activities */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">Recent Activities</h3>
                <a href="#" className="text-sm text-blue-500 hover:underline">
                  View All
                </a>
              </div>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <FaFileAlt className="text-yellow-600 text-lg mt-1" />
                  <div>
                    <p>Math exam scheduled for Grade 9A</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      15 minutes ago · Sarah Johnson
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <FaCheckCircle className="text-green-600 text-lg mt-1" />
                  <div>
                    <p>Attendance marked for Grade 8B</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      45 minutes ago · Michael Chen
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  Upcoming Academic Events
                </h3>
                <a href="#" className="text-sm text-blue-500 hover:underline">
                  View Calendar
                </a>
              </div>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-3 h-3 bg-green-500 rounded-full" />
                  <div>
                    <p>Science Fair Preparation</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Tomorrow · 9:00 AM
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-3 h-3 bg-red-500 rounded-full" />
                  <div>
                    <p>Math Exam – Grade 10</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Dec 15 · 10:00 AM
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
