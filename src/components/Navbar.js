// src/components/Navbar.jsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-4 sm:px-6 py-4 bg-transparent">
      {/* Logo on the left */}
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="TeachFlow Logo" className="h-8 w-auto" />
        <span className="text-lg sm:text-xl font-bold text-white">TeachFlow</span>
      </div>

      {/* Centered Links (تظهر بس من md وطالع) */}
      <div className="hidden md:flex flex-1 justify-center gap-8">
        <NavLink to="/features" className="text-white hover:text-blue-200 transition">Features</NavLink>
        <NavLink to="/how-it-works" className="text-white hover:text-blue-200 transition">How It Works</NavLink>
        <NavLink to="/contact" className="text-white hover:text-blue-200 transition">Contact</NavLink>
      </div>

      {/* Login Button on the right */}
      <div>
        <Link
          to="/login"
          className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-100 transition font-semibold text-sm sm:text-base"
        >
          Login
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
