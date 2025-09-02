"use client";

import { useState } from 'react';
import { Heart, Users, Calendar, Mail, Shield, CheckCircle, ArrowRight } from 'lucide-react';

interface FamilyOnboardingProps {
  onComplete: (familyInfo: any) => void;
  onSkip: () => void;
}

const templates = [
  {
    id: 'Family Assistant',
    name: 'Family Assistant',
    description: 'Perfect for busy parents managing multiple kids',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    features: ['Family calendar sync', 'School event tracking', 'Sports schedules', 'Pickup reminders']
  },
  {
    id: 'Personal Admin',
    name: 'Personal Admin',
    description: 'Individual productivity and organization',
    icon: Calendar,
    color: 'from-indigo-500 to-indigo-600',
    features: ['Email management', 'Task organization', 'Calendar optimization', 'Smart reminders']
  },
  {
    id: 'Student Helper',
    name: 'Student Helper',
    description: 'Homework tracking and study organization',
    icon: Heart,
    color: 'from-purple-500 to-purple-600',
    features: ['Homework tracking', 'Study schedules', 'Assignment reminders', 'Grade monitoring']
  }
];

export function FamilyOnboarding({ onComplete, onSkip }: FamilyOnboardingProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [familyMembers, setFamilyMembers] = useState([{ name: '', role: 'child' }]);
  const [connections, setConnections] = useState({
    gmail: false,
    googleCalendar: false,
    outlook: false,
    microsoftCalendar: false
  });

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    const familyInfo = {
      template: selectedTemplate,
      assistantName,
      familyMembers: familyMembers.filter(m => m.name.trim()),
      connections
    };
    onComplete(familyInfo);
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { name: '', role: 'child' }]);
  };

  const updateFamilyMember = (index: number, field: string, value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const removeFamilyMember = (index: number) => {
    if (familyMembers.length > 1) {
      setFamilyMembers(familyMembers.filter((_, i) => i !== index));
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return selectedTemplate !== '';
      case 2: return assistantName.trim() !== '';
      case 3: return familyMembers.some(m => m.name.trim());
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  stepNumber <= step 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {stepNumber < step ? <CheckCircle className="w-5 h-5" /> : stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    stepNumber < step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Step {step} of 4
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Choose Your Template
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Select a template that best fits your family's needs
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${template.color} rounded-xl flex items-center justify-center mb-4`}>
                      <template.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {template.description}
                    </p>
                    <ul className="space-y-1">
                      {template.features.map((feature, index) => (
                        <li key={index} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Name Your Assistant
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Give your AI assistant a name that feels personal
                </p>
              </div>
              
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Assistant Name
                </label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  placeholder="e.g., Buddy, Mira, Alex"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  This is how you'll address your assistant
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Add Family Members
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Help your assistant understand your family structure
                </p>
              </div>
              
              <div className="space-y-4">
                {familyMembers.map((member, index) => (
                  <div key={index} className="flex gap-4 items-center">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                      placeholder="Family member name"
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                    />
                    <select
                      value={member.role}
                      onChange={(e) => updateFamilyMember(index, 'role', e.target.value)}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                    >
                      <option value="child">Child</option>
                      <option value="spouse">Spouse</option>
                      <option value="parent">Parent</option>
                      <option value="other">Other</option>
                    </select>
                    {familyMembers.length > 1 && (
                      <button
                        onClick={() => removeFamilyMember(index)}
                        className="px-3 py-3 text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={addFamilyMember}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                >
                  + Add Family Member
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Connect Your Services
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Connect your email and calendar for seamless integration
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: 'gmail', name: 'Gmail', icon: Mail, description: 'Read and send emails' },
                  { key: 'googleCalendar', name: 'Google Calendar', icon: Calendar, description: 'Manage your schedule' },
                  { key: 'outlook', name: 'Outlook', icon: Mail, description: 'Microsoft email integration' },
                  { key: 'microsoftCalendar', name: 'Microsoft Calendar', icon: Calendar, description: 'Office 365 calendar' }
                ].map((service) => (
                  <div
                    key={service.key}
                    onClick={() => setConnections(prev => ({ ...prev, [service.key]: !prev[service.key as keyof typeof connections] }))}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      connections[service.key as keyof typeof connections]
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        connections[service.key as keyof typeof connections]
                          ? 'bg-blue-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        <service.icon className={`w-6 h-6 ${
                          connections[service.key as keyof typeof connections]
                            ? 'text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {service.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-medium mb-1">Your privacy is protected</p>
                    <p>We only access the permissions you explicitly grant. You can revoke access at any time.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-8">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            
            <div className="flex gap-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Skip for now
              </button>
              
              {step === 4 ? (
                <button
                  onClick={handleComplete}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  Create Assistant
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
