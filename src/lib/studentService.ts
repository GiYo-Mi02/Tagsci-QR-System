import { supabase } from "./supabase";
import type { Student } from "../types";

// Get all student records
export async function getStudents(): Promise<Student[]> {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) throw error;
    return (data as Student[]) || [];
  } catch (err) {
    console.error("Supabase getStudents error:", err);
    return [];
  }
}

// Find single student by LRN (QR code payload or manual entry)
export async function getStudentByLrn(lrn: string): Promise<{ found: boolean; student?: Student; message?: string }> {
  const cleanLrn = lrn.trim();
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("lrn", cleanLrn)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return { found: true, student: data as Student };
    } else {
      return { found: false, message: `Student with LRN ${cleanLrn} not found.` };
    }
  } catch (err: any) {
    console.error("Supabase getStudentByLrn error:", err);
    return { found: false, message: err.message || "Database connection error." };
  }
}

// Find single student by signed QR payload via Express secure API gateway
export async function getStudentByQrPayload(payload: string): Promise<{ found: boolean; student?: Student; message?: string }> {
  const cleanPayload = payload.trim();
  try {
    const res = await fetch(`/api/verify-qr?payload=${encodeURIComponent(cleanPayload)}`);
    const data = await res.json();
    
    if (res.ok && data.success) {
      return { found: true, student: data.student };
    } else {
      return { found: false, message: data.message || "Failed to verify student QR token." };
    }
  } catch (err: any) {
    console.error("getStudentByQrPayload error:", err);
    return { found: false, message: err.message || "Express server connection error." };
  }
}

// Import/upsert bulk student roster
export async function importStudents(studentList: Omit<Student, "id" | "imported_at">[]): Promise<{ success: boolean; added: number; updated: number; total: number }> {
  try {
    const formatted = studentList.map((s) => ({
      lrn: String(s.lrn || "").trim(),
      full_name: String(s.full_name || "").trim(),
      grade_level: String(s.grade_level || "10").trim(),
      section: String(s.section || "Einstein").trim(),
      id_image_url: String(s.id_image_url || "").trim()
    }));

    const { data, error } = await supabase
      .from("students")
      .upsert(formatted, { onConflict: "lrn" })
      .select();

    if (error) throw error;
    return {
      success: true,
      added: data ? data.length : studentList.length,
      updated: 0,
      total: data ? data.length : studentList.length
    };
  } catch (err) {
    console.error("Supabase importStudents error:", err);
    return { success: false, added: 0, updated: 0, total: 0 };
  }
}

// Add/upsert a single student record
export async function addStudent(student: Omit<Student, "id">): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("students")
      .upsert({
        lrn: String(student.lrn || "").trim(),
        full_name: String(student.full_name || "").trim(),
        grade_level: String(student.grade_level || "10").trim(),
        section: String(student.section || "Einstein").trim(),
        id_image_url: String(student.id_image_url || "").trim()
      }, { onConflict: "lrn" });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Supabase addStudent error:", err);
    return false;
  }
}

// Delete student record by ID or fallback LRN
export async function deleteStudent(id: string, lrn: string): Promise<boolean> {
  try {
    // Delete by UUID first
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (!error) return true;

    // Fallback to LRN if id wasn't matched
    const { error: error2 } = await supabase
      .from("students")
      .delete()
      .eq("lrn", lrn);

    if (error2) throw error2;
    return true;
  } catch (err) {
    console.error("Supabase deleteStudent error:", err);
    return false;
  }
}

// Helper to calculate SHA-1 hash for Cloudinary signature
async function sha1(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Upload ID front image to Cloudinary Storage using signed signature API
export async function uploadIdImage(lrn: string, file: File): Promise<string | null> {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary configuration credentials in .env");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const publicId = lrn.trim();
    const folder = "student-ids";

    // Alphabetical sort of signed parameters
    const signatureStr = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1(signatureStr);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("public_id", publicId);
    formData.append("folder", folder);
    formData.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cloudinary upload failed: ${errText}`);
    }

    const json = await res.json();
    return json.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return null;
  }
}

// Fetch system settings: Legacy QR mode
export async function getLegacyQrMode(): Promise<{ legacyMode: boolean; notInitialized: boolean }> {
  try {
    const res = await fetch("/api/settings/legacy-mode");
    if (!res.ok) throw new Error("Failed to fetch legacy mode setting");
    const data = await res.json();
    return {
      legacyMode: data.legacyMode === true,
      notInitialized: data.notInitialized === true
    };
  } catch (err) {
    console.error("getLegacyQrMode error:", err);
    return { legacyMode: false, notInitialized: false };
  }
}

// Update system settings: Legacy QR mode (Requires admin password)
export async function setLegacyQrMode(enabled: boolean, adminPassword?: string): Promise<{ success: boolean; error?: string; notInitialized?: boolean }> {
  try {
    const res = await fetch("/api/settings/legacy-mode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": adminPassword || ""
      },
      body: JSON.stringify({ legacyMode: enabled })
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to update legacy mode setting",
        notInitialized: data.notInitialized === true
      };
    }
    return { success: true };
  } catch (err: any) {
    console.error("setLegacyQrMode error:", err);
    return { success: false, error: err.message || "Network connection error." };
  }
}
