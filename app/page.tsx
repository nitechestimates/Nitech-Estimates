import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex-1 w-full overflow-hidden flex flex-col">
      
      {/* Optimized Background Image */}
      <div className="absolute inset-0 z-0">
         <Image 
            src="/bg.jpg" 
            alt="Background" 
            fill 
            priority 
            className="object-cover object-center animate-fade-in"
            quality={90}
         />
         {/* Dark Gradient Overlay for better contrast */}
         <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-20">
        
        {/* Sliding Name */}
        <h1 className="text-5xl md:text-8xl font-black text-white text-center tracking-tighter drop-shadow-2xl animate-slide-in-left">
          NITECH <span className="text-blue-500">ESTIMATES</span>
        </h1>
        
        {/* Sliding Subtitle */}
        <p className="mt-6 text-xl md:text-2xl text-gray-200 text-center max-w-2xl opacity-0 animate-slide-in-right" style={{animationDelay: "0.2s"}}>
          The ultimate tool for precise civil engineering rate analysis, measurements, and project abstracts.
        </p>
        
        {/* Glowing CTA Button */}
        <div className="mt-12 opacity-0 animate-fade-in-up" style={{animationDelay: "0.6s"}}>
          <Link 
            href="/estimate-builder" 
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-full transition-all duration-300 hover:scale-105 shadow-[0_0_40px_-10px_rgba(37,99,235,0.7)] hover:shadow-[0_0_60px_-10px_rgba(37,99,235,0.9)]"
          >
            Open Estimate Builder
            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

      </div>
    </div>
  );
}