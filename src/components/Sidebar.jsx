// src/components/Sidebar.jsx
import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FaTachometerAlt, FaCalendarCheck, FaSyncAlt, FaCalendarAlt, FaPenNib,
  FaUserGraduate, FaBook, FaBell, FaUsers, FaUser, FaCog, FaQuestionCircle,
  FaChalkboardTeacher,
} from "react-icons/fa";

function readUser() {
  try {
    const raw = localStorage.getItem("tf_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u || null;
  } catch { return null; }
}

const HEADER_H = 56; // يساوي h-14 بالهيدر

const Sidebar = () => {
  const me = useMemo(readUser, []);
  const location = useLocation();

  const navItems = useMemo(() => ([
    { to: "/dashboard",    icon: <FaTachometerAlt />,    color: "text-[#2563EB]", label: "Dashboard" },
    { to: "/attendance",   icon: <FaCalendarCheck />,    color: "text-[#10B981]", label: "Attendance" },
    { to: "/substitution", icon: <FaSyncAlt />,          color: "text-[#EC4899]", label: "Substitution" },
    { to: "/schedule",     icon: <FaCalendarAlt />,      color: "text-[#F59E0B]", label: "Schedule" },
    { to: "/exams",        icon: <FaPenNib />,           color: "text-[#3B82F6]", label: "Exams" },
    { to: "/students",     icon: <FaUserGraduate />,     color: "text-[#8B5CF6]", label: "Students" },
    { to: "/subjects",     icon: <FaBook />,             color: "text-[#9333EA]", label: "Subjects" },
    { to: me ? `/teacher/${me.username || me.id}` : "/login",
      icon: <FaChalkboardTeacher />, color: "text-[#0EA5E9]", label: "Profile" },
    { to: "/notifications", icon: <FaBell />,            color: "text-[#F97316]", label: "Notification" },
    { to: "/users",         icon: <FaUsers />,           color: "text-[#0EA5E9]", label: "Users" },
    { to: "/new-user",      icon: <FaUser />,            color: "text-[#F97316]", label: "New User" },
    { to: "/new-students",  icon: <FaUser />,            color: "text-[#9333EA]", label: "New Students" },
    { to: "/settings",      icon: <FaCog />,             color: "text-[#6B7280]", label: "Settings" },
    { to: "/help",          icon: <FaQuestionCircle />,  color: "text-[#64748B]", label: "Help" },
  ]), [me]);

  return (
    <div
      className="fixed left-0 z-30 bg-[#F9FAFB] dark:bg-[#111827] shadow-sm
                 overflow-y-auto flex flex-col items-center py-3 w-28 transition-colors"
      style={{ top: HEADER_H, height: `calc(100vh - ${HEADER_H}px)` }} // ✅ قد الشاشة وتحت الهيدر
    >
      <div className="flex flex-col items-center gap-6">
        {navItems.map(({ to, icon, color, label }, idx) => (
          <NavLink
            key={idx}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-all text-center ${
                isActive
                  ? "text-[#1D4ED8] dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full text-xl ${color} ${
                    isActive || (label === "Profile" && location.pathname.startsWith("/teacher"))
                      ? "bg-[#E0F2FE] dark:bg-[#1E3A8A]/30 shadow"
                      : ""
                  }`}
                >
                  {icon}
                </div>
                <span className="text-[11px] leading-tight break-words max-w-[60px] dark:text-white">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
