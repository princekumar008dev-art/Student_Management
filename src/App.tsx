import { useState } from 'react';
import { Sidebar, Topbar } from '@/components/Layout';
import { ToastContainer } from '@/components/ui';
import { useToast, usePage } from '@/lib/hooks';
import { Dashboard } from '@/pages/Dashboard';
import { TaskManagement } from '@/pages/TaskManagement';
import { StudentProfile } from '@/pages/StudentProfile';
import { CourseManagement, SubjectManagement } from '@/pages/CourseManagement';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'Task Management',
  profile: 'Student Profile',
  courses: 'Courses',
  subjects: 'Subjects',
};

function App() {
  const [page, navigate] = usePage();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { toasts, showToast } = useToast();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        currentPage={page}
        onNavigate={navigate}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={pageTitles[page] || ''} onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {page === 'dashboard' && <Dashboard />}
          {page === 'tasks' && <TaskManagement showToast={showToast} />}
          {page === 'profile' && <StudentProfile showToast={showToast} />}
          {page === 'courses' && <CourseManagement showToast={showToast} />}
          {page === 'subjects' && <SubjectManagement showToast={showToast} />}
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
