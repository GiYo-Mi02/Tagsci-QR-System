import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const QR_SECRET_KEY = process.env.QR_SECRET_KEY || "tshs_secure_gate_qr_token_secret_2026";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ error: "Missing token parameter." });
  }

  const signature = crypto
    .createHmac("sha256", QR_SECRET_KEY)
    .update(token)
    .digest("hex");

  return res.status(200).json({ payload: `${token}.${signature}` });
}
