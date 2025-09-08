import React from "react";
import { FaCheckCircle } from "react-icons/fa";

const reasons = [
  {
    title: "Centralized academic operations",
    description:
      "Manage all academic activities from a single, intuitive dashboard that brings everything together.",
  },
  {
    title: "Scheduling & tracking",
    description:
      "Algorithms handle complex scheduling while tracking every aspect of school operations automatically.",
  },
  {
    title: "Real-time staff coordination",
    description:
      "Instant communication and coordination tools keep your entire staff connected and informed.",
  },
];

function WhyTeachFlow() {
  return (
<section className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Why Schools Love TeachFlow
          </h2>
          <div className="space-y-6">
            {reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <FaCheckCircle className="text-green-500 text-lg mt-1" />
                <div>
                  <h3 className="font-semibold">{reason.title}</h3>
                  <p className="text-sm text-gray-600">{reason.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Dashboard Preview + Stats */}
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="h-40 bg-gray-200 flex items-center justify-center text-gray-500 text-lg rounded-lg mb-6">
            Dashboard Preview
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-600 font-bold text-xl">98%</p>
              <p className="text-gray-600">Attendance Rate</p>
            </div>
            <div>
              <p className="text-green-600 font-bold text-xl">24/7</p>
              <p className="text-gray-600">System Uptime</p>
            </div>
            <div>
              <p className="text-orange-500 font-bold text-xl">500+</p>
              <p className="text-gray-600">Schools Trust Us</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhyTeachFlow;
