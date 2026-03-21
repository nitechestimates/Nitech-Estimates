"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `transition-all duration-200 ease-in-out transform hover:scale-110 hover:text-blue-600 ${
      pathname === path
        ? "text-blue-600 font-semibold scale-110"
        : "text-black"
    }`;

  return (
    <nav className="flex items-center px-8 py-4 bg-white/90 backdrop-blur-md shadow-md">
      
      {/* Logo */}
      <h1 className="text-2xl font-bold text-black">
        NITECH ESTIMATES
      </h1>

      {/* Center Menu */}
      <div className="flex gap-10 mx-auto font-medium">
        <Link href="/" className={linkClass("/")}>
          Home
        </Link>
        <Link href="/tutorial" className={linkClass("/tutorial")}>
          Tutorial
        </Link>
        <Link href="/estimate" className={linkClass("/estimate")}>
          Estimate Builder
        </Link>
        <Link href="/contact" className={linkClass("/contact")}>
          Contact
        </Link>
      </div>

      {/* Spacer */}
      <div className="w-[120px]"></div>
    </nav>
  );
}