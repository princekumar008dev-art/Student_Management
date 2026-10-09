import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

export type Course = {
  id: string;
  course_id: string;
  name: string;
  department: string;
  duration_years: number;
  total_semesters: number;
  created_at: string;
};

export type Subject = {
  id: string;
  subject_code: string;
  name: string;
  course_id: string | null;
  semester: number;
  credits: number;
  faculty: string;
  created_at: string;
};

export type Student = {
  id: string;
  student_id: string;
  enrollment_number: string;
  name: string;
  email: string;
  phone: string;
  dob: string | null;
  gender: string;
  address: string;
  photo_url: string;
  course_id: string | null;
  semester: number;
  section: string;
  created_at: string;
};

export type Attendance = {
  id: string;
  student_id: string;
  subject_id: string;
  total_classes: number;
  classes_attended: number;
};

export type Mark = {
  id: string;
  student_id: string;
  subject_id: string;
  internal_marks: number;
  assignment_marks: number;
  exam_marks: number;
  max_internal: number;
  max_assignment: number;
  max_exam: number;
};

export type StudentAssignment = {
  id: string;
  student_id: string;
  subject_id: string | null;
  title: string;
  description: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  created_at: string;
};

export type SubjectWithCourse = Subject & {
  course?: Course | null;
};

export type MarkWithSubject = Mark & {
  subject?: Subject | null;
};

export type AttendanceWithSubject = Attendance & {
  subject?: Subject | null;
};

export type StudentAssignmentWithSubject = StudentAssignment & {
  subject?: Subject | null;
};
