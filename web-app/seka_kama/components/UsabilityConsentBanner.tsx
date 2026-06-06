'use client';

import { useState, useEffect } from 'react';
import { Shield, X, Info, Check, Settings, Download } from 'lucide-react';
import { useUsabilityTracking } from '@/services/usabilityService';

interface UsabilityConsentBannerProps {
  onConsentChange?: (granted: boolean) => void;
}

export default function UsabilityConsentBanner({ onConsentChange }: UsabilityConsentBannerProps) {
  const { hasConsent, setConsent, getPrivacyPreferences, setPrivacyPreferences } = useUsabilityTracking();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [privacyPrefs, setPrivacyPrefs] = useState(getPrivacyPreferences());

  useEffect(() => {
    // Check if we've already shown the banner
    const hasShownBanner = localStorage.getItem('seka-kama-ux-banner-shown');
    if (!hasShownBanner) {
      setShowBanner(true);
      localStorage.setItem('seka-kama-ux-banner-shown', 'true');
    }
  }, []);

  useEffect(() => {
    onConsentChange?.(hasConsent());
  }, [hasConsent, onConsentChange]);

  const handleAcceptAll = () => {
    const newPrefs = {
      ...privacyPrefs,
      trackInteractions: true,
      trackPerformance: true,
      trackEcologicalContext: true,
      anonymizeData: true
    };
    setPrivacyPreferences(newPrefs);
    setPrivacyPrefs(newPrefs);
    setConsent(true);
    setShowBanner(false);
  };

  const handleAcceptEssential = () => {
    const newPrefs = {
      ...privacyPrefs,
      trackInteractions: true,
      trackPerformance: false,
      trackEcologicalContext: false,
      anonymizeData: true
    };
    setPrivacyPreferences(newPrefs);
    setPrivacyPrefs(newPrefs);
    setConsent(true);
    setShowBanner(false);
  };

  const handleDecline = () => {
    const newPrefs = {
      ...privacyPrefs,
      trackInteractions: false,
      trackPerformance: false,
      trackEcologicalContext: false,
      anonymizeData: true
    };
    setPrivacyPreferences(newPrefs);
    setPrivacyPrefs(newPrefs);
    setConsent(false);
    setShowBanner(false);
  };

  const handleSaveSettings = () => {
    setPrivacyPreferences(privacyPrefs);
    setConsent(privacyPrefs.trackInteractions);
    setShowSettings(false);
    if (!privacyPrefs.trackInteractions) {
      setShowBanner(false);
    }
  };

  const togglePreference = (key: keyof typeof privacyPrefs) => {
    setPrivacyPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner && !showSettings) return null;

  if (showSettings) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Settings className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Privacy Settings</h3>
                  <p className="text-sm text-slate-600">Control how we collect data to improve your experience</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Data Collection Section */}
            <div className="space-y-4">
              <h4 className="text-base font-bold text-slate-800">Data Collection Preferences</h4>
              
              <div className="space-y-3">
                {/* Interaction Tracking */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Download className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="font-medium text-slate-800">Interaction Tracking</h5>
                      <p className="text-sm text-slate-600">Track clicks, navigation, and component interactions</p>
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          Helps identify usability issues
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePreference('trackInteractions')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      privacyPrefs.trackInteractions ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      privacyPrefs.trackInteractions ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Performance Tracking */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Info className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="font-medium text-slate-800">Performance Monitoring</h5>
                      <p className="text-sm text-slate-600">Track load times and application responsiveness</p>
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                          Improves application speed
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePreference('trackPerformance')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      privacyPrefs.trackPerformance ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      privacyPrefs.trackPerformance ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Ecological Context */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Shield className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="font-medium text-slate-800">Ecological Context</h5>
                      <p className="text-sm text-slate-600">Include conservation data in usability analysis</p>
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                          Context-aware improvements
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePreference('trackEcologicalContext')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      privacyPrefs.trackEcologicalContext ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      privacyPrefs.trackEcologicalContext ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Data Anonymization */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Check className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="font-medium text-slate-800">Data Anonymization</h5>
                      <p className="text-sm text-slate-600">Remove personal identifiers from collected data</p>
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded-full">
                          Privacy protection enabled
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePreference('anonymizeData')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      privacyPrefs.anonymizeData ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      privacyPrefs.anonymizeData ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-800">Data Retention</h5>
                  <p className="text-sm text-blue-700">
                    Usability data is retained for {privacyPrefs.dataRetentionDays} days for analysis. 
                    You can request data deletion at any time through the settings panel.
                  </p>
                </div>
              </div>
            </div>

            {/* Conservation Impact */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-emerald-800">Conservation Impact</h5>
                  <p className="text-sm text-emerald-700">
                    Your participation helps improve ecological data tools used by conservationists worldwide. 
                    Better UX means more effective wildlife protection.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleDecline}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Decline All
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 z-[10000]">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Help Improve Seka Kama</h3>
                <p className="text-sm text-slate-600">Your interactions help conservation tools work better</p>
              </div>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-slate-700">
            We use <span className="font-medium text-emerald-700">anonymous interaction data</span> to identify usability issues and improve the ecological analysis experience for conservation professionals worldwide.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-emerald-100 rounded-md mt-0.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-700">No personal information collected</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-emerald-100 rounded-md mt-0.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-700">Data deleted after 30 days</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-emerald-100 rounded-md mt-0.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-700">Used only for UX improvements</span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Better UX means conservationists can analyze ecological data faster, leading to more effective wildlife protection decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDecline}
              className="px-4 py-3 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex-1"
            >
              Decline
            </button>
            <button
              onClick={handleAcceptEssential}
              className="px-4 py-3 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex-1"
            >
              Accept Essential
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-3 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex-1"
            >
              Accept All
            </button>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full mt-3 text-center text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Customize settings
          </button>
        </div>
      </div>
    </div>
  );
}