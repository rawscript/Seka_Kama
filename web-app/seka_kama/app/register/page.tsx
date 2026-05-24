'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/services/config';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    organization: '',
  });
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
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiUrl()}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          organization: formData.organization,
          role: 'analyst',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Registration failed');
      }

      router.push('/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
            min-height: 100vh;
            margin: 0;
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
      <div className="login-container text-white selection:bg-[#c5a059] selection:text-[#4e3700] relative overflow-y-auto overflow-x-hidden">
        <div className="cinematic-bg">
          <img
            ref={bgRef}
            alt="Conservation Research Outpost"
            className="w-full h-full object-cover"
            src="https://res.cloudinary.com/dp7vwr0av/image/upload/v1779445100/auth-form_kh1bio.png"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <main className="relative min-h-screen flex items-center justify-center px-6 md:px-10 lg:px-20 lg:justify-end z-10 w-full py-12">
          {/* Terminal Identifier (Top Right) */}
          <div className="absolute top-10 right-10 flex flex-col items-end z-20 pointer-events-none hidden md:flex">
            <span className="text-[10px] text-[#c5a059] tracking-[0.2em] mb-1 font-semibold uppercase">TERMINAL STATUS</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
              <span className="text-[11px] font-medium text-white/60 uppercase tracking-widest">Node: SER-04-S // ENLISTMENT</span>
            </div>
          </div>

          {/* Right Side: Register Interface (Glass Panel) */}
          <div className="glass-panel w-full max-w-[700px] rounded-2xl shadow-2xl relative z-20 p-8 lg:p-12 lg:mr-24 my-10 relative">
            {/* Interface Header */}
            <div className="mb-12 relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-10 h-[1px] bg-[#c5a059]/40"></span>
                <span className="text-[11px] font-semibold text-[#c5a059]/80 tracking-[0.3em] uppercase">ACCESS REQUEST</span>
              </div>
              <h2 className="login-headline text-[48px] md:text-[56px] font-semibold text-white mb-4 text-glow leading-none">
                Enlistment.
              </h2>
              <p className="text-[16px] text-[#e2e2e2]/50 max-w-[320px] leading-relaxed">
                Join the frontlines of digital conservation monitoring and spatial intelligence.
              </p>
            </div>

            {/* Application Form */}
            <form className="relative z-10" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="relative group/input">
                  <label className="text-[10px] font-semibold text-[#c5a059]/60 mb-1 block transition-colors group-focus-within/input:text-[#c5a059] tracking-widest uppercase">
                    Full Identity
                  </label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-white/10 py-3 text-[18px] text-white focus:ring-0 focus:border-[#c5a059] transition-all placeholder:text-white/10 outline-none"
                    placeholder="Dr. Sarah Kanga"
                    required
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="relative group/input">
                  <label className="text-[10px] font-semibold text-[#c5a059]/60 mb-1 block transition-colors group-focus-within/input:text-[#c5a059] tracking-widest uppercase">
                    Affiliation
                  </label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-white/10 py-3 text-[18px] text-white focus:ring-0 focus:border-[#c5a059] transition-all placeholder:text-white/10 outline-none"
                    placeholder="UNEP / Mara Conservancy"
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                </div>

                <div className="relative group/input md:col-span-2">
                  <label className="text-[10px] font-semibold text-[#c5a059]/60 mb-1 block transition-colors group-focus-within/input:text-[#c5a059] tracking-widest uppercase">
                    Signal Channel (Email)
                  </label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-white/10 py-3 text-[18px] text-white focus:ring-0 focus:border-[#c5a059] transition-all placeholder:text-white/10 outline-none"
                    placeholder="sarah@mara-research.org"
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="relative group/input">
                  <label className="text-[10px] font-semibold text-[#c5a059]/60 mb-1 block transition-colors group-focus-within/input:text-[#c5a059] tracking-widest uppercase">
                    Access Protocol
                  </label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-white/10 py-3 text-[18px] text-white focus:ring-0 focus:border-[#c5a059] transition-all placeholder:text-white/10 outline-none"
                    placeholder="Create Password"
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div className="relative group/input">
                  <label className="text-[10px] font-semibold text-[#c5a059]/60 mb-1 block transition-colors group-focus-within/input:text-[#c5a059] tracking-widest uppercase">
                    Verify Protocol
                  </label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-white/10 py-3 text-[18px] text-white focus:ring-0 focus:border-[#c5a059] transition-all placeholder:text-white/10 outline-none"
                    placeholder="Confirm Password"
                    required
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              {error && (
                <div className="text-[#ba1a1a] text-sm bg-[#ba1a1a]/10 p-3 rounded border border-[#ba1a1a]/30 mb-8">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] font-medium tracking-widest text-white/40 mb-10">
                <label className="flex items-center gap-3 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[14px]">shield_check</span>
                  DATA SOVEREIGNTY SECURED
                </label>
                <Link className="hover:text-[#c5a059] transition-colors" href="/login">SIGN IN INSTEAD</Link>
              </div>

              <button
                className="w-full bg-[#c5a059] py-6 text-[#4e3700] text-[12px] font-semibold tracking-[0.3em] flex items-center justify-center gap-4 group/btn hover:bg-[#e9c176] transition-all duration-500 cta-glow disabled:opacity-50 uppercase"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    INITIALIZING...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                    SUBMIT CLEARANCE
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
              <span className="text-[8px] tracking-[0.5em] font-semibold uppercase relative right-0">Encrypted Provisioning</span>
            </div>
          </div>

          {/* Footer Data */}
          <div className="absolute bottom-10 left-20 hidden lg:flex gap-16 items-center text-white/30 z-20">
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold tracking-[0.3em] mb-1 uppercase text-[#c5a059]/60">Location</span>
              <span className="text-[11px] font-medium text-white/60 tracking-widest">SERENGETI SECTOR VII</span>
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