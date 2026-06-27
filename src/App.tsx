import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Users, Upload, Award, Lock } from "lucide-react";
import { ScanTab } from "./components/ScanTab";
import { StudentsTab } from "./components/StudentsTab";
import { ImportTab } from "./components/ImportTab";
import { getStudents } from "./lib/studentService";

export default function App() {
  const [activeTab, setActiveTab] = useState<"scan" | "students" | "import">("scan");
  const [studentCount, setStudentCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Function to refresh general stats
  const refreshStats = async () => {
    try {
      const list = await getStudents();
      setStudentCount(list.length);
    } catch (e) {
      console.error("Error fetching student counts:", e);
    }
  };

  useEffect(() => {
    refreshStats();
    // Live clock update
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1A1A2E] flex flex-col font-sans" id="app-root">
      
      {/* BRANDED ACADEMIC HEADER */}
      <header className="bg-[#0B3C26] border-b-4 border-[#EAB308] px-6 md:px-8 py-4 flex items-center justify-between shadow-lg flex-none relative z-10 select-none" id="tshs-portal-header">
        
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & School Seal + Text */}
          <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left">
            
            {/* OFFICIAL GREEN LOGO */}
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-2 border-[#EAB308] shadow-md flex-shrink-0 transition-transform duration-300 hover:scale-105">
              <img src="/TAGSI_Logo.png" alt="TagSci Logo" className="w-12 h-12 object-contain" />
            </div>

            {/* School Text & Tagline */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start">
                <span className="bg-[#EAB308] text-[#0B3C26] text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider self-center sm:self-start">
                  Official Portal
                </span>
                <span className="text-xs text-[#EAB308] font-mono font-medium">Republika ng Pilipinas</span>
              </div>
              
              <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 uppercase">
                Taguig Science High School
              </h1>
              
              <p className="text-[#EAB308] text-sm font-medium italic uppercase tracking-wider mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                <Award className="w-3.5 h-3.5 text-[#EAB308]" />
                Verifying Excellence, Securing Futures
              </p>
            </div>

          </div>

          {/* Real-time Meta Stats Widget */}
          <div className="text-center md:text-right text-white select-none">
            <div className="text-xs font-semibold uppercase opacity-75 tracking-wider font-sans">
              Guard Terminal #04 • Main Gate
            </div>
            <div className="font-mono text-lg font-bold text-[#EAB308] tracking-wider mt-0.5">
              {currentTime.toLocaleTimeString("en-US")}
            </div>
            <div className="text-[10px] opacity-95 font-mono mt-0.5">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric"
              })} • <strong className="text-white font-bold">{studentCount} Enrolled</strong>
            </div>
          </div>

        </div>

      </header>

      {/* PORTAL TAB NAVIGATION */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20 select-none shadow-xs" id="portal-navigation-tabs">
        <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto scrollbar-none gap-3 py-3">
          
          {/* TAB 1: GUARD SCANNER */}
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-sans text-xs md:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "scan"
                ? "bg-[#0B3C26] text-[#EAB308] shadow-md border border-[#0B3C26]"
                : "text-slate-600 hover:text-[#0B3C26] hover:bg-[#F4F6F9]"
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeTab === "scan" ? "text-[#EAB308]" : "text-slate-400"}`} />
            Guard QR Scanner
          </button>

          {/* TAB 2: STUDENTS DIRECTORY */}
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-sans text-xs md:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "students"
                ? "bg-[#0B3C26] text-[#EAB308] shadow-md border border-[#0B3C26]"
                : "text-slate-600 hover:text-[#0B3C26] hover:bg-[#F4F6F9]"
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === "students" ? "text-[#EAB308]" : "text-slate-400"}`} />
            Student Records List
          </button>

          {/* TAB 3: IMPORT PORTAL */}
          <button
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-sans text-xs md:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "import"
                ? "bg-[#0B3C26] text-[#EAB308] shadow-md border border-[#0B3C26]"
                : "text-slate-600 hover:text-[#0B3C26] hover:bg-[#F4F6F9]"
            }`}
          >
            <Upload className={`w-4 h-4 ${activeTab === "import" ? "text-[#EAB308]" : "text-slate-400"}`} />
            Import Student data
          </button>

        </div>
      </nav>

      {/* SYSTEM WORKSPACE STAGE */}
      <main className="flex-1 pb-16">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          {activeTab === "scan" && <ScanTab />}
          {activeTab === "students" && <StudentsTab />}
          {activeTab === "import" && <ImportTab onImportSuccess={refreshStats} />}
        </motion.div>
      </main>

      {/* SYSTEM INFORMATION BAR / FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center select-none mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-300" />
            <span>Secure Taguig Science HS ID Verification System &copy; 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Server: Express Gateway Server</span>
            <span>|</span>
            <span>DB: Supabase Cloud PostgreSQL</span>
            <span>|</span>
            <span>Image CDN: Cloudinary Media Storage</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
