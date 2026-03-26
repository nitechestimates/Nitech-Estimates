"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Tabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Rate Analysis", href: "/estimate-builder/rate-analysis" },
    { name: "Measurement Sheet", href: "/estimate-builder/measurement" },
    { name: "Abstract", href: "/estimate-builder/abstract" },
    { name: "Leads", href: "/estimate-builder/leads" },
  ];

  return (
    <div className="flex gap-4 border-b border-gray-300 mb-6 pb-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-lg font-medium transition-all duration-200 ${
              isActive
                ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px]"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}