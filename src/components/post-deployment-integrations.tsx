'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  ExternalLink,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PostDeploymentIntegrationsProps {
  agentId: string;
  agentName: string;
  onIntegrationUpdate?: () => void;
}

interface IntegrationStatus {
  gmail: {
    connected: boolean;
    email?: string;
    lastSync?: string;
    error?: string;
  };
  documents: {
    count: number;
    processing: number;
    ready: number;
    totalSize: number;
  };
}

interface Document {
  id: string;
  filename: string;
  size: number;
  type: string;
  uploadedAt: string;
  processed: boolean;
  status?: 'processing' | 'ready' | 'error';
  hasEmbeddings?: boolean;
  errorMessage?: string;
}

export default function PostDeploymentIntegrations({
  agentId,
  agentName,
  onIntegrationUpdate
}: PostDeploymentIntegrationsProps) {
  const { user } = useUser();
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    gmail: { connected: false },
    documents: { count: 0, processing: 0, ready: 0, totalSize: 0 }
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load integration status
  useEffect(() => {
    if (user && agentId) {
      loadIntegrationStatus();
      loadDocuments();
    }
  }, [user, agentId]);

  const loadIntegrationStatus = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/integrations/status?userId=${user.id}&agentId=${agentId}`);
      if (response.ok) {
        const status = await response.json();
        setIntegrationStatus(status);
      }
    } catch (error) {
      console.error('Error loading integration status:', error);
    }
  };

  const loadDocuments = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/documents?userId=${user.id}&agentId=${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGmailConnect = async () => {
    if (!user) return;

    setConnectingGmail(true);
    setError(null);

    try {
      // Initiate Gmail OAuth flow
      const response = await fetch('/api/gmail/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Failed to initiate Gmail connection');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleDocumentUpload = async (file: File) => {
    if (!user || !agentId) return;

    setUploadingDocument(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agentId', agentId);
      formData.append('userId', user.id);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            const newDoc = result.document;

            setDocuments(prev => [...prev, newDoc]);
            setSuccess(`Document "${file.name}" uploaded successfully!`);

            // Reload integration status
            await loadIntegrationStatus();
            onIntegrationUpdate?.();

            // Clear file input
            const fileInput = document.getElementById('document-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

          } catch (error) {
            setError('Upload completed but failed to process response');
          }
        } else {
          setError(`Upload failed with status: ${xhr.status}`);
        }
        setUploadingDocument(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('error', () => {
        setError('Upload failed due to network error');
        setUploadingDocument(false);
        setUploadProgress(0);
      });

      xhr.open('POST', '/api/documents');
      xhr.send(formData);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploadingDocument(false);
      setUploadProgress(0);
    }

    // Clear messages after 5 seconds
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
  };

  const handleDeleteDocument = async (documentId: string, filename: string) => {
    if (!user) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/documents/delete?documentId=${documentId}&userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        setSuccess(`Document "${filename}" deleted successfully!`);

        // Reload integration status
        await loadIntegrationStatus();
        onIntegrationUpdate?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete document');
    }

    // Clear messages after 3 seconds
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Integration Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Gmail Status</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {integrationStatus.gmail.connected ? 'Connected' : 'Not Connected'}
                </p>
                {integrationStatus.gmail.email && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {integrationStatus.gmail.email}
                  </p>
                )}
              </div>
              <Mail className={`h-8 w-8 ${integrationStatus.gmail.connected ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Documents</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {integrationStatus.documents.count}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {integrationStatus.documents.ready} ready for RAG
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">RAG Status</p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                  {integrationStatus.documents.ready > 0 ? 'Active' : 'Inactive'}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {formatFileSize(integrationStatus.documents.totalSize)} processed
                </p>
              </div>
              <Brain className={`h-8 w-8 ${integrationStatus.documents.ready > 0 ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gmail Integration */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-red-500" />
            Gmail Integration
            {integrationStatus.gmail.connected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to enable email reading, sending, and voice commands for email management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrationStatus.gmail.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Connected to {integrationStatus.gmail.email}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Last synced: {integrationStatus.gmail.lastSync || 'Never'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your agent can now read emails, send messages, and manage your inbox through voice commands.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Gmail Not Connected
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Connect your Gmail to enable email functionality
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleGmailConnect}
                  disabled={connectingGmail}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {connectingGmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Connect Gmail
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">What you'll get:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Read and search emails by voice</li>
                    <li>• Send emails through voice commands</li>
                    <li>• Get email summaries and notifications</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Voice commands:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• "Check my emails"</li>
                    <li>• "Send email to John"</li>
                    <li>• "Read unread messages"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Upload for RAG */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-purple-500" />
            Knowledge Base (RAG)
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {documents.length} documents
            </Badge>
          </CardTitle>
          <CardDescription>
            Upload documents to enhance your agent's knowledge and provide more accurate responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-300 mb-4 font-medium">
              Upload documents to enhance {agentName}'s knowledge
            </p>
            <div className="flex justify-center gap-4">
              <div className="flex-1 max-w-xs">
                <Input
                  id="document-upload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleDocumentUpload(file);
                    }
                  }}
                  disabled={uploadingDocument}
                  accept=".pdf,.txt,.doc,.docx,.md,.json"
                  className="hidden"
                />
                <Label
                  htmlFor="document-upload"
                  className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 cursor-pointer transition-colors font-semibold disabled:opacity-50"
                >
                  {uploadingDocument ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </>
                  )}
                </Label>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Supported: PDF, TXT, DOC, DOCX, MD, JSON (Max 10MB)
            </p>
          </div>

          {/* Upload Progress */}
          {uploadingDocument && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700"
            >
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing document...
                </span>
                <span className="text-purple-600 dark:text-purple-400">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full h-2" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Creating embeddings for RAG queries...
              </p>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Documents List */}
          {documents.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Uploaded Documents</h3>
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl">
                        {doc.type.includes('pdf') ? '📄' : doc.type.includes('text') ? '📝' : '📎'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {doc.filename}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant={doc.status === 'ready' ? "default" : doc.status === 'error' ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {doc.status === 'ready' ? "✅ Ready" : doc.status === 'error' ? "❌ Error" : "⏳ Processing"}
                          </Badge>
                          {doc.hasEmbeddings && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              <Brain className="h-3 w-3 mr-1" />
                              RAG Enabled
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title={`Delete ${doc.filename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {documents.length === 0 && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents yet</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Upload documents to give {agentName} access to your knowledge base
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
