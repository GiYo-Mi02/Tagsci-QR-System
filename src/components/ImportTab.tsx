import React, { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Trash2, ArrowRight, Table } from "lucide-react";
import { Student } from "../types";
import { importStudents, uploadIdImage } from "../lib/studentService";

export const ImportTab: React.FC<{ onImportSuccess?: () => void }> = ({ onImportSuccess }) => {
  const [fileData, setFileData] = useState<Omit<Student, "id" | "imported_at">[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"csv" | "json" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{
    stage: "idle" | "parsing" | "loaded" | "success" | "error";
    message?: string;
  }>({ stage: "idle" });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop State
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMsg(null);
    setImportStatus({ stage: "idle" });

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const ext = firstFile.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "json") {
        processFile(firstFile);
      } else if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
        // Drop multiple image files
        const imgs = (Array.from(files) as File[]).filter((f) =>
          ["jpg", "jpeg", "png", "webp"].includes(f.name.split(".").pop()?.toLowerCase() || "")
        );
        setImageFiles(prev => [...prev, ...imgs]);
      } else {
        setErrorMsg("Unsupported file format dropped.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setImportStatus({ stage: "idle" });
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Core file parsing
  const processFile = (file: File) => {
    setFileName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      setFileType("csv");
      parseCSV(file);
    } else if (extension === "json") {
      setFileType("json");
      parseJSON(file);
    } else {
      setErrorMsg("Please upload either a .csv or .json roster file.");
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setErrorMsg("Could not read file contents.");
        return;
      }

      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) {
        setErrorMsg("The CSV file seems to be empty or contains no headers.");
        return;
      }

      // Read Headers
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const lrnIndex = headers.indexOf("lrn");
      const nameIndex = headers.indexOf("full_name");
      const gradeIndex = headers.indexOf("grade_level");
      const sectionIndex = headers.indexOf("section");
      const imageIndex = headers.indexOf("id_image_url");

      if (lrnIndex === -1 || nameIndex === -1) {
        setErrorMsg("CSV must contain at least 'lrn' and 'full_name' column headers.");
        return;
      }

      const parsedStudents: Omit<Student, "id" | "imported_at">[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Custom parser to handle possible quoted commas in names
        const columns: string[] = [];
        let inQuotes = false;
        let currentField = "";
        
        for (let charIdx = 0; charIdx < line.length; charIdx++) {
          const char = line[charIdx];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            columns.push(currentField.trim());
            currentField = "";
          } else {
            currentField += char;
          }
        }
        columns.push(currentField.trim());

        const lrn = columns[lrnIndex]?.replace(/['"]/g, "").trim() || "";
        const name = columns[nameIndex]?.replace(/['"]/g, "").trim() || "";

        if (lrn && name) {
          parsedStudents.push({
            lrn: lrn,
            full_name: name,
            grade_level: gradeIndex !== -1 ? columns[gradeIndex] || "10" : "10",
            section: sectionIndex !== -1 ? columns[sectionIndex] || "Einstein" : "Einstein",
            id_image_url: imageIndex !== -1 ? columns[imageIndex] || "" : ""
          });
        }
      }

      if (parsedStudents.length === 0) {
        setErrorMsg("No valid student records could be parsed from the CSV.");
      } else {
        setFileData(parsedStudents);
        setImportStatus({ stage: "loaded" });
      }
    };
    reader.readAsText(file);
  };

  const parseJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setErrorMsg("Could not read file contents.");
        return;
      }

      try {
        const obj = JSON.parse(text);
        const list = Array.isArray(obj) ? obj : [obj];
        const validated: Omit<Student, "id" | "imported_at">[] = [];

        list.forEach((item: any) => {
          if (item.lrn && (item.full_name || item.fullName)) {
            validated.push({
              lrn: String(item.lrn).trim(),
              full_name: String(item.full_name || item.fullName).trim(),
              grade_level: String(item.grade_level || item.gradeLevel || "10"),
              section: String(item.section || "Einstein"),
              id_image_url: String(item.id_image_url || item.imageUrl || "")
            });
          }
        });

        if (validated.length === 0) {
          setErrorMsg("No valid student objects found in JSON. Ensure 'lrn' and 'full_name' exist.");
        } else {
          setFileData(validated);
          setImportStatus({ stage: "loaded" });
        }
      } catch (e) {
        setErrorMsg("Invalid JSON syntax. Ensure file is correctly formatted.");
      }
    };
    reader.readAsText(file);
  };

  // Committing records to Database
  const handleImportSubmit = async () => {
    if (fileData.length === 0) return;
    setImportStatus({ stage: "parsing", message: "Uploading matched student ID images..." });

    try {
      // Map matching image files to their LRN values
      const imageMap = new Map<string, File>();
      imageFiles.forEach((file) => {
        const nameWithoutExt = file.name.split(".").slice(0, -1).join(".").trim();
        imageMap.set(nameWithoutExt, file);
      });

      const finalData = [...fileData];
      const totalToUpload = finalData.filter((s) => imageMap.has(s.lrn)).length;
      let uploadCount = 0;

      // 1. Upload ID images asynchronously if files are provided
      for (let i = 0; i < finalData.length; i++) {
        const student = finalData[i];
        if (imageMap.has(student.lrn)) {
          uploadCount++;
          setImportStatus({
            stage: "parsing",
            message: `Uploading student images (${uploadCount}/${totalToUpload})...`
          });
          const file = imageMap.get(student.lrn)!;
          const publicUrl = await uploadIdImage(student.lrn, file);
          if (publicUrl) {
            student.id_image_url = publicUrl;
          }
        }
      }

      setImportStatus({ stage: "parsing", message: "Upserting student records to Supabase..." });

      // 2. Perform bulk upsert database operation
      const result = await importStudents(finalData);
      if (result.success) {
        setImportStatus({
          stage: "success",
          message: `Successfully processed ${result.total} student profiles! Added/Updated: ${result.added}.`
        });
        setFileData([]);
        setImageFiles([]);
        setFileName(null);
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        setImportStatus({
          stage: "error",
          message: "Failed to upload records to the registry. Please check database connection and storage credentials."
        });
      }
    } catch (err: any) {
      console.error(err);
      setImportStatus({
        stage: "error",
        message: err.message || "An unexpected error occurred during database ingestion."
      });
    }
  };

  const clearSelectedFile = () => {
    setFileData([]);
    setFileName(null);
    setFileType(null);
    setErrorMsg(null);
    setImportStatus({ stage: "idle" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" id="import-view-root">
      
      {/* CARD 1: EXPLANATORY PREAMBLE */}
      <div className="bg-white rounded-2xl shadow-md border border-[#0B3C26]/10 p-6 mb-8">
        <h2 className="font-sans font-bold text-xl text-[#0B3C26] flex items-center gap-2">
          <span>📥 TSHS Registry Ingestion Engine</span>
        </h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Load standard roster files exported directly from the **Taguig Science High School ID Automation System**.
          Supported formats are comma-separated values (`.csv`) or raw objects list (`.json`). The registry will index
          each student by their unique 12-digit Learner Reference Number (LRN) for high-speed gate verification.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* FILE DRAG ZONE */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white rounded-2xl shadow-xl border-2 border-dashed p-8 text-center transition-all flex flex-col items-center justify-center min-h-[240px] cursor-pointer ${
            isDragOver
              ? "border-[#EAB308] bg-amber-50/20 scale-[0.99]"
              : "border-slate-200 hover:border-[#0B3C26]/40"
          }`}
          onClick={() => fileInputRef.current?.click()}
          id="drag-drop-zone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.json"
            className="hidden"
          />
          
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-7 h-7 text-[#0B3C26]" />
          </div>

          <h3 className="text-sm font-sans font-bold text-[#0B3C26] mb-1">
            Drag & Drop Student Roster File here
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            or click to browse your local machine for .csv or .json
          </p>
          
          <div className="flex gap-2 flex-wrap justify-center">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              REQUIRED: lrn (12 digits)
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              REQUIRED: full_name
            </span>
          </div>
        </div>

        {/* DEDICATED ID IMAGES IMPORT ZONE */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-[#0B3C26] flex items-center gap-1.5">
              <span>🖼️ Link Student ID Images</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Strict Filename Contract</span>
          </div>
          
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Upload local image files matching the student LRN. Image filenames must be named exactly as the 12-digit student LRN (e.g. <code>123456789012.jpg</code> or <code>987654321098.png</code>).
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="px-4 py-2 bg-[#0B3C26] text-[#EAB308] hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Select Image Files ({imageFiles.length} selected)
            </button>
            {imageFiles.length > 0 && (
              <button
                type="button"
                onClick={() => setImageFiles([])}
                className="text-xs text-red-500 font-bold hover:underline cursor-pointer"
              >
                Clear Selected Images
              </button>
            )}
            <input
              type="file"
              ref={imageInputRef}
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  setImageFiles(Array.from(files));
                }
              }}
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          {/* Ingestion Match Feedback */}
          {fileData.length > 0 && imageFiles.length > 0 && (() => {
            const imageMap = new Map<string, File>();
            imageFiles.forEach((file) => {
              const nameWithoutExt = file.name.split(".").slice(0, -1).join(".").trim();
              imageMap.set(nameWithoutExt, file);
            });
            const matchedCount = fileData.filter((s) => imageMap.has(s.lrn)).length;
            const unmatchedImages = imageFiles.filter((file) => {
              const nameWithoutExt = file.name.split(".").slice(0, -1).join(".").trim();
              return !fileData.some((s) => s.lrn === nameWithoutExt);
            });

            return (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Table className="w-4 h-4 text-emerald-600" />
                  <span>Ingestion Match Alignment:</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-1 font-mono text-[11px]">
                  <div>
                    Matched Images: <strong className="text-emerald-700">{matchedCount} students</strong>
                  </div>
                  <div>
                    Roster Total: <strong className="text-[#0B3C26]">{fileData.length} records</strong>
                  </div>
                </div>
                {unmatchedImages.length > 0 && (
                  <div className="text-[10px] text-amber-600 mt-1 leading-normal">
                    ⚠️ {unmatchedImages.length} images have no matching LRN record in this roster and will be skipped.
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* PARSED FILE PREVIEW PORTAL */}
        {fileData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-slide-up" id="import-preview-card">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  Parsed Roster Preview
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">File: {fileName} ({fileType?.toUpperCase()})</p>
              </div>
              <button
                onClick={clearSelectedFile}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                title="Discard file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 uppercase font-mono border-b border-slate-200">
                    <th className="px-4 py-2.5">LRN (12 Digits)</th>
                    <th className="px-4 py-2.5">Full Name</th>
                    <th className="px-4 py-2.5">Grade</th>
                    <th className="px-4 py-2.5">Section</th>
                  </tr>
                </thead>
                <tbody>
                  {fileData.slice(0, 5).map((student, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 font-mono text-slate-700">
                      <td className="px-4 py-3 font-bold text-[#0B3C26]">{student.lrn}</td>
                      <td className="px-4 py-3 font-sans font-medium">{student.full_name}</td>
                      <td className="px-4 py-3">Grade {student.grade_level}</td>
                      <td className="px-4 py-3">{student.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Big Import Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleImportSubmit}
                disabled={importStatus.stage === "parsing"}
                className="px-6 py-2.5 bg-[#EAB308] hover:bg-amber-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-[#0B3C26] font-extrabold text-sm rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                id="commit-import-button"
              >
                {importStatus.stage === "parsing" ? importStatus.message || "Uploading..." : "🚀 Import All Students to Registry"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STATUS NOTIFICATIONS */}
        {importStatus.stage === "success" && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg flex gap-3 shadow-sm animate-fade-in" id="import-success-banner">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-emerald-800">Ingestion Succeeded</p>
              <p className="text-xs text-emerald-700 mt-1 leading-relaxed">{importStatus.message}</p>
            </div>
          </div>
        )}

        {importStatus.stage === "error" && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex gap-3 shadow-sm" id="import-error-banner">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-800">Ingestion Failure</p>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">{importStatus.message}</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex gap-3 shadow-sm" id="import-error-warning">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Parsing Error</p>
              <p className="text-xs text-amber-700 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
