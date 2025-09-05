// src/pages/Home.jsx
import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import WhyTeachFlow from "../components/WhyTeachFlow";
import Footer from "../components/Footer";

const Home = () => {
  return (
    <div className="bg-[#F9FAFB] text-gray-800">
      <Navbar />     {/* 🟦 شفاف أعلى السلايدشو */}
      <Hero />       {/* 🖼️ صور السلايدشو بخلفية */}
      <Features />   {/* ✅ باقي الأقسام */}
      <WhyTeachFlow />
      <Footer />
    </div>
  );
};

export default Home;
