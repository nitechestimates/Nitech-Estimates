"use client";
import Link from "next/link";

export default function EstimateBuilderPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Estimate Builder</h1>

      <div className="flex flex-col gap-4 w-[300px]">

        <Link href="/estimate-builder/rate-analysis">
          <div className="p-4 bg-blue-500 text-white text-center rounded">
            Rate Analysis
          </div>
        </Link>

        <Link href="/estimate-builder/summary">
          <div className="p-4 bg-green-500 text-white text-center rounded">
            Abstract
          </div>
        </Link>

        <Link href="/estimate-builder/measurement">
          <div className="p-4 bg-purple-500 text-white text-center rounded">
            Measurement Sheet
          </div>
        </Link>

      </div>
    </div>
  );
}