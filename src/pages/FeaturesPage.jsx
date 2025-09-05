import React from "react";
import { motion } from "framer-motion";
import { FaFingerprint, FaExchangeAlt, FaFileAlt } from "react-icons/fa";
import BackButton from "../components/BackButton";

const features = [
  {
    title: "Smart Attendance",
    description:
      "Teachers can check in/out using fingerprint authentication. Attendance is logged instantly and tracked in real time.",
    icon: <FaFingerprint className="text-blue-600 text-3xl" />,
    bg: "bg-blue-100",
  },
  {
    title: "Auto Substitution",
    description:
      "Automatically assigns available teachers when someone is absent, based on availability and teaching load.",
    icon: <FaExchangeAlt className="text-purple-600 text-3xl" />,
    bg: "bg-purple-100",
  },
  {
    title: "Exam & Grading",
    description:
      "Upload, assign, solve, and grade exams easily. Results are archived and visualized for tracking progress.",
    icon: <FaFileAlt className="text-green-600 text-3xl" />,
    bg: "bg-green-100",
  },
];

const FeaturesPage = () => {
  return (
    <section className="min-h-screen bg-[#7ABCD233] px-6 py-16">
      <motion.div
        className="max-w-6xl mx-auto text-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-10">TeachFlow Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.3 }}
              viewport={{ once: true }}
            >
              <div className={`w-16 h-16 flex items-center justify-center rounded-xl ${feature.bg} mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
        <BackButton />
      </motion.div>
    </section>
  );
};

export default FeaturesPage;
