/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      hue: number;
    }[] = [];
    const P = Math.min(120, Math.floor((width * height) / 16000));
    for (let i = 0; i < P; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 1.8 + 0.7,
        hue: Math.random() * 360,
      });
    }

    // 根据路由切换主题色域
    const theme = (() => {
      if (pathname.startsWith('/search'))
        return {
          a: 'rgba(99,102,241,0.09)',
          b: 'rgba(59,130,246,0.08)',
          beam: 'rgba(99,102,241,0.28)',
        };
      if (pathname.startsWith('/douban') && typeof window !== 'undefined') {
        const type = new URLSearchParams(window.location.search).get('type');
        if (type === 'movie')
          return {
            a: 'rgba(244,114,182,0.10)',
            b: 'rgba(251,146,60,0.08)',
            beam: 'rgba(244,114,182,0.28)',
          };
        if (type === 'tv')
          return {
            a: 'rgba(168,85,247,0.10)',
            b: 'rgba(59,130,246,0.08)',
            beam: 'rgba(168,85,247,0.28)',
          };
        if (type === 'anime')
          return {
            a: 'rgba(20,184,166,0.10)',
            b: 'rgba(16,185,129,0.08)',
            beam: 'rgba(16,185,129,0.28)',
          };
        if (type === 'show')
          return {
            a: 'rgba(250,204,21,0.10)',
            b: 'rgba(251,191,36,0.08)',
            beam: 'rgba(250,204,21,0.28)',
          };
      }
      if (pathname.startsWith('/live'))
        return {
          a: 'rgba(236,72,153,0.10)',
          b: 'rgba(244,63,94,0.08)',
          beam: 'rgba(236,72,153,0.28)',
        };
      return {
        a: 'rgba(99,102,241,0.06)',
        b: 'rgba(16,185,129,0.06)',
        beam: 'rgba(236,72,153,0.22)',
      };
    })();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Neon gradient backdrop
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, theme.a);
      gradient.addColorStop(1, theme.b);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 取消“竖向高光光波横扫”效果，避免干扰视觉
      // 原先这里会绘制随时间移动的竖向光束

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, 0.6)`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, 0.8)`;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Connections
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const alpha = 1 - d2 / (120 * 120);
            ctx.strokeStyle = `rgba(99,102,241,${alpha * 0.25})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [pathname]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden='true'
      className='fixed inset-0 -z-10 h-full w-full opacity-80 dark:opacity-60'
    />
  );
}
