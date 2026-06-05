'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Map, BarChart3, Users, Settings, Shield } from 'lucide-react';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Welcome to Seka Kama',
      description: 'Your ecological digital twin for lion conservation',
      icon: <Shield className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <p className="text-emerald-800 text-sm">
              Seka Kama combines satellite data, machine learning, and ecological modeling 
              to help protect lion populations in the Greater Mara ecosystem.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Data Sources</p>
              <p className="font-semibold text-sm">NASA, GBIF, CHIRPS</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Coverage Area</p>
              <p className="font-semibold text-sm">2,711 km²</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Grid Resolution</p>
              <p className="font-semibold text-sm">271,211 cells</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Update Frequency</p>
              <p className="font-semibold text-sm">Daily</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Interactive Map Interface',
      description: 'Navigate and explore ecological data',
      icon: <Map className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Key Features:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Zoom to conservancies with quick navigation</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Toggle between satellite and topographic views</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Hover over cells for detailed information</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Adjust time slider to see historical data</span>
              </li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-semibold mb-1">Quick Tip</p>
              <p className="text-xs text-gray-700">
                Use the year slider to explore how habitats have changed over time.
              </p>
            </div>
            <div className="p-3 bg-white border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-semibold mb-1">Pro Tip</p>
              <p className="text-xs text-gray-700">
                Click on the map to run scenario simulations on specific areas.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Analyst Panel',
      description: 'AI-powered ecological insights',
      icon: <BarChart3 className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-purple-800 text-sm">
              The SekaNet Analyst provides AI-generated narratives about ecological trends, 
              threat detection, and conservation recommendations.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white border border-purple-100 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-700">Neural Defense</p>
                <p className="text-xs text-gray-600">Habitat suitability analysis and threat detection</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white border border-purple-100 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-700">Active Threat</p>
                <p className="text-xs text-gray-600">Real-time monitoring of human-wildlife conflict risks</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: 'Scenario Simulation',
      description: 'Test "what-if" conservation strategies',
      icon: <Users className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800 text-sm">
              Run predictive scenarios to understand how land use changes affect 
              lion populations. Perfect for conservation planning and impact assessments.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-700 mb-1">Scenario Types</p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Habitat restoration</li>
                <li>• Infrastructure impact</li>
                <li>• Climate change</li>
                <li>• Human settlement</li>
              </ul>
            </div>
            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-700 mb-1">Outputs</p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Population projections</li>
                <li>• Risk assessments</li>
                <li>• Conservation recommendations</li>
                <li>• Interactive visualizations</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: 'Customize Your Experience',
      description: 'Configure settings and preferences',
      icon: <Settings className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Available Settings:</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm">Email notifications</span>
                <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                  <div className="w-3 h-3 bg-white rounded-full absolute right-1 top-1"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm">Data refresh frequency</span>
                <span className="text-sm text-emerald-600 font-semibold">Daily</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm">Default map view</span>
                <span className="text-sm text-emerald-600 font-semibold">Satellite</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm">Units of measurement</span>
                <span className="text-sm text-emerald-600 font-semibold">Metric</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-800">
              You can always update these settings later from the user profile menu.
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps([...Array(steps.length).keys()]);
    onComplete();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  {currentStepData.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentStepData.title}</h2>
                  <p className="text-sm text-gray-600">{currentStepData.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Step indicators */}
            <div className="flex justify-between mt-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    completedSteps.includes(index) 
                      ? 'bg-emerald-500 text-white'
                      : index === currentStep
                      ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-500'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {completedSteps.includes(index) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-xs mt-1 text-gray-500">Step {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {currentStepData.content}
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Skip tutorial
              </button>
              
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
                  {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}