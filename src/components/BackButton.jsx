// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center mt-6">
      <button
        onClick={() => navigate("/")}
        className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm sm:text-base"
      >
        Back to Home
      </button>
    </div>
  );
};

export default BackButton;
