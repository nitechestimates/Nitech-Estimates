"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const linkClass = (path) =>
    `transition-all duration-200 ease-in-out transform hover:scale-110 hover:text-blue-600 ${
      pathname === path ? "text-blue-600 font-semibold scale-110" : "text-black"
    }`;

  return (
    <nav className="flex items-center px-8 py-4 bg-white/90 backdrop-blur-md shadow-md">
      <h1 className="text-2xl font-bold text-black">NITECH ESTIMATES</h1>

      <div className="flex gap-10 mx-auto font-medium">
        <Link href="/" className={linkClass("/")}>Home</Link>
        <Link href="/tutorial" className={linkClass("/tutorial")}>Tutorial</Link>
        <Link href="/estimate-builder" className={linkClass("/estimate-builder")}>Estimate Builder</Link>
        <Link href="/contact" className={linkClass("/contact")}>Contact</Link>
      </div>

      <div className="w-[200px] flex justify-end">
        {session ? (
          <div className="flex items-center gap-3">
            <span className="text-sm">{session.user?.name}</span>
            <button onClick={() => signOut()} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
              Logout
            </button>
          </div>
        ) : (
          <button onClick={() => signIn("google")} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
            Login
          </button>
        )}
      </div>
    </nav>
  );
}