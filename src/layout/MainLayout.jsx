import React from "react";
import Sidebar from "../components/Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";

const HEADER_H = 56;        // h-14
const SIDEBAR_W_PX = 112;   // w-28 = 7rem

const MainLayout = () => {
  const navigate = useNavigate();

  const me = (() => {
    try { return JSON.parse(localStorage.getItem("tf_user") || "null"); }
    catch { return null; }
  })();

  const gotoMyProfile = () => {
    if (me) navigate(`/teacher/${me.username || me.id}`);
    else navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] overflow-visible">
      {/* Header (fixed) */}
      <header className="fixed left-0 right-0 h-14 bg-white shadow flex items-center justify-between px-10 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="TeachFlow" className="w-10 h-10" />
          <h1 className="text-xl font-TextNewRoman">TeachFlow</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/notifications")}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <FaBell />
          </button>

          <button
            onClick={gotoMyProfile}
            className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold"
            title="My Profile"
          >
            {me?.username?.slice(0, 2).toUpperCase() || "ME"}
          </button>
        </div>
      </header>

      {/* ✅ Spacer تحت الهيدر حتى ما أي صفحة تفوت تحته */}
      <div style={{ height: HEADER_H }} aria-hidden />

      {/* Body */}
      <div className="flex">
        <Sidebar />
        <main
          className="p-3 w-full"
          style={{ marginLeft: SIDEBAR_W_PX }}  // يطابق عرض السايدبار w-28
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
