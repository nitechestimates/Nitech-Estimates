import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <div className="relative h-screen w-full">
      
      {/* Background Image */}
      <div className="absolute inset-0 bg-[url('/bg.jpg')] bg-cover bg-center"></div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        <div className="flex items-center justify-center h-[80vh]">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white text-center">
            NITECH ESTIMATES
          </h1>
        </div>
      </div>
    </div>
  );
}