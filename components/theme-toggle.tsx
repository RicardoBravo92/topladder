'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('theme');
  if (stored) return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <Button
      variant='outline'
      size='icon'
      onClick={() => setIsDark((prev) => !prev)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className='fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full shadow-lg cursor-pointer'
    >
      {isDark ? <Sun className='h-5 w-5' /> : <Moon className='h-5 w-5' />}
    </Button>
  );
}