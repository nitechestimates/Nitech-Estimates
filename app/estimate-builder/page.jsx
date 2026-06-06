"use client";

import { useRouter } from "next/navigation";

export default function EstimateBuilderHome() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-12 p-6 animate-fade-in-up w-full relative">
      
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 z-0 pointer-events-none"></div>

      <div className="text-center z-10">
        <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tighter mb-4 drop-shadow-sm">
          Estimate Builder
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">
          Manage your rate analysis, measurements, and project abstracts all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full max-w-7xl mt-4 z-10">
        
        {/* Create New Estimate Card */}
        <button
          onClick={() => router.push("/estimate-builder/create")}
          className="group flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.15)] hover:border-blue-200 transition-all duration-300 ease-out transform hover:-translate-y-1 will-change-transform relative overflow-hidden w-full cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></div>
          
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-50 to-blue-100/50 rounded-3xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-blue-500 group-hover:text-white group-hover:scale-105 transition-all duration-300 ease-out shadow-sm border border-blue-100 group-hover:border-blue-500 group-hover:shadow-[0_10px_30px_-10px_rgba(37,99,235,0.6)] z-10">
            <svg className="w-10 h-10 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 z-10 group-hover:text-blue-700 transition-colors duration-300">Create New</span>
          <span className="text-slate-500 mt-2 text-xs z-10 font-medium">Start a fresh project from scratch</span>
        </button>

        {/* View Old Estimates Card */}
        <button
          onClick={() => router.push("/estimate-builder/history")}
          className="group flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.15)] hover:border-indigo-200 transition-all duration-300 ease-out transform hover:-translate-y-1 will-change-transform relative overflow-hidden w-full cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></div>

          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-50 to-indigo-100/50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-gradient-to-tr group-hover:from-indigo-600 group-hover:to-indigo-500 group-hover:text-white group-hover:scale-105 transition-all duration-300 ease-out shadow-sm border border-indigo-100 group-hover:border-indigo-500 group-hover:shadow-[0_10px_30px_-10px_rgba(79,70,229,0.6)] z-10">
            <svg className="w-10 h-10 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 z-10 group-hover:text-indigo-700 transition-colors duration-300">History</span>
          <span className="text-slate-500 mt-2 text-xs z-10 font-medium">Access your previously saved estimates</span>
        </button>

        {/* Data Sheet Card */}
        <button
          onClick={() => router.push("/estimate-builder/datasheet")}
          className="group flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.15)] hover:border-emerald-200 transition-all duration-300 ease-out transform hover:-translate-y-1 will-change-transform relative overflow-hidden w-full cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></div>

          <div className="w-20 h-20 bg-gradient-to-tr from-emerald-50 to-emerald-100/50 rounded-3xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-gradient-to-tr group-hover:from-emerald-600 group-hover:to-emerald-500 group-hover:text-white group-hover:scale-105 transition-all duration-300 ease-out shadow-sm border border-emerald-100 group-hover:border-emerald-500 group-hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)] z-10">
            <svg className="w-10 h-10 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M8 3v4M16 3v4M9 11h6M9 15h6" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 z-10 group-hover:text-emerald-700 transition-colors duration-300">Data Sheet</span>
          <span className="text-slate-500 mt-2 text-xs z-10 font-medium">Manage Setup & Lead Profiles</span>
        </button>

        {/* MB Records Card */}
        <button
          onClick={() => router.push("/estimate-builder/mb-records")}
          className="group flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(234,88,12,0.15)] hover:border-orange-200 transition-all duration-300 ease-out transform hover:-translate-y-1 will-change-transform relative overflow-hidden w-full cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></div>

          <div className="w-20 h-20 bg-gradient-to-tr from-orange-50 to-orange-100/50 rounded-3xl flex items-center justify-center text-orange-600 mb-6 group-hover:bg-gradient-to-tr group-hover:from-orange-600 group-hover:to-orange-500 group-hover:text-white group-hover:scale-105 transition-all duration-300 ease-out shadow-sm border border-orange-100 group-hover:border-orange-500 group-hover:shadow-[0_10px_30px_-10px_rgba(234,88,12,0.6)] z-10">
            <svg className="w-10 h-10 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 z-10 group-hover:text-orange-700 transition-colors duration-300">MB Records</span>
          <span className="text-slate-500 mt-2 text-xs z-10 font-medium">Registry of sequential MB records</span>
        </button>

      </div>
    </div>
  );
}