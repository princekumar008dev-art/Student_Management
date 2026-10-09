import { useState, useEffect } from 'react';

export type Page = 'dashboard' | 'tasks' | 'profile' | 'courses' | 'subjects';

export type Toast = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  return { toasts, showToast };
}

export function usePage(): [Page, (p: Page) => void] {
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    const hash = window.location.hash.slice(1) as Page;
    if (hash && ['dashboard', 'tasks', 'profile', 'courses', 'subjects'].includes(hash)) {
      setPage(hash);
    }
  }, []);

  const navigate = (p: Page) => {
    window.location.hash = p;
    setPage(p);
  };

  return [page, navigate];
}
