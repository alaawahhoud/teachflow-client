// src/pages/Home.jsx
import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import WhyTeachFlow from '../components/WhyTeachFlow';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <WhyTeachFlow />
      <Footer />
    </>
  );
};

export default Home;
