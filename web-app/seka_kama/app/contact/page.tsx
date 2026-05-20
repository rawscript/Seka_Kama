'use client';

import Link from 'next/link';
import { ShieldCheck, Mail, MapPin, Phone, Github, Twitter } from 'lucide-react';

export default function ContactPage() {
   return (
      <div className="min-h-screen bg-[#020617] text-slate-200">
         <nav className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass-effect sticky top-0 z-50">
            <Link href="/" className="flex items-center gap-2">
               <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  <ShieldCheck className="w-5 h-5 text-white" />
               </div>
               <span className="font-bold text-white tracking-tight">Seka Kama</span>
            </Link>
         </nav>

         <main className="max-w-5xl mx-auto py-24 px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="space-y-8">
                  <div className="space-y-4">
                     <h1 className="text-5xl font-bold text-white tracking-tighter">Get in touch.</h1>
                     <p className="text-slate-400 text-lg leading-relaxed">
                        Have questions about the SekaNet model or want to integrate your conservancy data?
                        Our team of spatial analysts and researchers are here to help.
                     </p>
                  </div>

                  <div className="space-y-6 pt-8">
                     <div className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 transition-all">
                           <Mail className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Email</p>
                           <p className="text-white font-medium">jasemwaura@gmail.com</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 transition-all">
                           <MapPin className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Location</p>
                           <p className="text-white font-medium">Greater Mara Ecosystem · Kenya</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 transition-all">
                           <Github className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Open Source</p>
                           <p className="text-white font-medium">github.com/seka-kama</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="enterprise-card p-8 space-y-6">
                  <h3 className="text-lg font-bold text-white">Direct Inquiry</h3>
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                        <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Dr. Jane Doe" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organization</label>
                        <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Wildlife Research Inst." />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Message</label>
                        <textarea className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors min-h-[120px]" placeholder="How can we help?" />
                     </div>
                     <button className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all uppercase tracking-widest text-xs">
                        Send Intelligence Request
                     </button>
                  </form>
               </div>
            </div>
         </main>
      </div>
   );
}
