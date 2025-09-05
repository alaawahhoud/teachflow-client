// src/pages/Notifications.jsx
import React, { useState } from "react";
import { FaTrashAlt, FaStar, FaBell, FaArrowLeft } from "react-icons/fa";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const notifications = [
  {
    title: "System Maintenance Scheduled",
    message: "TeachFlow will undergo maintenance tonight from 11 PM to 1 AM.",
    time: "30 minutes ago",
    type: "System",
    unread: true,
  },
  {
    title: "Attendance Alert",
    message: "Grade 9A has 3 absent students today. Please update records.",
    time: "1 hour ago",
    type: "Attendance",
    unread: true,
    starred: true,
  },
  {
    title: "New Exam Assigned",
    message: "Grade 9A Math exam has been uploaded by Mr. Karim.",
    time: "2 hours ago",
    type: "Exams",
    unread: false,
  },
  {
    title: "Substitute Teacher Required",
    message:
      "Ms. Sarah is absent tomorrow. Please arrange substitute for English classes.",
    time: "3 hours ago",
    type: "Substitution",
    unread: true,
  },
  {
    title: "Grade Report Generated",
    message: "Monthly grade reports for all classes are now available for download.",
    time: "5 hours ago",
    type: "System",
    unread: false,
  },
  {
    title: "Late Arrival Notification",
    message: "Ahmed Hassan arrived 15 minutes late to 1st period Math class.",
    time: "1 day ago",
    type: "Attendance",
    unread: false,
  },
];

const NotificationCard = ({ title, message, time, unread, starred }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border flex justify-between items-start shadow-sm transition ${
        unread ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
      }`}
    >
      <div>
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <FaBell className="text-blue-500" />
          {title}
          {unread && <span className="text-xs text-blue-600 ml-1">●</span>}
          {starred && <FaStar className="text-yellow-500 text-xs ml-1" />}
        </h4>
        <p className="text-sm text-gray-700 mt-1">{message}</p>
        <div className="text-xs text-gray-500 mt-2">
          {time} ·{" "}
          <button className="text-blue-500 hover:underline font-medium">
            Mark as Read
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <FaStar className="text-gray-400 cursor-pointer hover:text-yellow-500" />
        <FaTrashAlt className="text-gray-400 cursor-pointer hover:text-red-500" />
      </div>
    </motion.div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");

  const tabs = ["All", "Unread", "System", "Attendance", "Substitution", "Exams"];

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "All") return true;
    if (activeTab === "Unread") return n.unread;
    return n.type === activeTab;
  });

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-screen text-gray-800">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft /> Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
        <button className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow">
          Mark All as Read
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-medium px-4 py-2 rounded-full transition ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((n, idx) => (
            <NotificationCard key={idx} {...n} />
          ))
        ) : (
          <div className="text-center text-gray-400 text-sm mt-12">No notifications found.</div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
