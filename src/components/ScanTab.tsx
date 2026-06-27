import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Search, Play, Pause, AlertTriangle, ShieldCheck } from "lucide-react";
import { Student } from "../types";
import { getStudentByLrn, getStudentByQrPayload } from "../lib/studentService";
import { StudentAvatar } from "./StudentAvatar";

export const ScanTab: React.FC = () => {
  const [lrnInput, setLrnInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<{
    status: "idle" | "success" | "not_found";
    student?: Student;
    lrnAttempted?: string;
    message?: string;
  }>({ status: "idle" });

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "tshs-qr-reader";
  const autoResumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      stopScanner();
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
      }
    };
  }, []);

  // Handle student lookup
  const handleVerifyLrn = async (payload: string, isManual = false) => {
    // Stop scanner briefly on detection to avoid double scans
    stopScanner();

    let result;
    const isSignedPayload = payload.includes(".");

    if (isSignedPayload) {
      result = await getStudentByQrPayload(payload);
    } else if (isManual || localStorage.getItem("legacy_qr_mode") === "true") {
      // Manual guard entry OR Legacy Mode allows raw LRN lookups
      result = await getStudentByLrn(payload);
    } else {
      // Camera scanned a plain LRN QR code! Reject it.
      result = {
        found: false,
        message: "Plain (unsigned) QR codes are disabled for gate entry security. Please present your officially signed school ID."
      };
    }

    if (result.found && result.student) {
      setScannedResult({
        status: "success",
        student: result.student,
        lrnAttempted: result.student.lrn
      });
      // Play high pitch beep tone (simulated via Web Audio API)
      playBeep(2000, 0.15);
    } else {
      setScannedResult({
        status: "not_found",
        lrnAttempted: isSignedPayload ? "Signed Token" : payload,
        message: result.message
      });
      // Play low buzz tone
      playBeep(220, 0.35);
    }

    // Auto-resume camera scanning after 5 minutes
    if (autoResumeTimeoutRef.current) {
      clearTimeout(autoResumeTimeoutRef.current);
    }
    autoResumeTimeoutRef.current = setTimeout(() => {
      startScanner();
    }, 300000);
  };

  // Sound generator for professional feedback
  const playBeep = (freq: number, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context block by browser security is fine
    }
  };

  // Start Camera QR scanner
  const startScanner = async () => {
    setCameraError(null);
    setScanning(true);
    setScannedResult({ status: "idle" });

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.72;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          // Success callback
          if (decodedText) {
            handleVerifyLrn(decodedText, false);
          }
        },
        () => {
          // Failure callback is too chatty (fails to detect on most frames), ignore.
        }
      );
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        "Could not access camera. Please ensure permissions are granted and that the app is open in a new tab if running in an iframe."
      );
      setScanning(false);
    }
  };

  // Stop Camera
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
    setScanning(false);
  };

  // Submit manual form
  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lrnInput.trim()) return;
    handleVerifyLrn(lrnInput.trim(), true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto px-4 py-6" id="scan-view-root">
      
      {/* LEFT COLUMN: SCANNER VIEWPORT */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col" id="scanner-container-card">
          
          {/* Clean Minimalism Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2 text-[#0B3C26]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308]"></span>
              LIVE SCANNER FEED
            </h2>
            <span className="text-[10px] bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse">
              {scanning ? "REC" : "STANDBY"}
            </span>
          </div>

          {/* Camera Scan Display */}
          <div className="relative bg-slate-900 flex flex-col items-center justify-center p-6 aspect-square w-full overflow-hidden shadow-inner group">
            
            {/* Subtle background overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#EAB308_1px,transparent_1px)] [background-size:20px_20px]"></div>

            {/* Viewport Box for html5-qrcode */}
            <div id={scannerId} className="w-full h-full max-w-sm max-h-80 overflow-hidden rounded-xl bg-slate-950 border border-white/5 z-10"></div>

            {/* Static Overlay when camera is off */}
            {!scanning && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-center p-6 z-20" id="camera-idle-overlay">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/20 flex items-center justify-center text-[#EAB308] mb-4 shadow-lg">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-white font-semibold font-sans text-base mb-1">Gate Camera Standby</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
                  Align Student QR Code here. Activate the camera feed to begin verification scans.
                </p>
                <button
                  onClick={startScanner}
                  className="px-6 py-2.5 bg-[#0B3C26] text-[#EAB308] font-bold text-xs rounded-lg shadow-md hover:bg-emerald-900 border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                  id="start-camera-button"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Activate Scanner Feed
                </button>
              </div>
            )}

            {/* Brackets around camera box */}
            <div className="absolute inset-8 pointer-events-none z-20">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#EAB308] rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#EAB308] rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#EAB308] rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#EAB308] rounded-br-lg"></div>
            </div>

            {/* Laser scanning line effect */}
            {scanning && (
              <div className="absolute left-6 right-6 h-1 bg-red-500 rounded-full shadow-[0_0_10px_#EF4444] z-20 animate-scanner-laser pointer-events-none"></div>
            )}
          </div>

          {/* Active Camera Actions */}
          {scanning && (
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-center" id="active-camera-controls">
              <button
                onClick={stopScanner}
                className="px-6 py-2 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white text-red-600 text-xs font-extrabold uppercase tracking-wide rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                Deactivate Feed
              </button>
            </div>
          )}

          {/* Error notice if webcam fails */}
          {cameraError && (
            <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* MANUAL VERIFICATION TOOL */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5" id="manual-lookup-card">
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Manual LRN Lookup</label>
            <form onSubmit={handleManualSearchSubmit} className="relative flex items-center w-full">
              <input
                type="text"
                maxLength={12}
                pattern="\d*"
                placeholder="Enter 12-digit LRN..."
                value={lrnInput}
                onChange={(e) => setLrnInput(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl py-3 px-4 pr-12 font-mono text-base focus:outline-hidden focus:ring-2 focus:ring-[#0B3C26] transition-all text-[#1A1A2E]"
                id="manual-lrn-input"
              />
              <button
                type="submit"
                disabled={lrnInput.length < 12}
                className="absolute right-2 p-2 bg-[#0B3C26] text-[#EAB308] hover:text-white disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-md hover:bg-emerald-950 transition-all cursor-pointer"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: SCAN RESULTS (SPANS ENTIRE REMAINING COLUMNS) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        <div className="flex flex-col h-fit">
          <AnimatePresence mode="wait">
            
            {/* Idle State */}
            {scannedResult.status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 flex flex-col items-center text-center justify-center min-h-[360px]"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 animate-pulse border border-dashed border-slate-200">
                  <ShieldCheck className="w-10 h-10 text-[#0B3C26]" />
                </div>
                <h4 className="font-sans font-bold text-[#0B3C26] text-base">Awaiting Verification Scan</h4>
                <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                  Point the camera at a student QR code badge, or perform a manual lookup to trigger instant validation.
                </p>
              </motion.div>
            )}

            {/* Verified Success State */}
            {scannedResult.status === "success" && scannedResult.student && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                className="w-full flex-1 bg-white rounded-3xl shadow-2xl border-l-8 border-emerald-500 flex flex-col overflow-hidden"
              >
                <div className="bg-emerald-500/5 px-8 py-5 flex items-center justify-between border-b border-emerald-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-emerald-600 tracking-tighter uppercase">VERIFIED STUDENT</h3>
                  </div>
                  <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded uppercase tracking-widest">
                    MATCH 100%
                  </span>
                </div>

                <div className="p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
                  
                  {/* Portrait */}
                  <div className="w-48 h-72 flex-none bg-[#F4F6F9] rounded-2xl border border-gray-200 overflow-hidden shadow-inner relative flex items-center justify-center">
                    <StudentAvatar
                      fullName={scannedResult.student.full_name}
                      lrn={scannedResult.student.lrn}
                      imageUrl={scannedResult.student.id_image_url}
                      size="xl"
                    />
                  </div>

                  {/* Student Details */}
                  <div className="flex-1 flex flex-col justify-center gap-5 w-full text-center md:text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Full Name</label>
                      <p className="text-2xl md:text-3xl font-black text-[#0B3C26] tracking-tight">{scannedResult.student.full_name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Grade & Section</label>
                        <p className="text-sm font-extrabold text-slate-700">
                          Grade {scannedResult.student.grade_level} - {scannedResult.student.section}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">LRN (Database ID)</label>
                        <p className="text-sm font-mono font-bold text-slate-700 tracking-wide">
                          {scannedResult.student.lrn}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1 text-left">
                      <label className="text-[10px] font-bold text-emerald-600/75 uppercase tracking-widest block">School Status</label>
                      <div className="flex items-center gap-2 text-emerald-700 font-bold">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
                        <span className="text-sm md:text-base uppercase tracking-wider">ENROLLED S.Y. 2026-2027</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="p-6 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs font-medium">
                  <div className="flex items-center gap-4 font-mono">
                    <span>ENTRY TIME: {new Date().toLocaleTimeString()}</span>
                    <span>|</span>
                    <span>DEVICE: Terminal_HQ</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (autoResumeTimeoutRef.current) clearTimeout(autoResumeTimeoutRef.current);
                        startScanner();
                      }}
                      className="px-4 py-2 bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      Scan Next ID
                    </button>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      CONNECTED TO SUPABASE CLOUD
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Not Found / Rejected State */}
            {scannedResult.status === "not_found" && (
              <motion.div
                key="not_found"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                className="w-full flex-1 bg-white rounded-3xl shadow-2xl border-l-8 border-red-500 flex flex-col overflow-hidden"
              >
                <div className="bg-red-500/5 px-8 py-5 flex items-center justify-between border-b border-red-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-red-600 tracking-tighter uppercase">ACCESS DENIED</h3>
                  </div>
                  <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded uppercase tracking-widest">
                    NO MATCH
                  </span>
                </div>

                <div className="p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
                  
                  {/* Empty avatar box for unregistered */}
                  <div className="w-48 h-72 flex-none bg-slate-100 rounded-2xl border border-red-100 overflow-hidden shadow-inner relative flex flex-col items-center justify-center text-red-400">
                    <AlertTriangle className="w-16 h-16 animate-bounce" />
                    <span className="text-[10px] font-bold font-mono tracking-wider mt-3">UNKNOWN ID</span>
                  </div>

                  {/* Reject Details */}
                  <div className="flex-1 flex flex-col justify-center gap-4 w-full text-center md:text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Status Notice</label>
                      <p className="text-xl md:text-2xl font-extrabold text-red-600 tracking-tight">
                        {scannedResult.message?.includes("Plain") || scannedResult.message?.includes("signature") ? "Security Denied" : "Unregistered Student"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Scanned QR Payload / LRN</label>
                      <p className="text-2xl font-mono font-bold text-slate-800 tracking-wider">
                        {scannedResult.lrnAttempted}
                      </p>
                    </div>

                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-1 text-left">
                      <label className="text-[10px] font-bold text-red-600/75 uppercase tracking-widest block">System Warning</label>
                      <p className="text-xs text-red-800 leading-relaxed">
                        {scannedResult.message || "This credential does not match any student record in the official Taguig Science High School enrollment registry. Entry is strictly denied."}
                      </p>
                    </div>
                  </div>

                </div>

                <div className="p-6 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs font-medium">
                  <div className="flex items-center gap-4 font-mono">
                    <span>REJECT TIME: {new Date().toLocaleTimeString()}</span>
                    <span>|</span>
                    <span>SECURITY COHORT: Gate_1</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (autoResumeTimeoutRef.current) clearTimeout(autoResumeTimeoutRef.current);
                        startScanner();
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      Scan Next ID
                    </button>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-red-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      VERIFICATION REJECTED
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};
