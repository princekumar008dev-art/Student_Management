import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Course, Subject } from '@/lib/supabase';
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  Modal,
  ConfirmDialog,
} from '@/components/ui';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  GraduationCap,
  Library,
} from 'lucide-react';

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export function CourseManagement({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    course_id: '',
    name: '',
    department: '',
    duration_years: 3,
    total_semesters: 6,
  });

  const loadCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('courses').select('*').order('name');
    if (error) {
      showToast('Failed to load courses', 'error');
    } else {
      setCourses(data || []);
      const counts: Record<string, number> = {};
      for (const c of data || []) {
        const { count } = await supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('course_id', c.id);
        counts[c.id] = count || 0;
      }
      setSubjectCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return courses;
    const s = search.toLowerCase();
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.course_id.toLowerCase().includes(s) ||
        c.department.toLowerCase().includes(s)
    );
  }, [courses, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ course_id: '', name: '', department: '', duration_years: 3, total_semesters: 6 });
    setModalOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      course_id: c.course_id,
      name: c.name,
      department: c.department,
      duration_years: c.duration_years,
      total_semesters: c.total_semesters,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_id.trim() || !form.name.trim() || !form.department.trim()) {
      showToast('All fields are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        course_id: form.course_id.trim(),
        name: form.name.trim(),
        department: form.department.trim(),
        duration_years: Number(form.duration_years),
        total_semesters: Number(form.total_semesters),
      };
      if (editing) {
        const { error } = await supabase.from('courses').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Course updated successfully');
      } else {
        const { error } = await supabase.from('courses').insert(payload);
        if (error) throw error;
        showToast('Course added successfully');
      }
      setModalOpen(false);
      await loadCourses();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save course';
      showToast(msg.includes('duplicate') || msg.includes('unique') ? 'Course ID already exists' : 'Failed to save course', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('courses').delete().eq('id', deleteId);
    if (error) {
      showToast('Failed to delete course', 'error');
    } else {
      showToast('Course deleted');
      await loadCourses();
    }
    setDeleteId(null);
  };

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Course Management"
        subtitle="Manage college courses and their details"
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Course
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={BookOpen} title="No courses found" message={search ? 'Try adjusting your search.' : 'Click "Add Course" to create your first course.'} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Course ID</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Department</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Duration</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Semesters</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Subjects</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 group">
                    <td className="py-3 px-4 text-sm font-medium text-slate-700">{c.course_id}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{c.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{c.department}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-center">{c.duration_years} years</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-center">{c.total_semesters}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-center">
                      <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
                        {subjectCounts[c.id] || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Course' : 'Add New Course'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course ID</label>
            <input type="text" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} placeholder="e.g. CSE101" className={inputClass} required disabled={!!editing} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. B.Tech Computer Science" className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Computer Science" className={inputClass} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Years)</label>
              <input type="number" min={1} max={10} value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: Number(e.target.value) })} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Semesters</label>
              <input type="number" min={1} max={20} value={form.total_semesters} onChange={(e) => setForm({ ...form, total_semesters: Number(e.target.value) })} className={inputClass} required />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving...' : editing ? 'Update Course' : 'Add Course'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Course"
        message="Deleting this course will also delete all its subjects. This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export function SubjectManagement({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    subject_code: '',
    name: '',
    course_id: '',
    semester: 1,
    credits: 3,
    faculty: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [subRes, courseRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('courses').select('*').order('name'),
    ]);
    if (subRes.error) {
      showToast('Failed to load subjects', 'error');
    } else {
      setSubjects(subRes.data || []);
    }
    setCourses(courseRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const courseMap = useMemo(() => {
    const m: Record<string, Course> = {};
    courses.forEach((c) => { m[c.id] = c; });
    return m;
  }, [courses]);

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.subject_code.toLowerCase().includes(search.toLowerCase()) ||
        s.faculty.toLowerCase().includes(search.toLowerCase());
      const matchesCourse = courseFilter === 'all' || s.course_id === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [subjects, search, courseFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ subject_code: '', name: '', course_id: courses[0]?.id || '', semester: 1, credits: 3, faculty: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({
      subject_code: s.subject_code,
      name: s.name,
      course_id: s.course_id || '',
      semester: s.semester,
      credits: s.credits,
      faculty: s.faculty,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject_code.trim() || !form.name.trim() || !form.faculty.trim()) {
      showToast('All fields are required', 'error');
      return;
    }
    if (!form.course_id) {
      showToast('Please select a course', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        subject_code: form.subject_code.trim(),
        name: form.name.trim(),
        course_id: form.course_id,
        semester: Number(form.semester),
        credits: Number(form.credits),
        faculty: form.faculty.trim(),
      };
      if (editing) {
        const { error } = await supabase.from('subjects').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Subject updated successfully');
      } else {
        const { error } = await supabase.from('subjects').insert(payload);
        if (error) throw error;
        showToast('Subject added successfully');
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save subject';
      showToast(msg.includes('duplicate') || msg.includes('unique') ? 'Subject code already exists' : 'Failed to save subject', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('subjects').delete().eq('id', deleteId);
    if (error) {
      showToast('Failed to delete subject', 'error');
    } else {
      showToast('Subject deleted');
      await loadData();
    }
    setDeleteId(null);
  };

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Subject Management"
        subtitle="Manage subjects across all courses"
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Subject
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, or faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={Library} title="No subjects found" message={search || courseFilter !== 'all' ? 'Try adjusting your filters.' : 'Click "Add Subject" to create your first subject.'} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Code</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Course</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Semester</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Credits</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Faculty</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 group">
                    <td className="py-3 px-4 text-sm font-medium text-slate-700">{s.subject_code}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{s.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{s.course_id ? courseMap[s.course_id]?.name || 'N/A' : 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-center">{s.semester}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-center">{s.credits}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{s.faculty}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subject' : 'Add New Subject'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject Code</label>
            <input type="text" value={form.subject_code} onChange={(e) => setForm({ ...form, subject_code: e.target.value })} placeholder="e.g. CS301" className={inputClass} required disabled={!!editing} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Data Structures" className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className={inputClass} required>
              <option value="">Select Course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
              <input type="number" min={1} max={20} value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Credits</label>
              <input type="number" min={1} max={10} value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Faculty</label>
              <input type="text" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} placeholder="Faculty name" className={inputClass} required />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving...' : editing ? 'Update Subject' : 'Add Subject'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Subject"
        message="Are you sure you want to delete this subject? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
