"use client";

import { useRouter } from "next/navigation";

export default function EstimateBuilderHome() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-12 p-6 animate-fade-in-up w-full">
      
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Estimate Builder
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Manage your rate analysis, measurements, and project abstracts all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-4">
        
        {/* Create New Estimate Card */}
        <button
          onClick={() => router.push("/estimate-builder/create")}
          className="group flex flex-col items-center justify-center p-12 bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-300 transition-all duration-500 transform hover:-translate-y-2 relative overflow-hidden w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="w-24 h-24 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 shadow-inner group-hover:shadow-[0_10px_30px_-10px_rgba(37,99,235,0.7)] z-10">
            <svg className="w-12 h-12 group-hover:scale-110 transition-transform duration-300 delay-75" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-2xl font-extrabold text-gray-900 z-10 group-hover:text-blue-700 transition-colors">Create New Estimate</span>
          <span className="text-gray-500 mt-2 text-sm z-10">Start a fresh project from scratch</span>
        </button>

        {/* View Old Estimates Card */}
        <button
          onClick={() => router.push("/estimate-builder/history")}
          className="group flex flex-col items-center justify-center p-12 bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-300 transition-all duration-500 transform hover:-translate-y-2 relative overflow-hidden w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="w-24 h-24 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white group-hover:-rotate-6 group-hover:scale-110 transition-all duration-500 shadow-inner group-hover:shadow-[0_10px_30px_-10px_rgba(79,70,229,0.7)] z-10">
            <svg className="w-12 h-12 group-hover:scale-110 transition-transform duration-300 delay-75" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-2xl font-extrabold text-gray-900 z-10 group-hover:text-indigo-700 transition-colors">View History</span>
          <span className="text-gray-500 mt-2 text-sm z-10">Access your previously saved estimates</span>
        </button>

      </div>
    </div>
  );
}