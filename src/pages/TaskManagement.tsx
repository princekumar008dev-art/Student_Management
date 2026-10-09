import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/supabase';
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  Modal,
  ConfirmDialog,
  priorityColors,
} from '@/components/ui';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  CheckSquare,
  Calendar,
} from 'lucide-react';

type Priority = 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'pending' | 'completed';
type PriorityFilter = 'all' | Priority;

export function TaskManagement({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 'medium' as Priority,
  });

  const loadTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Failed to load tasks', 'error');
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && !t.completed) ||
        (statusFilter === 'completed' && t.completed);
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const pendingTasks = filtered.filter((t) => !t.completed);
  const completedTasks = filtered.filter((t) => t.completed);

  const openAdd = () => {
    setEditingTask(null);
    setForm({ title: '', description: '', deadline: '', priority: 'medium' });
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      deadline: task.deadline || '',
      priority: task.priority,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Task title is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        deadline: form.deadline || null,
        priority: form.priority,
      };
      if (editingTask) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
        if (error) throw error;
        showToast('Task updated successfully');
      } else {
        const { error } = await supabase.from('tasks').insert(payload);
        if (error) throw error;
        showToast('Task added successfully');
      }
      setModalOpen(false);
      await loadTasks();
    } catch {
      showToast('Failed to save task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = async (task: Task) => {
    const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    if (error) {
      showToast('Failed to update task', 'error');
    } else {
      showToast(task.completed ? 'Task marked as pending' : 'Task completed');
      await loadTasks();
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('tasks').delete().eq('id', deleteId);
    if (error) {
      showToast('Failed to delete task', 'error');
    } else {
      showToast('Task deleted');
      await loadTasks();
    }
    setDeleteId(null);
  };

  const renderTaskCard = (task: Task) => (
    <div
      key={task.id}
      className={`bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-all group ${
        task.completed ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleComplete(task)}
          className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-slate-300 hover:border-emerald-400'
          }`}
        >
          {task.completed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-semibold ${
                task.completed ? 'text-slate-400 line-through' : 'text-slate-800'
              }`}
            >
              {task.title}
            </h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openEdit(task)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteId(task.id)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {task.description && (
            <p className="text-sm text-slate-500 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${priorityColors(task.priority)}`}
            >
              {task.priority} priority
            </span>
            {task.deadline && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(task.deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Task Management"
        subtitle="Organize your tasks with deadlines and priorities"
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        }
      />

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={CheckSquare}
            title="No tasks found"
            message={search || statusFilter !== 'all' || priorityFilter !== 'all' ? 'Try adjusting your filters.' : 'Click "Add Task" to create your first task.'}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold text-slate-800">Pending</h3>
              <span className="text-sm text-slate-400">({pendingTasks.length})</span>
            </div>
            {pendingTasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 py-8 text-center text-sm text-slate-400">
                All caught up! No pending tasks.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingTasks.map(renderTaskCard)}
              </div>
            )}
          </div>

          {/* Completed */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <h3 className="text-base font-semibold text-slate-800">Completed</h3>
              <span className="text-sm text-slate-400">({completedTasks.length})</span>
            </div>
            {completedTasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 py-8 text-center text-sm text-slate-400">
                No completed tasks yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {completedTasks.map(renderTaskCard)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Add New Task'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter task title"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter task description"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
