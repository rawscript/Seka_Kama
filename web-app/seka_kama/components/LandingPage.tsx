'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Statistic {
  label: string;
  value: string;
  change?: string;
}

const statistics: Statistic[] = [
  { label: 'Lion Population', value: '465', change: '-3.1%' },
  { label: 'Protected Area Coverage', value: '1,511 km²', change: '+2.4%' },
  { label: 'Active Conservancies', value: '17', change: '0%' },
  { label: 'Nightlight Trend', value: '+4.2%', change: '+0.8%' },
];

const features = [
  {
    title: 'Spatial Analysis',
    description: 'Analyze lion distribution across 271,211 grid cells with real-time density visualization.',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    title: 'What-If Scenarios',
    description: 'Simulate infrastructure development and predict impacts on lion abundance.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    title: 'Kepler.gl Explorer',
    description: 'Interactive geospatial analytics with professional visualization tools.',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    title: 'AI Narratives',
    description: 'Generate conservation reports and ecological interpretations from model outputs.',
    icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  },
];

export default function LandingPage() {
  const [animatedStats, setAnimatedStats] = useState(statistics.map(() => 0));

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedStats([465, 1511, 17, 4.2]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Seka Kama
            <span className="hero-subtitle">Digital Twin</span>
          </h1>
          <p className="hero-description">
            Advanced geospatial analytics for lion conservation in the Greater Mara ecosystem.
            Predict, simulate, and visualize the impact of human infrastructure on lion populations.
          </p>
          <div className="hero-buttons">
            <Link href="/login" className="btn-primary">
              Launch Application
            </Link>
            <Link href="/demo" className="btn-secondary">
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="stats-section">
        <div className="stats-grid">
          {statistics.map((stat, idx) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              {stat.change && (
                <div className={`stat-change ${stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
                  {stat.change}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Platform Capabilities</h2>
          <div className="features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="feature-card">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="tech-section">
        <div className="container">
          <h2 className="section-title">Powered By</h2>
          <div className="tech-grid">
            <div className="tech-item">
              <span className="tech-name">XGBoost</span>
              <span className="tech-desc">Predictive Modeling</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">PostGIS</span>
              <span className="tech-desc">Spatial Database</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Kepler.gl</span>
              <span className="tech-desc">Geospatial Analytics</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">FastAPI</span>
              <span className="tech-desc">API Framework</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Next.js</span>
              <span className="tech-desc">Frontend Platform</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Llama 3</span>
              <span className="tech-desc">LLM Integration</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-info">
            <p>&copy; 2026 Seka Kama Conservancy. All rights reserved.</p>
            <p>Data sources: VIIRS DNB, LandDX, ESA WorldCover, WDPA</p>
          </div>
          <div className="footer-links">
            <Link href="/about">About</Link>
            <Link href="/documentation">Documentation</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .landing-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a2a 0%, #1a1a3e 100%);
          color: white;
        }

        .hero-section {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4rem 2rem;
        }

        .hero-content {
          max-width: 800px;
        }

        .hero-title {
          font-size: 4rem;
          font-weight: 700;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #fff 0%, #4CAF50 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          display: block;
          font-size: 1.5rem;
          color: #4CAF50;
          margin-top: 0.5rem;
        }

        .hero-description {
          font-size: 1.25rem;
          color: #ccc;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .btn-primary, .btn-secondary {
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background: #45a049;
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: transparent;
          color: white;
          border: 2px solid #4CAF50;
        }

        .btn-secondary:hover {
          background: rgba(76, 175, 80, 0.1);
          transform: translateY(-2px);
        }

        .stats-section {
          padding: 4rem 2rem;
          background: rgba(255, 255, 255, 0.05);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .stat-card {
          text-align: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #4CAF50;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #ccc;
          margin-top: 0.5rem;
        }

        .stat-change {
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        .stat-change.positive {
          color: #4CAF50;
        }

        .stat-change.negative {
          color: #f44336;
        }

        .features-section {
          padding: 4rem 2rem;
        }

        .section-title {
          text-align: center;
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 3rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-card {
          padding: 2rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: transform 0.3s ease;
          text-align: center;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.1);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 1rem;
          color: #4CAF50;
        }

        .feature-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .feature-description {
          color: #ccc;
          line-height: 1.5;
        }

        .tech-section {
          padding: 4rem 2rem;
          background: rgba(255, 255, 255, 0.05);
        }

        .tech-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .tech-item {
          text-align: center;
        }

        .tech-name {
          display: block;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .tech-desc {
          font-size: 0.75rem;
          color: #ccc;
        }

        .footer {
          padding: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-info {
          font-size: 0.75rem;
          color: #888;
        }

        .footer-links {
          display: flex;
          gap: 1.5rem;
        }

        .footer-links a {
          color: #888;
          text-decoration: none;
          font-size: 0.875rem;
        }

        .footer-links a:hover {
          color: #4CAF50;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          .hero-buttons {
            flex-direction: column;
            align-items: center;
          }
          .footer-content {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}