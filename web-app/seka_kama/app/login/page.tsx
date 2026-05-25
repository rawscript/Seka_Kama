'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/services/config';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const bgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-GB', { hour12: false }));
    };
    const interval = setInterval(updateClock, 1000);
    updateClock();
    return () => clearInterval(interval);
  }, []);
  /*
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
  
        if (bgRef.current) {
          const moveX = (e.clientX - window.innerWidth / 2) * 0.008;
          const moveY = (e.clientY - window.innerHeight / 2) * 0.008;
          bgRef.current.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
        }
      };
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }, []);
  */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiUrl()}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Authentication failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .login-container {
            font-family: 'Hanken Grotesk', sans-serif;
            height: 100vh;
            margin: 0;
            overflow: hidden;
            background-color: #000;
        }

        .login-headline {
            font-family: 'Playfair Display', serif;
        }

        .cinematic-bg {
            height: 100vh;
            width: 100vw;
            position: fixed;
            z-index: 0;
            top: 0;
            left: 0;
        }

        .glass-panel {
            background: rgba(10, 10, 10, 0.4);
            backdrop-filter: blur(40px) saturate(110%);
            -webkit-backdrop-filter: blur(40px) saturate(110%);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .text-glow {
            text-shadow: 0 0 40px rgba(197, 160, 89, 0.3);
        }

        .cta-glow:hover {
            box-shadow: 0 0 30px rgba(197, 160, 89, 0.4);
        }

        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24;
        }
      `}} />
      <div className="login-container text-white selection:bg-[#c5a059] selection:text-[#4e3700] relative">
        <div className="cinematic-bg">
          <img
            ref={bgRef}
            alt="Conservation Research Outpost"
            className="w-full h-full object-cover"
            src="https://res.cloudinary.com/dp7vwr0av/image/upload/v1779445101/auth-form-2_exleco.png"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <main className="relative h-screen flex items-center justify-center px-6 md:px-10 lg:px-20 overflow-hidden lg:justify-end z-10 w-full">
          {/* Terminal Identifier (Top Right) */}
          <div className="absolute top-10 right-10 flex flex-col items-end z-20 pointer-events-none hidden md:flex">
            <span className="text-[10px] text-[#c5a059] tracking-[0.2em] mb-1 font-semibold uppercase">TERMINAL STATUS</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
              <span className="text-[11px] font-medium text-white/60 uppercase tracking-widest">Node: SER-04-S // SECURE</span>
            </div>
          </div>

          {/* Right Side: Login Interface (Glass Panel) */}
          <div className="glass-panel w-full max-w-[500px] rounded-2xl shadow-2xl relative overflow-hidden z-20 p-8 lg:p-12 lg:mr-24">
            {/* Interface Header */}
            <div className="mb-16 relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <span className="w-10 h-[1px] bg-[#c5a059]/40"></span>
                <span className="text-[11px] font-semibold text-[#c5a059]/80 tracking-[0.3em] uppercase">AUTHENTICATION REQUIRED</span>
              </div>
              <h2 className="login-headline text-[48px] md:text-[56px] font-semibold text-white mb-4 text-glow leading-none">
                Welcome Back.
              </h2>
              <p className="text-[16px] text-[#e2e2e2]/50 max-w-[320px] leading-relaxed">
                Access the secure field intelligence network. Credentials required for sector sync.
              </p>
            </div>

            {/* Login Form */}
            <form className="space-y-10 relative z-10" onSubmit={handleSubmit}>
              <div className="space-y-8">
                <div className="relative group/input">
                  <label className="text-[10px] font-semibold text-[#c5a059]/60 mb-1 block transition-colors group-focus-within/input:text-[#c5a059] tracking-widest uppercase">
                    Agent Identifier
                  </label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-white/10 py-3 text-[18px] text-white focus:ring-0 focus:border-[#c5a059] transition-all placeholder:text-white/10 outline-none"
                    placeholder="ID-000000"
                    required
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative group/input">
                  <label className="text-[10px] font-semibold text-[#c5a059]/60 mb-1 block transition-colors group-focus-within/input:text-[#c5a059] tracking-widest uppercase">
                    Secure Keycode
                  </label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-white/10 py-3 text-[18px] text-white focus:ring-0 focus:border-[#c5a059] transition-all placeholder:text-white/10 outline-none"
                    placeholder="••••••••"
                    required
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="text-[#ba1a1a] text-sm bg-[#ba1a1a]/10 p-3 rounded border border-[#ba1a1a]/30">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] font-medium tracking-widest text-white/40">
                <label className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors">
                  <input className="w-4 h-4 rounded-none bg-transparent border-white/20 text-[#c5a059] focus:ring-offset-0 focus:ring-[#c5a059]" type="checkbox" />
                  REMEMBER TERMINAL
                </label>
                <Link className="hover:text-[#c5a059] transition-colors" href="/register">REGISTER</Link>
              </div>

              <button
                className="w-full bg-[#c5a059] py-6 text-[#4e3700] text-[12px] font-semibold tracking-[0.3em] flex items-center justify-center gap-4 group/btn hover:bg-[#e9c176] transition-all duration-500 cta-glow disabled:opacity-50 uppercase"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    SYNCHRONIZING...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                    INITIALIZE SYSTEM
                    <span className="material-symbols-outlined text-[18px] group-hover/btn:translate-x-2 transition-transform duration-500">east</span>
                  </>
                )}
              </button>
            </form>

            {/* Decorative Bits */}
            <div className="mt-12 flex justify-between items-end opacity-20">
              <div className="flex gap-1.5">
                <div className="h-1 w-4 bg-white/40"></div>
                <div className="h-1 w-1 bg-white/40"></div>
                <div className="h-1 w-1 bg-white/40"></div>
              </div>
              <span className="text-[8px] tracking-[0.5em] font-semibold uppercase relative right-0">Encrypted Session</span>
            </div>
          </div>

          {/* Footer Data */}
          <div className="absolute bottom-10 left-20 hidden lg:flex gap-16 items-center text-white/30 z-20">
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold tracking-[0.3em] mb-1 uppercase text-[#c5a059]/60">Location</span>
              <span className="text-[11px] font-medium text-white/60 tracking-widest">SERENGETI SECTOR x</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold tracking-[0.3em] mb-1 uppercase text-[#c5a059]/60">System Time</span>
              <span className="text-[11px] font-medium text-white/60 tracking-widest">{timeStr}</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}