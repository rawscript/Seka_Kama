'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Mail, MapPin, Github, Send, CheckCircle, Loader2, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getApiUrl } from '@/services/config';

export default function ContactPage() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${getApiUrl()}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message. Please try again later.');
      }

      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        organization: '',
        message: ''
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700] w-full">
      <Navbar />

      <main className="w-full px-6 lg:px-12 py-16 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
          <div className={`lg:col-span-5 space-y-12 ${mounted ? 'animate-in' : 'opacity-0'}`}>
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
                CONTACT US
              </p>
              <h1 className="text-5xl md:text-6xl font-normal text-[#1a1c1c] tracking-tight leading-tight">
                Get in <span className="italic font-light text-[#4e3700]">touch</span>.
              </h1>
              <p className="text-[#4e4639] text-base leading-relaxed font-light">
                Have questions about the SekaNet model or want to integrate your conservancy data?
                Seka Kama spatial analysts and researchers are here to help.
              </p>
            </div>

            <div className="space-y-8 pt-4">
              <ContactItem icon={Mail} label="Email" value="jasemwaura@gmail.com" />
              <ContactItem icon={MapPin} label="Location" value="Greater Mara Ecosystem · Kenya" />
              <ContactItem icon={Github} label="Open Source" value="github.com/seka-kama" />
            </div>
          </div>

          <div className={`lg:col-span-7 enterprise-card bg-white p-8 md:p-12 border border-[#d1c5b4]/60 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] mb-8">Direct Inquiry</h3>
            
            {isSubmitted ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-[#775a19] mx-auto mb-4" />
                <h4 className="text-2xl font-serif font-medium text-[#1a1c1c] mb-2">Inquiry Transmitted</h4>
                <p className="text-sm text-[#4e4639] font-light max-w-sm mx-auto mb-6">
                  Thank you for reaching out. A platform specialist will review your request and respond within 24 hours.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="bg-[#1a1c1c] text-white font-bold py-3 px-8 text-[11px] tracking-[0.2em] hover:bg-[#775a19] transition-colors uppercase"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm text-sm">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-[11px] font-bold text-[#775a19] uppercase tracking-wider mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Dr. Sarah Kanga"
                      className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors placeholder:text-[#d1c5b4]/80"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-[11px] font-bold text-[#775a19] uppercase tracking-wider mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="sarah@mara-research.org"
                      className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors placeholder:text-[#d1c5b4]/80"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="organization" className="block text-[11px] font-bold text-[#775a19] uppercase tracking-wider mb-2">
                    Organization / Conservancy
                  </label>
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    placeholder="Mara Elephant Project / UNEP"
                    className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors placeholder:text-[#d1c5b4]/80"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-[11px] font-bold text-[#775a19] uppercase tracking-wider mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Inquiry regarding regional calibration vectors or custom scenario modeling..."
                    className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors placeholder:text-[#d1c5b4]/80"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1a1c1c] text-white font-bold py-4 text-[11px] tracking-[0.2em] hover:bg-[#775a19] transition-colors uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Transmitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Inquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ContactItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-3 bg-[#775a19]/10 rounded-sm text-[#775a19] flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-wider">{label}</p>
        <p className="text-base text-[#1a1c1c] font-medium">{value}</p>
      </div>
    </div>
  );
}
