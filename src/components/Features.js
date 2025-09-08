// src/components/Features.jsx
import React from "react";
import { FaFingerprint, FaExchangeAlt, FaFileAlt } from "react-icons/fa";

const features = [
  {
    title: "Attendance",
    description:
      "Attendance tracking with real-time notifications and comprehensive reporting for better student monitoring.",
    icon: <FaFingerprint className="text-blue-600 text-3xl sm:text-4xl" />,
    bg: "bg-blue-100",
  },
  {
    title: "Auto Substitution",
    description:
      "Intelligent substitute teacher assignment system that ensures continuous learning with minimal disruption.",
    icon: <FaExchangeAlt className="text-purple-600 text-3xl sm:text-4xl" />,
    bg: "bg-purple-100",
  },
  {
    title: "Exams & Grading",
    description:
      "Comprehensive exam management and automated grading system with detailed analytics and progress tracking.",
    icon: <FaFileAlt className="text-green-600 text-3xl sm:text-4xl" />,
    bg: "bg-green-100",
  },
];

const Features = () => {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
  <div className="max-w-6xl mx-auto grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-[#F9FAFB] rounded-xl shadow hover:shadow-md transition-all duration-300 p-6 text-center"
          >
            <div
              className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl ${feature.bg}`}
            >
              {feature.icon}
            </div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
