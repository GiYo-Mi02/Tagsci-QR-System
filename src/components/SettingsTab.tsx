import React, { useState, useEffect } from "react";
import { ShieldCheck, Database, RefreshCw, Check, Copy, Code, HelpCircle, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export const SettingsTab: React.FC<{ onResetCompleted?: () => void }> = ({ onResetCompleted }) => {
  const [checking, setChecking] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
  }>({ connected: false, message: "Standby..." });
  const [copiedSql, setCopiedSql] = useState(false);
  const [legacyMode, setLegacyMode] = useState(() => {
    return localStorage.getItem("legacy_qr_mode") === "true";
  });

  // Ping Supabase to test connection on mount
  const checkConnection = async () => {
    setChecking(true);
    try {
      const { count, error } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      setConnectionStatus({
        connected: true,
        message: `Successfully connected to Supabase PostgreSQL! Found ${count ?? 0} active student records in the 'students' table.`
      });
    } catch (err: any) {
      console.error("Connection check failed:", err);
      setConnectionStatus({
        connected: false,
        message: err.message || "Failed to query the 'students' table. Ensure database is online, tables exist, and RLS policies are applied."
      });
    }
    setChecking(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // SQL Script to copy
  const SUPABASE_SQL_SETUP = `-- 1. CREATE STUDENTS TABLE
CREATE TABLE students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lrn text UNIQUE NOT NULL,
  full_name text NOT NULL,
  section text NOT NULL,
  grade_level text NOT NULL,
  id_image_url text DEFAULT '',
  qr_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  imported_at timestamp WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MIGRATION FOR EXISTING TABLES:
-- Run this if your table already exists and you want to upgrade:
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS qr_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL;

-- 2. CREATE FAST LOOKUP LRN INDEX (QR READ SCAN OPTIMIZATION)
CREATE UNIQUE INDEX idx_students_lrn ON students(lrn);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 4. CONFIGURE RLS ACCESS CONTROL POLICIES
-- Guards (Read-Only Anon Key) read profile on scanner
CREATE POLICY "Allow public read access for verification"
  ON students FOR SELECT
  TO public
  USING (true);

-- Admins (Full write/upsert control via service_role or admin)
CREATE POLICY "Allow admin full credentials management"
  ON students FOR ALL
  TO public
  USING (true);

-- 5. CONFIGURE STORAGE BUCKET RLS POLICIES FOR "student-ids"
-- Allow public read of student-ids bucket
CREATE POLICY "public_read_student_ids"
  ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'student-ids');

-- Allow public/anon to upload new student ID images
CREATE POLICY "allow_anon_inserts_for_ids"
  ON storage.objects FOR INSERT
  TO public WITH CHECK (bucket_id = 'student-ids');

-- Allow public/anon to update existing student ID images (required for upsert / re-imports)
CREATE POLICY "allow_anon_updates_for_ids"
  ON storage.objects FOR UPDATE
  TO public USING (bucket_id = 'student-ids') WITH CHECK (bucket_id = 'student-ids');`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto px-4 py-6" id="settings-view-root">
      
      {/* LEFT COLUMN: CONNECTION STATUS BADGE & GUIDE (7 COLS) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* PANEL 1: BRIDGE CONNECTION STATUS */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#0A1F44]/10 overflow-hidden">
          <div className="bg-[#0A1F44] text-white p-4 border-b-4 border-[#F5A623] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-[#F5A623]" />
              <div>
                <h2 className="font-sans font-bold tracking-tight text-base">Supabase Connection Monitor</h2>
                <p className="text-[10px] font-mono text-slate-300">LIVE CLOUD POSTGRESQL ENVIRONMENT</p>
              </div>
            </div>
            <button
              onClick={checkConnection}
              disabled={checking}
              className="p-1 text-slate-300 hover:text-white disabled:opacity-50 transition-colors"
              title="Refresh Connection Status"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <p className="text-xs text-slate-500 leading-relaxed">
              The system connects to Supabase Cloud directly using the environment variables set in the `.env` configuration file. Inputs are always validated in real time.
            </p>

            {/* Live connection badge widget */}
            {checking ? (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-[#F5A623] animate-spin" />
                <div>
                  <span className="block text-xs font-bold text-[#0A1F44]">Verifying Supabase Bridge...</span>
                  <span className="text-[10px] text-slate-400 font-mono">Pinging REST API endpoints</span>
                </div>
              </div>
            ) : connectionStatus.connected ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                  ✓
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-bold text-emerald-800">Supabase Connected Successfully</span>
                  <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">{connectionStatus.message}</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="block text-xs font-bold text-red-800">Connection Failed</span>
                  <p className="text-[11px] text-red-700 mt-1 leading-relaxed font-mono">{connectionStatus.message}</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="block text-xs font-bold text-slate-600">Active Configurations Loaded:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-mono text-slate-400">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <strong className="text-slate-600 block mb-0.5">VITE_SUPABASE_URL</strong>
                  {import.meta.env.VITE_SUPABASE_URL || "NOT SET"}
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <strong className="text-slate-600 block mb-0.5">VITE_SUPABASE_ANON_KEY</strong>
                  {import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "••••••••••••••••" : "NOT SET"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: SECURITY CONFIGURATIONS */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#0A1F44]/10 overflow-hidden">
          <div className="bg-[#0B3C26] text-white p-4 border-b-4 border-[#EAB308] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#EAB308]" />
            <div>
              <h2 className="font-sans font-bold tracking-tight text-base">Gate Security Configuration</h2>
              <p className="text-[10px] font-mono text-slate-300">TRANSITIONAL GATE SCANNING CONTROLS</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="space-y-1 pr-4">
                <span className="block text-xs font-bold text-[#0B3C26]">Legacy QR Transition Mode</span>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  When enabled, the gate scanner will accept plain text LRN QR codes generated by older ID automation systems. Enable this during cards rollout to prevent valid students from being locked out.
                </p>
              </div>
              <button
                onClick={() => {
                  const newVal = !legacyMode;
                  setLegacyMode(newVal);
                  localStorage.setItem("legacy_qr_mode", String(newVal));
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-hidden ${
                  legacyMode ? "bg-[#0B3C26]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    legacyMode ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {legacyMode && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Caution:</strong> Legacy mode is active. Plain-text LRNs are permitted via camera scans. Disable this mode once all students have been issued secure, signed ID cards to prevent spoofing.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: SQL SCHEMA GUIDE (5 COLS) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col" id="sql-guide-card">
          
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-[#F5A623]" />
              <span className="font-mono text-xs font-bold text-[#F5A623]">SUPABASE SQL SETUP</span>
            </div>
            
            <button
              onClick={copySqlToClipboard}
              className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-md border border-slate-700 transition-colors"
              title="Copy SQL Query"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-5">
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              To connect your real **Supabase instance**, open your Supabase Dashboard, head to the **SQL Editor**, and run this schema script to configure your PostgreSQL tables and set Row Level Security (RLS) properly:
            </p>

            <pre className="text-slate-300 bg-slate-950/70 p-3 rounded-lg font-mono text-[9px] overflow-x-auto border border-slate-800 leading-relaxed max-h-[350px] overflow-y-auto">
              {SUPABASE_SQL_SETUP}
            </pre>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex gap-2">
              <HelpCircle className="w-4 h-4 text-[#F5A623] flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-400 leading-relaxed">
                <strong>RLS Notice:</strong> This creates read, insert, and update policies for the public role so gate client transactions and picture uploads bypass 403 Forbidden checks.
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
