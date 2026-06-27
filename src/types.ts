export interface Student {
  id: string;
  lrn: string; // 12-digit Filipino LRN
  full_name: string;
  section: string;
  grade_level: string;
  id_image_url?: string;
  imported_at?: string;
}

export interface VerificationLog {
  id: string;
  lrn: string;
  studentName?: string;
  section?: string;
  status: 'VERIFIED' | 'NOT_FOUND';
  timestamp: string;
}
