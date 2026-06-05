"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const linkClass = (path: string) =>
    `relative px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ease-out group ${
      pathname === path ? "text-slate-900 bg-slate-100/50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
    }`;

  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-3 bg-white/70 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border-b border-white/20 sticky top-0 z-50 animate-slide-down">
      
      {/* Logo */}
      <h1 className="text-xl font-black tracking-tighter w-[250px] bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent drop-shadow-sm">
        NITECH ESTIMATES
      </h1>

      {/* Center Links */}
      <div className="hidden md:flex gap-2 font-medium justify-center items-center p-1 rounded-full bg-slate-50/50 border border-slate-200/50 shadow-inner">
        <Link href="/" className={linkClass("/")}>Home</Link>
        <Link href="/tutorial" className={linkClass("/tutorial")}>Tutorial</Link>
        <Link href="/estimate-builder" className={linkClass("/estimate-builder")}>Estimate Builder</Link>
        <Link href="/contact" className={linkClass("/contact")}>Contact</Link>
      </div>

      {/* Auth Section */}
      <div className="w-[250px] flex justify-end">
        {session ? (
          <div className="flex items-center gap-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shadow-sm">
                {session.user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden lg:block">
                {session.user?.name}
              </span>
            </div>
            <button 
              onClick={() => signOut()} 
              className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-red-200 hover:text-red-600 text-slate-600 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              let callbackUrl = "/estimate-builder";
              if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search);
                const cb = params.get("callbackUrl");
                if (cb) {
                  callbackUrl = cb;
                }
              }
              signIn("google", { callbackUrl });
            }} 
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-1.5 rounded-xl text-sm font-bold shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300 animate-fade-in"
          >
            Log in
          </button>
        )}
      </div>
    </nav>
  );
}