// src/components/Hero.jsx
import React, { useEffect, useState } from "react";

const images = [
  "/pic/1.jpg",
  "/pic/2.jpg",
  "/pic/3.jpg",
  "/pic/4.jpg",
  "/pic/5.jpg",
  "/pic/6.jpg",
  "/pic/7.jpg",
  "/pic/8.jpg",
];

const Hero = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000); // ⏱️ 3 ثواني بدل 2 لتقليل الإزعاج

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full h-[90vh] overflow-hidden flex items-center justify-center text-center text-white">
      {/* Background Slideshow */}
      <div className="absolute inset-0 z-0">
        {images.map((src, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40 z-10" />

      {/* Hero Content */}
      <div className="relative z-20 px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Teachers teach,<br />we do the rest.
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-6">
          An academic management system for modern schools.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <button className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 transition">
            Get Started
          </button>
          <button className="border border-white text-white px-6 py-2 rounded hover:bg-white hover:text-blue-600 transition">
            View Demo
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
