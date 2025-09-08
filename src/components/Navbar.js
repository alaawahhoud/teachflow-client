import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-transparent">
      {/* Logo on the left */}
      <div className="flex items-center space-x-2">
        <img src="/logo.png" alt="TeachFlow Logo" className="h-8 w-auto" />
        <span className="text-xl font-bold text-white dark:text-white">TeachFlow</span>
      </div>

      {/* Centered Links */}
      <div className="flex-1 flex justify-center space-x-8">
        <Link
          to="/features"
          className="text-white dark:text-white hover:text-blue-200 dark:hover:text-blue-300 transition"
        >
          Features
        </Link>
        <Link
          to="/how-it-works"
          className="text-white dark:text-white hover:text-blue-200 dark:hover:text-blue-300 transition"
        >
          How It Works
        </Link>
        <Link
          to="/contact"
          className="text-white dark:text-white hover:text-blue-200 dark:hover:text-blue-300 transition"
        >
          Contact
        </Link>
      </div>

      {/* Login Button on the right */}
      <div>
        <Link
          to="/login"
          className="bg-white dark:bg-gray-800 text-blue-600 dark:text-white px-4 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 transition font-semibold"
        >
          Login
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
