import React, { useState, useEffect } from "react";
import { Search, UserPlus, Users, Trash2, Shield, Eye, X, Download, Printer, Plus, AlertCircle } from "lucide-react";
import { Student } from "../types";
import { getStudents, deleteStudent, addStudent, uploadIdImage } from "../lib/studentService";
import { StudentAvatar } from "./StudentAvatar";

export const StudentsTab: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Form states for manual registration
  const [showAddForm, setShowAddForm] = useState(false);
  const [lrn, setLrn] = useState("");
  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("10");
  const [section, setSection] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [registering, setRegistering] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [viewingStudentQrPayload, setViewingStudentQrPayload] = useState<string | null>(null);

  // Fetch signed QR code when a student card is viewed
  useEffect(() => {
    if (viewingStudent && (viewingStudent.qr_token || viewingStudent.id)) {
      setViewingStudentQrPayload(null);
      const token = viewingStudent.qr_token || viewingStudent.id;
      fetch(`/api/sign-qr?token=${token}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to sign token");
          return res.json();
        })
        .then((data) => {
          if (data.payload) {
            setViewingStudentQrPayload(data.payload);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch signed QR:", err);
          setViewingStudentQrPayload(null);
        });
    } else {
      setViewingStudentQrPayload(null);
    }
  }, [viewingStudent]);

  // Modal delete confirmation states
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getStudents();
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (lrn.length !== 12) {
      setFormError("LRN must be exactly 12 numeric digits.");
      return;
    }
    if (!fullName.trim()) {
      setFormError("Full Name is required.");
      return;
    }
    if (!section.trim()) {
      setFormError("Section is required (e.g., Einstein, Newton).");
      return;
    }

    setRegistering(true);

    let finalImageUrl = "";
    if (imageFile) {
      const uploadedUrl = await uploadIdImage(lrn.trim(), imageFile);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        setFormError("Failed to upload photo to Cloudinary. Please check database connection and storage credentials.");
        setRegistering(false);
        return;
      }
    }

    const newStudent = {
      lrn: lrn.trim(),
      full_name: fullName.trim(),
      grade_level: gradeLevel,
      section: section.trim(),
      id_image_url: finalImageUrl || undefined
    };

    const success = await addStudent(newStudent);
    setRegistering(false);
    if (success) {
      setFormSuccess(true);
      setLrn("");
      setFullName("");
      setSection("");
      setImageFile(null);
      const fileInput = document.getElementById("student-image-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      setTimeout(() => setFormSuccess(false), 3000);
      loadData();
    } else {
      setFormError("Failed to add student. LRN might already exist in registry.");
    }
  };

  const confirmDelete = async () => {
    if (!deletingStudent) return;
    const success = await deleteStudent(deletingStudent.id, deletingStudent.lrn);
    if (success) {
      setDeletingStudent(null);
      setDeleteError(null);
      loadData();
    } else {
      setDeleteError("Failed to remove student from registry.");
    }
  };

  // Filter student list
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lrn.includes(searchQuery);
    const matchesGrade = gradeFilter === "all" || s.grade_level === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" id="students-view-root">
      
      {/* HEADER SECTION WITH REGISTER MANUALLY TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-[#0B3C26] uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#EAB308]" />
            Student Records Directory
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Search, filter, enroll, and print official entry security credentials.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all shadow-sm cursor-pointer ${
              showAddForm
                ? "bg-slate-100 text-slate-600 border border-slate-200"
                : "bg-[#0B3C26] hover:bg-[#0B3C26]/90 text-[#EAB308] border border-[#0B3C26]"
            }`}
            id="toggle-add-form-btn"
          >
            <UserPlus className="w-4 h-4" />
            {showAddForm ? "Hide Enroll Panel" : "Register Student"}
          </button>
        )}
      </div>

      {/* MANUAL STUDENT REGISTRATION FORM */}
      {isAdmin && showAddForm && (
        <div className="bg-white rounded-2xl shadow-xl border border-[#0B3C26]/10 p-6 mb-8 animate-slide-up" id="manual-form-card">
          <div className="border-b border-slate-100 pb-3 mb-5 flex items-center justify-between">
            <h3 className="font-sans font-bold text-sm text-[#0B3C26] uppercase tracking-wide flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#EAB308]" />
              New Student Security Registration
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Taguig Registry</span>
          </div>

          <form onSubmit={handleManualAddSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* LRN */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">12-Digit LRN *</label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="e.g. 102938475612"
                value={lrn}
                onChange={(e) => setLrn(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 py-2 border border-slate-200 focus:border-[#0B3C26] focus:outline-hidden rounded-lg font-mono text-sm"
              />
            </div>

            {/* FULL NAME */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Juan dela Cruz Jr."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 focus:border-[#0B3C26] focus:outline-hidden rounded-lg text-sm"
              />
            </div>

            {/* GRADE LEVEL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Grade Level *</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 focus:border-[#0B3C26] focus:outline-hidden rounded-lg text-sm bg-white"
              >
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>

            {/* SECTION */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Section *</label>
              <input
                type="text"
                required
                placeholder="e.g. Einstein"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 focus:border-[#0B3C26] focus:outline-hidden rounded-lg text-sm"
              />
            </div>

            {/* CUSTOM IMAGE FILE SELECTOR */}
            <div className="md:col-span-9">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Custom ID Photo (Optional)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="student-image-file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setImageFile(files[0]);
                    } else {
                      setImageFile(null);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0B3C26] file:text-[#EAB308] hover:file:bg-slate-800 file:cursor-pointer border border-slate-200 rounded-lg p-1 focus:border-[#0B3C26] focus:outline-hidden"
                />
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      const fileInput = document.getElementById("student-image-file") as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                    className="text-xs text-red-500 font-bold hover:underline cursor-pointer flex-shrink-0"
                  >
                    Clear Photo
                  </button>
                )}
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={registering}
                className="w-full py-2.5 bg-[#EAB308] hover:bg-amber-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-[#0B3C26] font-extrabold text-xs rounded-lg shadow-sm hover:shadow-md transition-all uppercase tracking-wider"
              >
                {registering ? "Uploading..." : "Register & Commit"}
              </button>
            </div>
          </form>

          {/* Messages */}
          {formError && (
            <div className="mt-4 bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="mt-4 bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg flex items-center gap-2 text-xs">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Student successfully registered on Gate database!</span>
            </div>
          )}
        </div>
      )}

      {/* FILTER AND SEARCH BAR */}
      <div className="bg-white rounded-2xl shadow-md border border-[#0B3C26]/10 p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center" id="search-filter-controls">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search records by name or 12-digit LRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-[#0B3C26] focus:outline-hidden rounded-lg text-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Grade Filter Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Grade:</span>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-1.5 border border-slate-200 focus:border-[#0B3C26] focus:outline-hidden rounded-lg text-xs bg-white font-medium"
          >
            <option value="all">All Grades (7-12)</option>
            <option value="7">Grade 7</option>
            <option value="8">Grade 8</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
          </select>
        </div>
      </div>

      {/* DIRECTORY LISTING TABLE */}
      <div className="bg-white rounded-2xl shadow-xl border border-[#0B3C26]/10 overflow-hidden" id="directory-table-card">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-[#0B3C26] border-t-[#EAB308] rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-400 font-mono">Querying Active Roster database...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4 border border-dashed border-slate-300">
              <Shield className="w-8 h-8" />
            </div>
            <h4 className="text-[#0B3C26] font-bold text-sm">No Student Records Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              We couldn't find any students matching "{searchQuery}" under the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-[#0B3C26] text-white border-b-2 border-[#EAB308] uppercase font-sans tracking-wider text-[10px] font-bold select-none">
                  <th className="px-5 py-3">Photo Preview</th>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3">LRN (Unique Key)</th>
                  <th className="px-5 py-3">Grade & Section</th>
                  <th className="px-5 py-3 text-center">Security Credentials</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 hover:bg-[#0B3C26]/5 transition-colors text-[#1A1A2E]"
                  >
                    {/* Portrait */}
                    <td className="px-5 py-2.5">
                      <StudentAvatar
                        fullName={student.full_name}
                        lrn={student.lrn}
                        imageUrl={student.id_image_url}
                        size="sm"
                      />
                    </td>
                    
                    {/* Name */}
                    <td className="px-5 py-3 font-sans font-bold text-slate-800 text-sm">
                      {student.full_name}
                    </td>

                    {/* LRN */}
                    <td className="px-5 py-3">
                      <span className="font-mono bg-slate-100 text-[#0B3C26] px-2 py-1 rounded text-xs font-semibold border border-slate-200/50">
                        {student.lrn}
                      </span>
                    </td>

                    {/* Grade Section */}
                    <td className="px-5 py-3 font-medium text-slate-600">
                      Grade {student.grade_level} - <span className="font-bold text-[#0B3C26]">{student.section}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingStudent(student)}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-[#0B3C26] hover:text-white rounded-md border border-emerald-200/50 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                          title="Generate Pass ID Badge"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View ID Pass
                        </button>
                        
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingStudent(student)}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-md border border-red-200/50 transition-colors cursor-pointer"
                            title="Revoke Student Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Active Registry Directory Cache</span>
          <span>Showing {filteredStudents.length} of {students.length} enrollment listings</span>
        </div>
      </div>

      {/* MODAL 2: HIGH-FIDELITY PRINTABLE SECURITY CLEARANCE CARD ID BADGE */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="id-modal-overlay">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative animate-scale-up">
            
            {/* Modal Title Banner */}
            <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-slate-600 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#0B3C26]" />
                OFFICIAL ENTRY CLEARANCE PASS
              </span>
              <button
                onClick={() => setViewingStudent(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Area Wrapper (Styled exact school ID badge) */}
            <div className="p-8 flex justify-center bg-slate-50" id="printable-id-card-content">
              
              {/* Actual ID Card layout */}
              <div className="w-72 bg-white rounded-2xl shadow-xl border-4 border-[#0B3C26] overflow-hidden flex flex-col items-center p-4 relative text-center">
                
                {/* Yellow side corner stripes */}
                <div className="absolute top-0 left-0 w-2 h-full bg-[#EAB308]"></div>
                <div className="absolute top-0 right-0 w-2 h-full bg-[#EAB308]"></div>

                {/* Card Header (TSHS Branding) */}
                <div className="flex flex-col items-center gap-1.5 border-b-2 border-[#EAB308] w-full pb-3 mb-4 select-none">
                  {/* Real Green logo of TSHS */}
                  <div className="w-9 h-9 rounded-full bg-white border border-[#EAB308] flex items-center justify-center p-0.5 flex-shrink-0">
                    <img src="/TAGSI_Logo.png" alt="TSHS Seal" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-[10px] tracking-wider text-[#0B3C26] uppercase leading-tight">
                      Taguig Science High School
                    </h4>
                    <p className="text-[8px] font-mono text-slate-500 tracking-wide mt-0.5">
                      Verifying Excellence, Securing Futures
                    </p>
                  </div>
                </div>

                {/* Subtitle badge */}
                <div className="bg-[#0B3C26] text-[#EAB308] font-sans text-[8px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest mb-4">
                  OFFICIAL STUDENT PASS
                </div>

                {/* Passport Portrait Box */}
                <div className="mb-4">
                  <StudentAvatar
                    fullName={viewingStudent.full_name}
                    lrn={viewingStudent.lrn}
                    imageUrl={viewingStudent.id_image_url}
                    size="lg"
                  />
                </div>

                {/* Student Details */}
                <div className="w-full flex flex-col items-center">
                  <h3 className="font-sans font-extrabold text-[#0B3C26] text-base uppercase leading-tight tracking-wide truncate max-w-full">
                    {viewingStudent.full_name}
                  </h3>
                  
                  <p className="text-[11px] font-mono font-bold text-slate-500 mt-1">
                    Grade {viewingStudent.grade_level} - {viewingStudent.section}
                  </p>
                  
                  <div className="bg-[#0B3C26]/5 border border-[#0B3C26]/10 rounded-lg px-4 py-1.5 mt-3 w-full">
                    <div className="text-[8px] font-sans text-slate-400 uppercase tracking-widest leading-none">
                      Learner Reference Number
                    </div>
                    <div className="font-mono text-[#0B3C26] font-bold text-xs mt-1 tracking-wider">
                      {viewingStudent.lrn}
                    </div>
                  </div>
                </div>

                {/* Code-39 Simulated Barcode */}
                <div className="w-full mt-5 flex flex-col items-center">
                  <div className="h-6 flex items-end gap-0.5" title="Code-39 Barcode" aria-hidden="true">
                    {viewingStudent.lrn.split("").map((digit, index) => {
                      const widths = [
                        "w-0.5", "w-1", "w-0.5", "w-1.5", "w-0.5",
                        "w-1", "w-1.5", "w-0.5", "w-1", "w-0.5"
                      ];
                      const heightPercent = index % 2 === 0 ? "h-full" : "h-5/6";
                      const widthClass = widths[parseInt(digit) % widths.length];
                      return (
                        <div
                          key={index}
                          className={`${widthClass} ${heightPercent} bg-slate-900`}
                        />
                      );
                    })}
                  </div>
                  
                  {/* QR code image for scanner */}
                  <div className="w-24 h-24 bg-white border-2 border-[#0B3C26] p-1.5 rounded-xl shadow-xs mt-4 relative flex items-center justify-center">
                    {viewingStudentQrPayload ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(viewingStudentQrPayload)}`}
                        alt="ID Scan QR"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-[9px] text-[#0B3C26] font-mono text-center flex flex-col items-center justify-center gap-1">
                        <span className="w-4 h-4 border-2 border-[#0B3C26] border-t-transparent rounded-full animate-spin"></span>
                        <span>Securing...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Valid Tag */}
                <div className="mt-5 border-t border-slate-100 pt-3 w-full flex items-center justify-between text-[7px] text-slate-400 font-mono">
                  <span>VALID SYSTEM PASS</span>
                  <span>S.Y. 2026 - 2027</span>
                </div>

              </div>

            </div>

            {/* Print/Download controls */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Close View
              </button>
              
              <button
                onClick={triggerPrint}
                className="px-4 py-2 bg-[#0B3C26] hover:bg-[#0B3C26]/90 text-[#EAB308] text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                id="print-pass-card-btn"
              >
                <Printer className="w-4 h-4 text-[#EAB308]" />
                Print Clearance Card
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: SECURE DELETION CONFIRMATION DIALOG */}
      {deletingStudent && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 animate-scale-up">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-sans font-black text-lg tracking-tight uppercase">Revoke Registration?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete <strong className="text-[#0B3C26]">{deletingStudent.full_name}</strong> (LRN: {deletingStudent.lrn}) from the school gateway database? This action is immediate and cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-3 bg-red-50 text-red-700 border border-red-100 p-2.5 rounded text-[11px] font-mono">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setDeletingStudent(null); setDeleteError(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
