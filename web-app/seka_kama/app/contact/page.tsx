'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Mail, MapPin, Github, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getApiUrl } from '@/services/config';

export default function ContactPage() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
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
    if (!formData.name.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Send form data to backend API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Show success state
        setIsSubmitted(true);
        
        // Reset form after successful submission
        setFormData({
          name: '',
          organization: '',
          message: ''
        });
      } else {
        throw new Error(result.message || 'Failed to send message');
      }

    } catch (err) {
      setError('Failed to send message. Please try again or email directly to jasemwaura@gmail.com');
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
                Seka Kama spatial analysts and researchers are here to help.
              </p>
            </div>

            <div className="space-y-8 pt-4">
              <ContactItem icon={Mail} label="Email" value="jasemwaura@gmail.com" />
              <ContactItem icon={MapPin} label="Location" value="Greater Mara Ecosystem · Kenya" />
              <ContactItem icon={Github} label="Open Source" value="github.com/seka-kama" />
            </div>
          </div>

          <div className={`enterprise-card bg-white p-10 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] mb-8">Direct Inquiry</h3>
            
            {isSubmitted ? (
              <div className="text-center py-12">
                <div className="mb-6">
                  {/* Lion GIF - using a placeholder, you can replace with actual lion GIF URL */}
                  <div className="w-48 h-48 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-amber-300 rounded-full flex items-center justify-center">
                    <div className="text-6xl">🦁</div>
                  </div>
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                </div>
                <h4 className="text-2xl font-serif font-medium text-[#1a1c1c] mb-3">Message Sent Successfully!</h4>
                <p className="text-[#4e4639] mb-6">
                  Thank you for your inquiry. We'll get back to you at{' '}
                  <span className="text-[#775a19] font-medium">jasemwaura@gmail.com</span> shortly.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="bg-[#1a1c1c] text-white font-bold py-3 px-8 text-[11px] tracking-[0.2em] hover:bg-[#775a19] transition-colors uppercase inline-flex items-center gap-2"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#7f7667] uppercase tracking-widest">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors placeholder:text-[#d1c5b4]/80" 
                    placeholder="Dr. Jane Doe" 
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#7f7667] uppercase tracking-widest">
                    Organization
                  </label>
                  <input 
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors placeholder:text-[#d1c5b4]/80" 
                    placeholder="Wildlife Research Inst." 
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#7f7667] uppercase tracking-widest">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#f3f3f3] border border-[#d1c5b4]/40 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#775a19] transition-colors min-h-[140px] placeholder:text-[#d1c5b4]/80" 
                    placeholder="How can Seka Kama assist?" 
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="text-xs text-[#7f7667] italic">
                  Your message will be forwarded to <span className="text-[#775a19] font-medium">jasemwaura@gmail.com</span>
                </div>
                
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1a1c1c] text-white font-bold py-4 text-[11px] tracking-[0.2em] hover:bg-[#775a19] disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Intelligence Request
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
