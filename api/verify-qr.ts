import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const QR_SECRET_KEY = process.env.QR_SECRET_KEY || "tshs_secure_gate_qr_token_secret_2026";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.query.payload as string;
  if (!payload) {
    return res.status(400).json({ success: false, message: "Missing payload parameter." });
  }

  const parts = payload.split(".");
  if (parts.length !== 2) {
    return res.status(400).json({ success: false, message: "Invalid QR code format." });
  }

  const [token, signature] = parts;

  // Validate token shape (UUID) to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return res.status(400).json({ success: false, message: "Invalid QR token identifier." });
  }

  // Generate signature to compare
  const expectedSignature = crypto
    .createHmac("sha256", QR_SECRET_KEY)
    .update(token)
    .digest("hex");

  // Constant-time comparison
  let isSignatureValid = false;
  try {
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length === actualBuf.length) {
      isSignatureValid = crypto.timingSafeEqual(expectedBuf, actualBuf);
    }
  } catch (e) {
    isSignatureValid = false;
  }

  if (!isSignatureValid) {
    return res.status(403).json({
      success: false,
      message: "Access Denied: QR signature verification failed. Forged or corrupted ID card."
    });
  }

  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("qr_token", token)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return res.status(200).json({ success: true, student: data });
    } else {
      return res.status(404).json({
        success: false,
        message: "Access Denied: Student profile mismatch. The card token is authentic but the record was not found."
      });
    }
  } catch (err: any) {
    console.error("Database lookup error during QR verification:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error connecting to student registry database."
    });
  }
}
