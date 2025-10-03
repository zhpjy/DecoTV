'use client';

import { useEffect, useState } from 'react';

const DecoTVFooterCard = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('deco-footer-card');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return (
    <div
      id='deco-footer-card'
      className={`relative overflow-hidden transition-all duration-1000 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {/* 背景渐变和光效 */}
      <div className='relative mx-4 sm:mx-6 lg:mx-auto lg:max-w-4xl mb-8 sm:mb-12'>
        <div className='relative bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-slate-900/95 dark:from-gray-900/95 dark:via-purple-900/95 dark:to-gray-900/95 rounded-3xl p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl backdrop-blur-sm border border-white/10'>
          {/* 动态背景光效 */}
          <div className='absolute inset-0 opacity-30'>
            <div className='absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob'></div>
            <div className='absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000'></div>
            <div className='absolute bottom-0 left-1/2 w-96 h-96 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000'></div>
          </div>

          {/* 网格背景 */}
          <div
            className='absolute inset-0 opacity-20'
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>

          {/* 主要内容 */}
          <div className='relative z-10 text-center'>
            {/* DecoTV 标题 */}
            <div className='mb-6 sm:mb-8'>
              <h2 className='text-4xl sm:text-6xl lg:text-7xl font-black tracking-wider relative'>
                <span className='bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400 bg-clip-text text-transparent relative drop-shadow-2xl'>
                  DecoTV
                </span>
                {/* 背景文字增强可读性 */}
                <span className='absolute inset-0 text-white/10 blur-sm font-black tracking-wider'>
                  DecoTV
                </span>
                {/* 发光效果 */}
                <span className='absolute inset-0 bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400 bg-clip-text text-transparent blur-lg opacity-30 animate-pulse'></span>
              </h2>

              {/* 装饰性线条 */}
              <div className='flex justify-center items-center mt-4 sm:mt-6 space-x-4'>
                <div className='h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-cyan-400'></div>
                <div className='w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-ping'></div>
                <div className='w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full'></div>
                <div className='w-2 h-2 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full animate-ping animation-delay-1000'></div>
                <div className='h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-pink-400'></div>
              </div>
            </div>

            {/* Power by Katelya */}
            <div className='space-y-2 sm:space-y-3'>
              <p className='text-lg sm:text-xl lg:text-2xl font-medium text-white/90 drop-shadow-lg'>
                Powered by
              </p>
              <p className='text-2xl sm:text-3xl lg:text-4xl font-bold relative'>
                <span className='bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-lg'>
                  Katelya
                </span>
                {/* 背景文字增强可读性 */}
                <span className='absolute inset-0 text-white/20 blur-sm font-bold'>
                  Katelya
                </span>
              </p>
            </div>

            {/* 底部装饰 */}
            <div className='mt-8 sm:mt-12 flex justify-center space-x-2 sm:space-x-3'>
              <div className='w-2 h-2 bg-cyan-400 rounded-full animate-bounce'></div>
              <div className='w-2 h-2 bg-purple-500 rounded-full animate-bounce animation-delay-200'></div>
              <div className='w-2 h-2 bg-pink-500 rounded-full animate-bounce animation-delay-400'></div>
              <div className='w-2 h-2 bg-yellow-400 rounded-full animate-bounce animation-delay-600'></div>
            </div>
          </div>

          {/* 边框光效 */}
          <div className='absolute inset-0 rounded-3xl border border-transparent bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20 bg-clip-border'></div>
        </div>
      </div>
    </div>
  );
};

export default DecoTVFooterCard;
