"use client";

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/dashboard-layout';
import AgentDesignerForm from '@/components/agent-designer-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function AssistantDesigner() {
  const { user } = useUser();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Convex mutations
  const createAssistant = useMutation(api.assistants.create);

  const handleSave = async (assistantConfig: any) => {
    if (!assistantConfig.name.trim()) {
      alert('Assistant name is required');
      return;
    }

    setIsSaving(true);

    try {
      console.log('Creating assistant with user ID:', user?.id);
      
      const assistantData = {
        userId: user?.id || '',
        name: assistantConfig.name.trim(),
        type: assistantConfig.type,
        description: assistantConfig.description.trim() || `A ${assistantConfig.type} to help with your needs`,
        customInstructions: assistantConfig.instructions.trim() || undefined,
        voiceEnabled: true,
        wakeWord: assistantConfig.voiceConfig.wakeWords[0] || 'hey assistant',
        voiceConfig: assistantConfig.voiceConfig
      };
      
      console.log('Assistant config:', assistantData);

      const result = await createAssistant(assistantData);
      
      console.log('Create assistant result:', result);
      
      if (result?.assistantId) {
        console.log('Assistant created successfully with ID:', result.assistantId);
        // Navigate to deploy page after successful creation
        router.push(`/dashboard/agents/${result.assistantId}/publish`);
      } else {
        throw new Error('Failed to create assistant - no ID returned');
      }
    } catch (error) {
      console.error('Error saving assistant:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Authentication failed. Please sign out and sign back in.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Service configuration error. Please contact support.';
        } else if (error.message.includes('timeout') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(`Failed to save assistant: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-text-secondary hover:text-accent mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-h1 font-bold text-text-primary dark:text-text-primary-dark mb-2">
            Create New Assistant
          </h1>
          <p className="text-body text-text-secondary dark:text-text-secondary-dark">
            Design your personal AI helper with minimalist interface
          </p>
        </div>

        {/* Agent Designer Form */}
        <AgentDesignerForm
          onSave={handleSave}
          isSaving={isSaving}
          isEditing={false}
        />
      </div>
    </DashboardLayout>
  );
}
