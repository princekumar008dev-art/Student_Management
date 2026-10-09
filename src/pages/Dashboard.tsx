import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task, Student, Course, Subject } from '@/lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/ui';
import { usePage } from '@/lib/hooks';
import {
  CheckSquare,
  Clock,
  BookOpen,
  GraduationCap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function Dashboard() {
  const [, navigate] = usePage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    highPriorityTasks: 0,
    courses: 0,
    subjects: 0,
    attendance: 0,
    overallPercent: 0,
    grade: 'N/A',
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [tasksRes, coursesRes, subjectsRes, studentsRes] = await Promise.all([
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('courses').select('id'),
          supabase.from('subjects').select('id'),
          supabase.from('students').select('id').limit(1),
        ]);

        const tasks = (tasksRes.data || []) as Task[];
        const coursesCount = coursesRes.data?.length || 0;
        const subjectsCount = subjectsRes.data?.length || 0;

        let attendancePct = 0;
        let overallPct = 0;
        let grade = 'N/A';

        if (studentsRes.data && studentsRes.data.length > 0) {
          const studentId = studentsRes.data[0].id;

          const [attRes, marksRes] = await Promise.all([
            supabase.from('attendance').select('total_classes, classes_attended').eq('student_id', studentId),
            supabase.from('marks').select('internal_marks, assignment_marks, exam_marks, max_internal, max_assignment, max_exam').eq('student_id', studentId),
          ]);

          const att = attRes.data || [];
          if (att.length > 0) {
            const totalClasses = att.reduce((s, a: any) => s + a.total_classes, 0);
            const attended = att.reduce((s, a: any) => s + a.classes_attended, 0);
            attendancePct = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;
          }

          const marks = marksRes.data || [];
          if (marks.length > 0) {
            let totalObtained = 0;
            let totalMax = 0;
            for (const m of marks as any[]) {
              totalObtained += m.internal_marks + m.assignment_marks + m.exam_marks;
              totalMax += m.max_internal + m.max_assignment + m.max_exam;
            }
            overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
            if (overallPct >= 90) grade = 'A+';
            else if (overallPct >= 80) grade = 'A';
            else if (overallPct >= 70) grade = 'B+';
            else if (overallPct >= 60) grade = 'B';
            else if (overallPct >= 50) grade = 'C';
            else grade = 'F';
          }
        }

        setStats({
          totalTasks: tasks.length,
          pendingTasks: tasks.filter((t) => !t.completed).length,
          completedTasks: tasks.filter((t) => t.completed).length,
          highPriorityTasks: tasks.filter((t) => !t.completed && t.priority === 'high').length,
          courses: coursesCount,
          subjects: subjectsCount,
          attendance: attendancePct,
          overallPercent: overallPct,
          grade,
        });
        setRecentTasks(tasks.slice(0, 5));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Dashboard" subtitle="Overview of your academic activities" />
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const cards = [
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', page: 'tasks' as const },
    { label: 'Completed Tasks', value: stats.completedTasks, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', page: 'tasks' as const },
    { label: 'High Priority', value: stats.highPriorityTasks, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', page: 'tasks' as const },
    { label: 'Courses', value: stats.courses, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', page: 'courses' as const },
    { label: 'Subjects', value: stats.subjects, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50', page: 'subjects' as const },
    { label: 'Attendance', value: `${stats.attendance}%`, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50', page: 'profile' as const },
  ];

  return (
    <div className="p-4 lg:p-6">
      <PageHeader title="Dashboard" subtitle="Overview of your academic activities" />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => navigate(card.page)}
              className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Recent Tasks</h3>
          {recentTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks yet" message="Create your first task to get started." />
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      task.completed ? 'bg-emerald-50' : 'bg-amber-50'
                    }`}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {task.title}
                    </p>
                    {task.deadline && (
                      <p className="text-xs text-slate-400">Due: {new Date(task.deadline).toLocaleDateString()}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full border ${
                      task.priority === 'high'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : task.priority === 'medium'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Academic Summary</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">Overall Score</span>
                <span className="text-sm font-bold text-slate-900">{stats.overallPercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                  style={{ width: `${stats.overallPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">Attendance</span>
                <span className="text-sm font-bold text-slate-900">{stats.attendance}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
                  style={{ width: `${stats.attendance}%` }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Current Grade</span>
                <span className="text-2xl font-bold text-blue-600">{stats.grade}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
