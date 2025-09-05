import React from "react";
import { motion } from "framer-motion";
import { FaUserCheck, FaChalkboardTeacher, FaChartBar } from "react-icons/fa";
import BackButton from "../components/BackButton";

const steps = [
  {
    icon: <FaUserCheck className="text-white text-2xl" />,
    title: "Login & Access",
    description: "Secure login with role-based access for teachers and admins.",
    bg: "bg-blue-600",
  },
  {
    icon: <FaChalkboardTeacher className="text-white text-2xl" />,
    title: "Manage Classes",
    description: "Organize schedules, handle attendance and substitution easily.",
    bg: "bg-purple-600",
  },
  {
    icon: <FaChartBar className="text-white text-2xl" />,
    title: "Track Performance",
    description: "Access exam results, analytics, and teacher records in one place.",
    bg: "bg-green-600",
  },
];

const HowItWorks = () => {
  return (
    <section className="min-h-screen bg-[#7ABCD230] px-6 py-16">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-bold text-gray-800 mb-12"
        >
          How TeachFlow Works
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <div className={`w-16 h-16 flex items-center justify-center rounded-full ${step.bg} mb-4 mx-auto`}>
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </motion.div>
            
          ))}
          <BackButton />
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
