'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Mail, MapPin, Github, Send } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ContactPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-20 py-24 flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className={`space-y-12 ${mounted ? 'animate-in' : 'opacity-0'}`}>
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
                CONTACT US
              </p>
              <h1 className="text-5xl md:text-6xl font-normal text-[#1a1c1c] tracking-tight leading-tight">
                Get in <span className="italic font-light text-[#4e3700]">touch</span>.
              </h1>
              <p className="text-[#4e4639] text-lg leading-relaxed font-light max-w-md">
                Have questions about the SekaNet model or want to integrate your conservancy data?
                Our team of spatial analysts and researchers are here to help.
              </p>
            </div>

            <div className="space-y-8 pt-4">
              <ContactItem icon={Mail} label="Email" value="jasemwaura@gmail.com" />
              <ContactItem icon={MapPin} label="Location" value="Greater Mara Ecosystem · Kenya" />
              <ContactItem icon={Github} label="Open Source" value="github.com/seka-kama" />
            </div>
          </div>

          <div className={`enterprise-card bg-white p-10 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '150ms', fillMode: 'both' }}>
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] mb-8">Direct Inquiry</h3>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#7f7667] uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors placeholder:text-[#d1c5b4]/80" 
                  placeholder="Dr. Jane Doe" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#7f7667] uppercase tracking-widest">Organization</label>
                <input 
                  type="text" 
                  className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors placeholder:text-[#d1c5b4]/80" 
                  placeholder="Wildlife Research Inst." 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#7f7667] uppercase tracking-widest">Message</label>
                <textarea 
                  className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors min-h-[140px] placeholder:text-[#d1c5b4]/80" 
                  placeholder="How can we help?" 
                />
              </div>
              <button className="w-full bg-[#1a1c1c] text-white font-bold py-4 text-[11px] tracking-[0.2em] hover:bg-[#775a19] transition-colors uppercase flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Send Intelligence Request
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ContactItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-6 group">
      <div className="w-14 h-14 bg-white border border-[#d1c5b4]/40 flex items-center justify-center transition-all group-hover:border-[#775a19] group-hover:shadow-md">
        <Icon className="w-6 h-6 text-[#775a19]" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest mb-1">{label}</p>
        <p className="text-[#1a1c1c] font-medium">{value}</p>
      </div>
    </div>
  );
}
