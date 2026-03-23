"use client";
import Tabs from "../components/Tabs";

export default function AbstractPage() {
  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />
      <h1 className="text-2xl font-bold mb-4">Abstract</h1>
      <p>This page will display the abstract of the estimate.</p>
      <p>Coming soon – totals from Rate Analysis and Measurement Sheet will appear here.</p>
    </div>
  );
}