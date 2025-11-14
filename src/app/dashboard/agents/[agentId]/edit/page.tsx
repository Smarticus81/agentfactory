"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import DashboardLayout from '@/components/dashboard-layout';
import { ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';
import AgentDesignerForm from '@/components/agent-designer-form';

export default function EditAgent() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const agentId = params.agentId as string;

  const [isSaving, setIsSaving] = useState(false);

  // Fetch agent data
  const agent = useQuery(api.assistants.get, { 
    assistantId: agentId as any
  });

  // Mutations
  const updateAssistant = useMutation(api.assistants.update);

  const handleSave = async (assistantConfig: any) => {
    if (!assistantConfig.name.trim()) {
      alert('Assistant name is required');
      return;
    }

    setIsSaving(true);

    try {
      await updateAssistant({
        assistantId: agentId as any,
        updates: {
          name: assistantConfig.name.trim(),
          description: assistantConfig.description.trim() || `A ${assistantConfig.type} to help with your needs`,
          customInstructions: assistantConfig.instructions.trim() || undefined,
          voiceEnabled: true,
          wakeWord: assistantConfig.voiceConfig.wakeWords[0] || 'hey assistant',
          voiceConfig: assistantConfig.voiceConfig
        }
      });
      
      // Navigate back to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating assistant:', error);
      alert('Failed to update assistant. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

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
            Edit Assistant: {agent.name}
          </h1>
          <p className="text-body text-text-secondary dark:text-text-secondary-dark">
            Customize your existing assistant
          </p>
        </div>

        <AgentDesignerForm
          initialData={agent}
          onSave={handleSave}
          isSaving={isSaving}
          isEditing={true}
        />
      </div>
    </DashboardLayout>
  );
}
