import React from "react";
import { motion } from "framer-motion";
import BackButton from "../components/BackButton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const Contact = () => {
  return (
    <motion.div
      className="min-h-screen bg-[#7ABCD233] flex items-center justify-center px-4"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div
        className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-2xl"
        variants={itemVariants}
      >
        <motion.h2
          className="text-4xl font-bold text-center text-gray-800 mb-6"
          variants={itemVariants}
        >
          Contact Us
        </motion.h2>

        <motion.p
          className="text-center text-gray-600 mb-6"
          variants={itemVariants}
        >
          We're here to assist you. Reach out for support or inquiries.
        </motion.p>

        <motion.div
          className="space-y-4 text-center text-gray-700"
          variants={itemVariants}
        >
          <p>
            <strong>Email:</strong> teachflow.support@edu.lb
          </p>
          <p>
            <strong>Phone:</strong> +961 81 495 185
          </p>
          <BackButton />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Contact;
