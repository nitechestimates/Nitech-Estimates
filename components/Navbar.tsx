"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const linkClass = (path: string) =>
    `transition-all duration-300 ease-in-out transform hover:scale-105 hover:text-blue-600 ${
      pathname === path ? "text-blue-600 font-semibold scale-105" : "text-gray-700"
    }`;

  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-4 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50 animate-slide-down">
      
      {/* Logo */}
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 w-[250px]">
        NITECH ESTIMATES
      </h1>

      {/* Center Links */}
      <div className="hidden md:flex gap-8 font-medium justify-center">
        <Link href="/" className={linkClass("/")}>Home</Link>
        <Link href="/tutorial" className={linkClass("/tutorial")}>Tutorial</Link>
        <Link href="/estimate-builder" className={linkClass("/estimate-builder")}>Estimate Builder</Link>
        <Link href="/contact" className={linkClass("/contact")}>Contact</Link>
      </div>

      {/* Auth Section */}
      <div className="w-[250px] flex justify-end">
        {session ? (
          <div className="flex items-center gap-4 animate-fade-in">
            <span className="text-sm font-medium text-gray-600 hidden lg:block">
              {session.user?.name}
            </span>
            <button 
              onClick={() => signOut()} 
              className="bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => signIn("google")} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all duration-200 animate-fade-in"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}