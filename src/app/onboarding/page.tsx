"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, Users, Building, GraduationCap, User, Mail, Calendar, Mic, Settings, Zap } from 'lucide-react';
import Link from 'next/link';

// Helper function for assistant naming
const getAssistantName = (userType: string, userName: string): string => {
  const baseName = userName ? `${userName}'s` : 'Your';
  switch (userType) {
    case 'family': return `${baseName} Family Assistant`;
    case 'student': return `${baseName} Study Buddy`;
    case 'business': return `${baseName} Business Assistant`;
    default: return `${baseName} Personal Assistant`;
  }
};

interface OnboardingData {
  userType: 'individual' | 'family' | 'student' | 'business' | null;
  familySize: number;
  primaryUseCase: string[];
  experience: 'beginner' | 'intermediate' | 'advanced' | null;
  interests: string[];
  goals: string[];
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

const userTypes = [
  {
    id: 'individual',
    name: 'Individual',
    description: 'Personal productivity and organization',
    icon: User,
    examples: ['Personal task management', 'Calendar organization', 'Email automation']
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Busy families with multiple schedules',
    icon: Users,
    examples: ['Family calendar sync', 'Kids activity tracking', 'Household management']
  },
  {
    id: 'student',
    name: 'Student',
    description: 'Academic organization and study help',
    icon: GraduationCap,
    examples: ['Homework tracking', 'Study schedules', 'Assignment reminders']
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Small business and team coordination',
    icon: Building,
    examples: ['Team scheduling', 'Client management', 'Business automation']
  }
];

const useCases = [
  'Email management and automation',
  'Calendar scheduling and coordination',
  'Task and project management',
  'Voice-controlled assistance',
  'Family activity coordination',
  'Academic planning and tracking',
  'Business process automation',
  'Personal knowledge management'
];

const goals = [
  'Save time on daily tasks',
  'Better family organization',
  'Improve productivity',
  'Reduce email overload',
  'Never miss important events',
  'Streamline communication',
  'Automate routine tasks',
  'Stay on top of responsibilities'
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8; // Increased to include new steps
  const [isCompleting, setIsCompleting] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    userType: null,
    familySize: 1,
    primaryUseCase: [],
    experience: null,
    interests: [],
    goals: [],
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  });
  const [connectors, setConnectors] = useState({
    gmail: { enabled: false, scopes: ['read', 'send'] },
    calendar: { enabled: false, scopes: ['read', 'write'] }
  });
  const [voiceSettings, setVoiceSettings] = useState({
    pipeline: 'lite',
    wakeWord: 'Hey Family',
    enabled: true
  });
  const [routines, setRoutines] = useState<any[]>([]);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;
    
    setIsCompleting(true);
    
    try {
      // Complete onboarding via API
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...onboardingData,
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName || user.firstName,
          authProvider: 'email', // Could be detected from user object
          connectors,
          voicePipeline: voiceSettings.pipeline,
          wakeWord: voiceSettings.wakeWord,
          routines
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Mark onboarding as completed in localStorage
        localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
        
        // Redirect to dashboard with onboarding complete
        router.push('/dashboard?onboarded=true');
      } else {
        throw new Error(result.error || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return onboardingData.userType !== null;
      case 2: return onboardingData.primaryUseCase.length > 0;
      case 3: return onboardingData.experience !== null;
      case 4: return onboardingData.goals.length > 0;
      case 5: return true; // Preferences are optional
      case 6: return true; // Connections are optional
      case 7: return true; // Voice setup is optional
      case 8: return true; // Complete step
      default: return false;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center text-text-secondary hover:text-accent mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          
          <h1 className="text-h1 font-bold text-text-primary dark:text-text-primary-dark mb-2">
            Welcome to FamilyAI
          </h1>
          <p className="text-body text-text-secondary dark:text-text-secondary-dark">
            Let's personalize your experience and set up your account
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            {['Profile', 'Use Cases', 'Experience', 'Goals', 'Preferences', 'Connections', 'Voice Setup', 'Complete'].map((label, idx) => {
              const step = idx + 1;
              return (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                      step <= currentStep 
                        ? 'bg-accent text-white' 
                        : 'bg-panel border border-hairline text-text-secondary'
                    }`}>
                      {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                    </div>
                    <span className="text-small text-text-secondary">{label}</span>
                  </div>
                  {step < totalSteps && (
                    <div className={`w-16 h-px mx-2 ${
                      step < currentStep ? 'bg-accent' : 'bg-border'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: User Type */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                  Tell us about yourself
                </h2>
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  This helps us customize your experience
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {userTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setOnboardingData({ ...onboardingData, userType: type.id as any })}
                    className={`card-base p-6 text-left transition-all ${
                      onboardingData.userType === type.id 
                        ? 'ring-2 ring-accent ring-offset-4' 
                        : 'hover:-translate-y-1'
                    }`}
                  >
                    <div className="w-12 h-12 bg-accent-light rounded-lg flex items-center justify-center mb-4">
                      <type.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="text-h3 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                      {type.name}
                    </h3>
                    <p className="text-body text-text-secondary dark:text-text-secondary-dark mb-4">
                      {type.description}
                    </p>
                    <ul className="space-y-1">
                      {type.examples.map((example, idx) => (
                        <li key={idx} className="text-small text-text-secondary dark:text-text-secondary-dark">
                          • {example}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              {onboardingData.userType === 'family' && (
                <div className="max-w-md mx-auto mt-8">
                  <div className="card-base p-6">
                    <label className="block text-body font-medium text-text-primary dark:text-text-primary-dark mb-2">
                      Family Size
                    </label>
                    <select
                      value={onboardingData.familySize}
                      onChange={(e) => setOnboardingData({ ...onboardingData, familySize: parseInt(e.target.value) })}
                      className="w-full"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                        <option key={size} value={size}>
                          {size} {size === 1 ? 'person' : 'people'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Primary Use Cases */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                  What would you like help with?
                </h2>
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  Select all that apply - this helps us recommend the right features
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {useCases.map((useCase) => (
                  <button
                    key={useCase}
                    onClick={() => {
                      const isSelected = onboardingData.primaryUseCase.includes(useCase);
                      if (isSelected) {
                        setOnboardingData({
                          ...onboardingData,
                          primaryUseCase: onboardingData.primaryUseCase.filter(u => u !== useCase)
                        });
                      } else {
                        setOnboardingData({
                          ...onboardingData,
                          primaryUseCase: [...onboardingData.primaryUseCase, useCase]
                        });
                      }
                    }}
                    className={`card-base p-4 text-left transition-all ${
                      onboardingData.primaryUseCase.includes(useCase)
                        ? 'ring-2 ring-accent ring-offset-2 bg-accent-light'
                        : 'hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body text-text-primary dark:text-text-primary-dark">
                        {useCase}
                      </span>
                      {onboardingData.primaryUseCase.includes(useCase) && (
                        <CheckCircle className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Experience Level */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                  What's your experience with AI assistants?
                </h2>
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  This helps us provide the right level of guidance
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                {[
                  { id: 'beginner', label: 'Beginner', description: 'New to AI assistants' },
                  { id: 'intermediate', label: 'Intermediate', description: 'Some experience with AI tools' },
                  { id: 'advanced', label: 'Advanced', description: 'Very familiar with AI assistants' }
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setOnboardingData({ ...onboardingData, experience: level.id as any })}
                    className={`card-base p-6 text-center transition-all ${
                      onboardingData.experience === level.id 
                        ? 'ring-2 ring-accent ring-offset-4' 
                        : 'hover:-translate-y-1'
                    }`}
                  >
                    <h3 className="text-h3 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                      {level.label}
                    </h3>
                    <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                      {level.description}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Goals */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                  What are your main goals?
                </h2>
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  Select the outcomes you're hoping to achieve
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {goals.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => {
                      const isSelected = onboardingData.goals.includes(goal);
                      if (isSelected) {
                        setOnboardingData({
                          ...onboardingData,
                          goals: onboardingData.goals.filter(g => g !== goal)
                        });
                      } else {
                        setOnboardingData({
                          ...onboardingData,
                          goals: [...onboardingData.goals, goal]
                        });
                      }
                    }}
                    className={`card-base p-4 text-left transition-all ${
                      onboardingData.goals.includes(goal)
                        ? 'ring-2 ring-accent ring-offset-2 bg-accent-light'
                        : 'hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body text-text-primary dark:text-text-primary-dark">
                        {goal}
                      </span>
                      {onboardingData.goals.includes(goal) && (
                        <CheckCircle className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 5: Notification Preferences */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                  Notification Preferences
                </h2>
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  Choose how you'd like to receive updates and reminders
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="card-base p-8 space-y-6">
                  {[
                    { key: 'email', label: 'Email Notifications', description: 'Important updates and summaries' },
                    { key: 'push', label: 'Push Notifications', description: 'Real-time alerts and reminders' },
                    { key: 'sms', label: 'SMS Notifications', description: 'Critical alerts via text message' }
                  ].map((notif) => (
                    <div key={notif.key} className="flex items-center justify-between p-4 bg-panel rounded-lg">
                      <div>
                        <h4 className="font-medium text-text-primary dark:text-text-primary-dark">
                          {notif.label}
                        </h4>
                        <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                          {notif.description}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={onboardingData.notifications[notif.key as keyof typeof onboardingData.notifications]}
                          onChange={(e) => setOnboardingData({
                            ...onboardingData,
                            notifications: {
                              ...onboardingData.notifications,
                              [notif.key]: e.target.checked
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 6: Service Connections */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                  Connect Your Services
                </h2>
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  Connect Gmail and Calendar to enable email management and scheduling
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-6">
                <div className="card-base p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-8 h-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-text-primary dark:text-text-primary-dark">Gmail</h3>
                        <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                          Send emails and manage your inbox with voice commands
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={connectors.gmail.enabled}
                        onChange={(e) => setConnectors({
                          ...connectors,
                          gmail: { ...connectors.gmail, enabled: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                  {connectors.gmail.enabled && (
                    <div className="text-small text-text-secondary dark:text-text-secondary-dark bg-blue-50 p-3 rounded">
                      <strong>Permissions:</strong> Read emails, Send emails, Access contacts
                    </div>
                  )}
                </div>

                <div className="card-base p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-text-primary dark:text-text-primary-dark">Google Calendar</h3>
                        <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                          Schedule events and manage your calendar with voice commands
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={connectors.calendar.enabled}
                        onChange={(e) => setConnectors({
                          ...connectors,
                          calendar: { ...connectors.calendar, enabled: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                  {connectors.calendar.enabled && (
                    <div className="text-small text-text-secondary dark:text-text-secondary-dark bg-green-50 p-3 rounded">
                      <strong>Permissions:</strong> View events, Create events, Modify events
                    </div>
                  )}
                </div>

                <div className="text-center text-small text-text-secondary dark:text-text-secondary-dark bg-yellow-50 p-3 rounded">
                  <strong>Note:</strong> You can connect these services later from your dashboard settings
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 7: Voice Setup */}
          {currentStep === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                  Voice Assistant Setup
                </h2>
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  Configure your voice assistant preferences
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-6">
                <div className="card-base p-6">
                  <h3 className="font-semibold text-text-primary dark:text-text-primary-dark mb-4">Voice Pipeline</h3>
                  <div className="grid gap-4">
                    {[
                      { 
                        id: 'lite', 
                        name: 'Lite (Free)', 
                        description: 'Basic voice commands, 30 minutes/month',
                        icon: Mic,
                        recommended: onboardingData.experience === 'beginner'
                      },
                      { 
                        id: 'pro', 
                        name: 'Pro ($9/month)', 
                        description: 'Advanced features, 300 minutes/month, wake word',
                        icon: Zap,
                        recommended: onboardingData.experience === 'intermediate'
                      },
                      { 
                        id: 'pro_plus', 
                        name: 'Pro+ ($19/month)', 
                        description: 'Premium features, 1000 minutes/month, custom wake word',
                        icon: Settings,
                        recommended: onboardingData.experience === 'advanced'
                      }
                    ].map((pipeline) => (
                      <button
                        key={pipeline.id}
                        onClick={() => setVoiceSettings({ ...voiceSettings, pipeline: pipeline.id })}
                        className={`card-base p-4 text-left transition-all ${
                          voiceSettings.pipeline === pipeline.id 
                            ? 'ring-2 ring-accent ring-offset-2' 
                            : 'hover:-translate-y-1'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <pipeline.icon className="w-6 h-6 text-accent" />
                            <div>
                              <h4 className="font-medium text-text-primary dark:text-text-primary-dark">
                                {pipeline.name}
                                {pipeline.recommended && (
                                  <span className="ml-2 text-xs bg-accent text-white px-2 py-1 rounded">
                                    Recommended
                                  </span>
                                )}
                              </h4>
                              <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                                {pipeline.description}
                              </p>
                            </div>
                          </div>
                          {voiceSettings.pipeline === pipeline.id && (
                            <CheckCircle className="w-5 h-5 text-accent" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {(voiceSettings.pipeline === 'pro' || voiceSettings.pipeline === 'pro_plus') && (
                  <div className="card-base p-6">
                    <h3 className="font-semibold text-text-primary dark:text-text-primary-dark mb-4">Wake Word</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={voiceSettings.wakeWord}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, wakeWord: e.target.value })}
                        placeholder="e.g., Hey Family, Hello Assistant"
                        className="w-full p-3 border border-hairline rounded-lg"
                      />
                      <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                        Choose a phrase to activate your assistant. Keep it 2-3 words and avoid common phrases.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 8: Summary and Complete */}
          {currentStep === 8 && (
            <motion.div
              key="step8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                  You're All Set!
                </h2>
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  Review your settings and complete setup
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="card-base p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-text-primary dark:text-text-primary-dark mb-3">Profile</h3>
                      <div className="space-y-2 text-small">
                        <p><strong>Type:</strong> {onboardingData.userType}</p>
                        {onboardingData.userType === 'family' && <p><strong>Size:</strong> {onboardingData.familySize} people</p>}
                        <p><strong>Experience:</strong> {onboardingData.experience}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary dark:text-text-primary-dark mb-3">Features</h3>
                      <div className="space-y-2 text-small">
                        <p><strong>Use Cases:</strong> {onboardingData.primaryUseCase.length} selected</p>
                        <p><strong>Goals:</strong> {onboardingData.goals.length} selected</p>
                        <p><strong>Voice Pipeline:</strong> {voiceSettings.pipeline}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-text-primary dark:text-text-primary-dark mb-3">Connected Services</h3>
                    <div className="space-y-2 text-small">
                      <p><strong>Gmail:</strong> {connectors.gmail.enabled ? 'Connected' : 'Not connected'}</p>
                      <p><strong>Calendar:</strong> {connectors.calendar.enabled ? 'Connected' : 'Not connected'}</p>
                    </div>
                  </div>

                  <div className="text-center bg-accent-light p-4 rounded-lg">
                    <p className="text-body text-accent font-medium">
                      Your {getAssistantName(onboardingData.userType || 'individual', user?.firstName || '')} is ready to help!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between max-w-2xl mx-auto mt-12">
          <button
            onClick={handleBack}
            className={`btn-ghost ${currentStep === 1 ? 'invisible' : ''}`}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isCompleting || !canProceed()}
              className="btn-primary flex items-center gap-2"
            >
              {isCompleting ? 'Completing...' : 'Complete Setup'}
              {!isCompleting && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Skip Link */}
        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-small text-text-secondary hover:text-accent">
            Skip onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}