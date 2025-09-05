// src/pages/Help.jsx
import React from "react";
import { FaSearch, FaEnvelope, FaPhone, FaClock } from "react-icons/fa";

const Help = () => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 text-gray-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-1">Help Center</h1>
        <p className="text-center text-gray-500 mb-6">
          How can we assist you today?
        </p>

        {/* Search Bar */}
        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              placeholder="Search articles, guides, or keywords..."
              className="w-full border border-gray-300 rounded-full py-2 px-5 pr-10 focus:outline-none"
            />
            <FaSearch className="absolute right-3 top-2.5 text-gray-400" />
          </div>
        </div>

        {/* Introduction Paragraph */}
        <p className="text-sm text-gray-600 mb-6">
          This comprehensive Help Center page includes all the requested features with a clean, friendly design that matches TeachFlow's brand aesthetic. You can interact with the various elements in the canvas to test the functionality - try clicking on category cards to expand article lists, opening FAQ items, and accessing the live chat modal. If you'd like any adjustments to the layout, content, or styling, just let me know and I'll make the updates!
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Articles and FAQs */}
          <div className="md:col-span-2 space-y-6">
            {/* Popular Articles */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Popular Articles</h2>
                <a href="#" className="text-blue-500 text-sm hover:underline">
                  Read More →
                </a>
              </div>
              <p className="text-sm text-gray-500">No articles yet.</p>
            </div>

            {/* FAQ */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">
                Frequently Asked Questions
              </h2>
              <select className="w-full border border-gray-300 rounded px-4 py-2 text-sm">
                <option>Choose a question...</option>
              </select>
            </div>
          </div>

          {/* Right Column - Support Options */}
          <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
            <h3 className="text-md font-semibold">Need more help?</h3>
            <p className="text-sm text-gray-500">
              Can't find what you're looking for? Our support team is here to help.
            </p>

            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded shadow">
              💬 Live Chat
            </button>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded shadow">
              📩 Submit a Ticket
            </button>
            <button className="w-full text-blue-500 hover:underline text-sm">
              📧 Email Us
            </button>

            <div className="text-sm mt-4 border-t pt-4">
              <h4 className="font-semibold mb-2">Contact Information</h4>
              <p className="flex items-center gap-2 mb-1">
                <FaPhone className="text-gray-500" /> 961 81495185
              </p>
              <p className="flex items-center gap-2 mb-1">
                <FaEnvelope className="text-gray-500" /> support@teachflow.com
              </p>
              <p className="flex items-center gap-2 text-gray-500">
                <FaClock /> Mon-Fri, 9AM-6PM EST
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
