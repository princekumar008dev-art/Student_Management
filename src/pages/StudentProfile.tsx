import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Student,
  Course,
  Subject,
  Attendance,
  Mark,
  StudentAssignment,
} from '@/lib/supabase';
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  Modal,
  statusColors,
} from '@/components/ui';
import {
  Edit2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  CreditCard,
  BookOpen,
  TrendingUp,
  ClipboardList,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
} from 'lucide-react';

type Tab = 'overview' | 'attendance' | 'marks' | 'subjects' | 'assignments';

export function StudentProfile({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    course_id: '',
    semester: 1,
    section: 'A',
    photo_url: '',
  });

  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    subjects.forEach((s) => { map[s.id] = s; });
    return map;
  }, [subjects]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: studentsData } = await supabase.from('students').select('*').limit(1);
      if (!studentsData || studentsData.length === 0) {
        setLoading(false);
        return;
      }
      const stu = studentsData[0] as Student;
      setStudent(stu);

      const [courseRes, subjectsRes, attRes, marksRes, assignRes, coursesRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', stu.course_id).maybeSingle(),
        supabase.from('subjects').select('*').eq('course_id', stu.course_id).eq('semester', stu.semester),
        supabase.from('attendance').select('*').eq('student_id', stu.id),
        supabase.from('marks').select('*').eq('student_id', stu.id),
        supabase.from('student_assignments').select('*').eq('student_id', stu.id).order('due_date', { ascending: true }),
        supabase.from('courses').select('*'),
      ]);

      setCourse((courseRes.data as Course) || null);
      setSubjects((subjectsRes.data as Subject[]) || []);
      setAttendance((attRes.data as Attendance[]) || []);
      setMarks((marksRes.data as Mark[]) || []);
      setAssignments((assignRes.data as StudentAssignment[]) || []);
      setCourses((coursesRes.data as Course[]) || []);

      setEditForm({
        name: stu.name,
        email: stu.email,
        phone: stu.phone,
        dob: stu.dob || '',
        gender: stu.gender,
        address: stu.address,
        course_id: stu.course_id || '',
        semester: stu.semester,
        section: stu.section,
        photo_url: stu.photo_url,
      });
    } catch {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const overallPercent = useMemo(() => {
    if (marks.length === 0) return 0;
    let totalObtained = 0;
    let totalMax = 0;
    for (const m of marks) {
      totalObtained += m.internal_marks + m.assignment_marks + m.exam_marks;
      totalMax += m.max_internal + m.max_assignment + m.max_exam;
    }
    return totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
  }, [marks]);

  const grade = useMemo(() => {
    if (overallPercent >= 90) return 'A+';
    if (overallPercent >= 80) return 'A';
    if (overallPercent >= 70) return 'B+';
    if (overallPercent >= 60) return 'B';
    if (overallPercent >= 50) return 'C';
    return 'F';
  }, [overallPercent]);

  const overallAttendance = useMemo(() => {
    if (attendance.length === 0) return 0;
    const total = attendance.reduce((s, a) => s + a.total_classes, 0);
    const attended = attendance.reduce((s, a) => s + a.classes_attended, 0);
    return total > 0 ? Math.round((attended / total) * 100) : 0;
  }, [attendance]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          dob: editForm.dob || null,
          gender: editForm.gender,
          address: editForm.address.trim(),
          course_id: editForm.course_id || null,
          semester: Number(editForm.semester),
          section: editForm.section,
          photo_url: editForm.photo_url.trim(),
        })
        .eq('id', student.id);
      if (error) throw error;
      showToast('Profile updated successfully');
      setEditOpen(false);
      await loadProfile();
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Student Profile" subtitle="View and manage your academic profile" />
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <PageHeader title="Student Profile" subtitle="View and manage your academic profile" />
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={User} title="No student profile" message="No student record found in the system." />
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'marks', label: 'Marks' },
    { key: 'subjects', label: 'Subjects' },
    { key: 'assignments', label: 'Assignments' },
  ];

  const attMap: Record<string, Attendance> = {};
  attendance.forEach((a) => { attMap[a.subject_id] = a; });

  const marksMap: Record<string, Mark> = {};
  marks.forEach((m) => { marksMap[m.subject_id] = m; });

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Student Profile"
        subtitle="View and manage your academic profile"
        action={
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </button>
        }
      />

      {/* Profile Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {student.photo_url ? (
              <img src={student.photo_url} alt={student.name} className="h-24 w-24 rounded-2xl object-cover" />
            ) : (
              student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{course?.name || 'No course assigned'}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 justify-center sm:justify-start">
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <CreditCard className="h-4 w-4 text-slate-400" />
                {student.student_id}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {student.email}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                {student.phone}
              </span>
            </div>
          </div>
          <div className="flex gap-6 sm:flex-col sm:items-end">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{overallPercent}%</p>
              <p className="text-xs text-slate-500">Overall</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-600">{overallAttendance}%</p>
              <p className="text-xs text-slate-500">Attendance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.key
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={TrendingUp} label="Overall Score" value={`${overallPercent}%`} color="text-blue-600" bg="bg-blue-50" />
                <StatCard icon={Award} label="Grade" value={grade} color="text-amber-600" bg="bg-amber-50" />
                <StatCard icon={CheckCircle2} label="Attendance" value={`${overallAttendance}%`} color="text-teal-600" bg="bg-teal-50" />
                <StatCard icon={BookOpen} label="Subjects" value={String(subjects.length)} color="text-indigo-600" bg="bg-indigo-50" />
              </div>

              {/* Personal Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={User} label="Full Name" value={student.name} />
                  <InfoItem icon={CreditCard} label="Student ID" value={student.student_id} />
                  <InfoItem icon={CreditCard} label="Enrollment No." value={student.enrollment_number} />
                  <InfoItem icon={Mail} label="Email" value={student.email} />
                  <InfoItem icon={Phone} label="Phone" value={student.phone} />
                  <InfoItem icon={Calendar} label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'} />
                  <InfoItem icon={User} label="Gender" value={student.gender || 'N/A'} />
                  <InfoItem icon={MapPin} label="Address" value={student.address || 'N/A'} />
                </div>
              </div>

              {/* Academic Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Academic Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={GraduationCap} label="Course" value={course?.name || 'N/A'} />
                  <InfoItem icon={BookOpen} label="Department" value={course?.department || 'N/A'} />
                  <InfoItem icon={Calendar} label="Semester" value={`Semester ${student.semester}`} />
                  <InfoItem icon={User} label="Section" value={student.section} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="overflow-x-auto">
              {attendance.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No attendance records" message="Attendance data will appear here." />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Subject</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Attended</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Total</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map((att) => {
                      const subj = subjectMap[att.subject_id];
                      const pct = att.total_classes > 0 ? Math.round((att.classes_attended / att.total_classes) * 100) : 0;
                      return (
                        <tr key={att.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 text-sm text-slate-700">{subj?.name || 'Unknown'}</td>
                          <td className="py-3 px-3 text-sm text-slate-600 text-center">{att.classes_attended}</td>
                          <td className="py-3 px-3 text-sm text-slate-600 text-center">{att.total_classes}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                <div
                                  className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${pct >= 75 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'marks' && (
            <div className="overflow-x-auto">
              {marks.length === 0 ? (
                <EmptyState icon={Award} title="No marks recorded" message="Your exam and internal marks will appear here." />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Subject</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Internal</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Assignment</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Exam</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Total</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {marks.map((m) => {
                      const subj = subjectMap[m.subject_id];
                      const total = m.internal_marks + m.assignment_marks + m.exam_marks;
                      const max = m.max_internal + m.max_assignment + m.max_exam;
                      const pct = max > 0 ? Math.round((total / max) * 100) : 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 text-sm text-slate-700">{subj?.name || 'Unknown'}</td>
                          <td className="py-3 px-3 text-sm text-slate-600 text-center">{m.internal_marks}/{m.max_internal}</td>
                          <td className="py-3 px-3 text-sm text-slate-600 text-center">{m.assignment_marks}/{m.max_assignment}</td>
                          <td className="py-3 px-3 text-sm text-slate-600 text-center">{m.exam_marks}/{m.max_exam}</td>
                          <td className="py-3 px-3 text-sm font-medium text-slate-700 text-center">{total}/{max}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-sm font-medium ${pct >= 75 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="overflow-x-auto">
              {subjects.length === 0 ? (
                <EmptyState icon={BookOpen} title="No subjects" message="Your enrolled subjects will appear here." />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Code</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Subject</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Credits</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-3">Faculty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjects.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-sm font-medium text-slate-700">{s.subject_code}</td>
                        <td className="py-3 px-3 text-sm text-slate-700">{s.name}</td>
                        <td className="py-3 px-3 text-sm text-slate-600 text-center">{s.credits}</td>
                        <td className="py-3 px-3 text-sm text-slate-600">{s.faculty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No assignments" message="Your assignments will appear here." />
              ) : (
                assignments.map((a) => {
                  const subj = a.subject_id ? subjectMap[a.subject_id] : null;
                  const isOverdue = a.status === 'pending' && a.due_date && new Date(a.due_date) < new Date();
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        a.status === 'completed' ? 'bg-emerald-50' : isOverdue ? 'bg-red-50' : 'bg-amber-50'
                      }`}>
                        {a.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : isOverdue ? (
                          <Clock className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-800">{a.title}</h4>
                        {a.description && <p className="text-sm text-slate-500 mt-0.5">{a.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {subj && (
                            <span className="text-xs text-slate-400">{subj.subject_code} - {subj.name}</span>
                          )}
                          {a.due_date && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(a.due_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors(isOverdue ? 'overdue' : a.status)}`}>
                            {isOverdue ? 'overdue' : a.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} required />
            </Field>
            <Field label="Email">
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputClass} required />
            </Field>
            <Field label="Phone">
              <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Gender">
              <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} className={inputClass}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Course">
              <select value={editForm.course_id} onChange={(e) => setEditForm({ ...editForm, course_id: e.target.value })} className={inputClass}>
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Semester">
              <input type="number" min={1} max={10} value={editForm.semester} onChange={(e) => setEditForm({ ...editForm, semester: Number(e.target.value) })} className={inputClass} />
            </Field>
            <Field label="Section">
              <select value={editForm.section} onChange={(e) => setEditForm({ ...editForm, section: e.target.value })} className={inputClass}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </Field>
          </div>
          <Field label="Address">
            <textarea value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
          </Field>
          <Field label="Photo URL">
            <input type="text" value={editForm.photo_url} onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })} placeholder="https://..." className={inputClass} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
      </div>
    </div>
  );
}
