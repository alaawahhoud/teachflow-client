import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <nav
        className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 sm:px-6 py-3
                   bg-transparent"
        style={{ WebkitBackdropFilter: "saturate(180%) blur(6px)", backdropFilter: "saturate(180%) blur(6px)" }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="TeachFlow" className="h-8 w-auto" />
          <span className="text-lg sm:text-xl font-bold text-white">TeachFlow</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/features" className="text-white hover:text-blue-200 transition">Features</NavLink>
          <NavLink to="/how-it-works" className="text-white hover:text-blue-200 transition">How It Works</NavLink>
          <NavLink to="/contact" className="text-white hover:text-blue-200 transition">Contact</NavLink>
        </div>

        {/* Right side (login / burger) */}
        <div className="hidden md:block">
          <Link
            to="/login"
            className="bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-blue-100 transition"
          >
            Login
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-white text-2xl p-2 rounded focus:outline-none focus:ring-2 focus:ring-white/60"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <FaBars />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        {/* Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-72 max-w-[85%] bg-white text-gray-800 shadow-xl
                      transform transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <img src="/logo.png" className="h-7 w-auto" alt="TeachFlow" />
              <span className="font-semibold">TeachFlow</span>
            </div>
            <button
              className="text-2xl p-1"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <FaTimes />
            </button>
          </div>

          <div className="flex flex-col p-4 gap-3">
            <NavLink to="/features" className="py-2" onClick={() => setOpen(false)}>Features</NavLink>
            <NavLink to="/how-it-works" className="py-2" onClick={() => setOpen(false)}>How It Works</NavLink>
            <NavLink to="/contact" className="py-2" onClick={() => setOpen(false)}>Contact</NavLink>

            <Link
              to="/login"
              className="mt-4 inline-flex items-center justify-center bg-blue-600 text-white rounded px-4 py-2 font-semibold"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
