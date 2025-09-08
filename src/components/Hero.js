import React, { useEffect, useState } from "react";

const images = ["/pic/1.jpg","/pic/2.jpg","/pic/3.jpg","/pic/4.jpg","/pic/5.jpg","/pic/6.jpg","/pic/7.jpg","/pic/8.jpg"];

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="relative w-full h-[68vh] sm:h-[78vh] md:h-[88vh] overflow-hidden flex items-center justify-center text-center text-white"
      aria-label="TeachFlow overview"
    >
      {/* Background slideshow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {images.map((src, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${src})` }}
            role="img"
            aria-hidden={i !== index}
          />
        ))}
      </div>

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/45 z-10" />

      {/* Content */}
      <div className="relative z-20 px-4 pt-16"> {/* pt-16 ليتنفّس تحت النافبار */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
          Teachers teach,<br className="hidden sm:block" /> we do the rest.
        </h1>
        <p className="text-base sm:text-lg max-w-2xl mx-auto mb-5 sm:mb-6 px-2">
          An academic management system for modern schools.
        </p>
        <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
          <button className="bg-blue-600 text-white px-5 sm:px-6 py-2 rounded shadow hover:bg-blue-700 transition">
            Get Started
          </button>
          <button className="border border-white text-white px-5 sm:px-6 py-2 rounded hover:bg-white hover:text-blue-600 transition">
            View Demo
          </button>
        </div>
      </div>
    </section>
  );
}
