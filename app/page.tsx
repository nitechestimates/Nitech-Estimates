import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import LoginErrorAlert from "@/components/LoginErrorAlert";

export default function Home() {
  return (
    <div className="relative flex-1 w-full overflow-hidden flex flex-col bg-gray-950 justify-center">
      
      {/* Optimized Background Image */}
      <div className="absolute inset-0 z-0">
         <Image 
            src="/bg.jpg" 
            alt="Background" 
            fill 
            priority 
            className="object-cover object-center opacity-40 animate-fade-in"
            quality={90}
         />
         {/* Dynamic breathing overlay to make background feel alive */}
         <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/85 to-blue-950/70 opacity-90 animate-bg-breath"></div>
      </div>

      {/* Content wrapper with z-index */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
        
        {/* Suspense bounded error alert box */}
        <Suspense fallback={null}>
          <LoginErrorAlert />
        </Suspense>

        {/* Central Floating Glassmorphic Container */}
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-16 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-white/15 animate-fade-in-up animate-float relative overflow-hidden">
          
          {/* Subtle neon blue indicator light in top-right */}
          <span className="absolute top-4 right-4 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>

          {/* Sliding Name */}
          <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight drop-shadow-lg select-none">
            NITECH <span className="text-blue-500">ESTIMATES</span>
          </h1>
          
          {/* Decorative Divider */}
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-6 mb-8 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          
          {/* Sliding Subtitle */}
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl font-light leading-relaxed select-none">
            A premium, professional engineering suite for Nashik circle civil rate analysis, precise measurement tracking, and dynamic project abstract generation.
          </p>
          
          {/* Glowing CTA Button */}
          <div className="mt-12">
            <Link 
              href="/estimate-builder" 
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold rounded-full transition-all duration-300 hover:scale-105 shadow-[0_0_35px_-5px_rgba(37,99,235,0.6)] hover:shadow-[0_0_50px_rgba(79,70,229,0.8)] border border-blue-400/20"
            >
              Open Estimate Builder
              <svg className="w-6 h-6 group-hover:translate-x-1.5 transition-transform duration-300 ease-out" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}