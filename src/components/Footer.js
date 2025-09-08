// src/components/Footer.jsx
import React from "react";
import { FaEnvelope, FaPhone } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-white border-t text-gray-800">
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10 flex flex-col md:flex-row justify-between gap-8">
        {/* Left section - Brand */}
        <div>
          <h2 className="text-2xl font-bold">TeachFlow</h2>
          <p className="text-sm text-gray-600 mt-2 max-w-xs">
            Empowering schools with smart academic management solutions for the modern educational landscape.
          </p>
        </div>

        {/* Right section - Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Contact Us</h3>
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
            <FaEnvelope className="text-blue-600" />
            <a
              href="mailto:teachflow.support@edu.lb"
              className="hover:underline hover:text-blue-700 transition"
            >
              teachflow.support@edu.lb
            </a>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <FaPhone className="text-blue-600" />
            <a
              href="tel:+96181495185"
              className="hover:underline hover:text-blue-700 transition"
            >
              +961 81 495 185
            </a>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 py-4 border-t">
        © 2025 TeachFlow. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
