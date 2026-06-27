import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Supabase Client for backend lookups
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseKey) {
  console.warn("Warning: Supabase credentials missing in backend environment.");
}
const supabase = createClient(supabaseUrl, supabaseKey);

const QR_SECRET_KEY = process.env.QR_SECRET_KEY || "tshs_secure_gate_qr_token_secret_2026";

// API Routes
// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Securely sign a QR token (UUID) using backend HMAC key
app.get("/api/sign-qr", (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ error: "Missing token parameter." });
  }

  const signature = crypto
    .createHmac("sha256", QR_SECRET_KEY)
    .update(token)
    .digest("hex");

  res.json({ payload: `${token}.${signature}` });
});

// Securely verify a signed QR code payload and return the student record
app.get("/api/verify-qr", async (req, res) => {
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
      return res.json({ success: true, student: data });
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
});

// Vite Middleware for development and production hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TSHS QR Verification System server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
