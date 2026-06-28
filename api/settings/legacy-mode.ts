import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "legacy_qr_mode")
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST205") {
          return res.status(200).json({ legacyMode: false, notInitialized: true });
        }
        throw error;
      }
      const legacyMode = data ? data.value === "true" : false;
      return res.status(200).json({ legacyMode, notInitialized: false });
    } catch (err: any) {
      console.error("Error fetching legacy mode settings:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch setting" });
    }
  } else if (req.method === "POST") {
    const adminPassword = req.headers["x-admin-password"] || req.body.adminPassword;
    if (adminPassword !== "Kolokoy0206!") {
      return res.status(403).json({ error: "Access Denied: Only authenticated administrators can manipulate settings." });
    }

    const { legacyMode } = req.body;
    if (typeof legacyMode !== "boolean") {
      return res.status(400).json({ error: "Invalid payload: legacyMode must be a boolean." });
    }

    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: "legacy_qr_mode", value: String(legacyMode) });

      if (error) {
        if (error.code === "PGRST205") {
          return res.status(400).json({ error: "Settings table not initialized in database. Run SQL setup script first.", notInitialized: true });
        }
        throw error;
      }
      return res.status(200).json({ success: true, legacyMode });
    } catch (err: any) {
      console.error("Error updating legacy mode setting:", err);
      return res.status(500).json({ error: err.message || "Failed to update setting" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
