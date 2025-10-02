/* eslint-disable @typescript-eslint/no-explicit-any */


'use client';

import React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Home } from 'lucide-react';

import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export default function TopNavbar() {
  const { siteName } = useSite();
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <header className='hidden md:block fixed top-0 left-0 right-0 z-[900]'>
      <div className='mx-auto max-w-7xl px-4'>
        <div className='mt-2 rounded-2xl border border-white/10 bg-white/30 dark:bg-gray-900/40 shadow-[0_0_1px_0_rgba(255,255,255,0.5),0_0_40px_-10px_rgba(99,102,241,0.5)] backdrop-blur-xl'>
          <nav className='flex items-center justify-between h-14 px-3'>
            {/* Left: Logo */}
            <div className='flex items-center gap-2 min-w-0'>
              <Link href='/' className='shrink-0 select-none hover:opacity-90 transition-opacity'>
                <span className='text-lg font-extrabold tracking-tight neon-text'>{siteName || 'DecoTV'}</span>
              </Link>
            </div>

            {/* Center: Controls */}
            <div className='flex items-center justify-center gap-2'>
              <Link
                href='/'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip ${isActive('/') ? 'ring-2 ring-green-400/60' : ''
                  }`}
              >
                <Home className='h-4 w-4' />
                <span>首页</span>
              </Link>
              <Link
                href='/search'
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm hover:opacity-90 transition-all glass-chip ${isActive('/search') ? 'ring-2 ring-green-400/60' : ''
                  }`}
              >
                <Search className='h-4 w-4' />
                <span>搜索</span>
              </Link>
            </div>

            {/* Right: Theme + User */}
            <div className='flex items-center gap-2'>
              <ThemeToggle />
              <UserMenu />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

