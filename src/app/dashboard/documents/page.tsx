'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trash2, Upload, FileText, AlertCircle, CheckCircle, Loader2, Brain, ArrowLeft, FolderOpen, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard-layout';
import Link from 'next/link';

interface Document {
  id: string;
  filename: string;
  size: number;
  type: string;
  uploadedAt: string;
  processed: boolean;
  status?: 'processing' | 'ready' | 'error';
  hasEmbeddings?: boolean;
  preview: string;
  errorMessage?: string;
}

export default function DocumentsPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingDocuments, setProcessingDocuments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents on component mount
  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/documents?userId=${user.id}${selectedAgentId ? `&agentId=${selectedAgentId}` : ''}`);
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        
        // Update processing status
        const stillProcessing = data.documents.filter((doc: Document) => !doc.hasEmbeddings && doc.status !== 'error');
        setProcessingDocuments(new Set(stillProcessing.map((doc: Document) => doc.id)));
      } else {
        console.error('Failed to load documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const pollDocumentStatus = async (documentId: string) => {
    const maxAttempts = 30; // 30 attempts = 5 minutes
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setProcessingDocuments(prev => {
          const newSet = new Set(prev);
          newSet.delete(documentId);
          return newSet;
        });
        return;
      }
      
      attempts++;
      
      try {
        await loadDocuments();
        
        // Check if document is done processing
        const doc = documents.find(d => d.id === documentId);
        if (doc && (doc.hasEmbeddings || doc.status === 'error')) {
          setProcessingDocuments(prev => {
            const newSet = new Set(prev);
            newSet.delete(documentId);
            return newSet;
          });
          
          if (doc.status === 'error') {
            setError(`Processing failed for document: ${doc.errorMessage || 'Unknown error'}`);
          }
          return;
        }
        
        // Continue polling
        setTimeout(poll, 10000); // Poll every 10 seconds
      } catch (error) {
        console.error('Error polling document status:', error);
        setTimeout(poll, 10000);
      }
    };
    
    poll();
  };

  const handleFileUpload = async (file: File) => {
    if (!user || !selectedAgentId) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agentId', selectedAgentId);
      formData.append('userId', user.id);

      // Create XMLHttpRequest to track real upload progress
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
            
            // Add to processing set if not fully processed
            if (!newDoc.hasEmbeddings) {
              setProcessingDocuments(prev => new Set([...prev, newDoc.id]));
            }
            
            setDocuments(prev => [...prev, newDoc]);
            setSuccess(`Document "${file.name}" uploaded successfully!`);
            
            // Start polling for processing completion if needed
            if (!newDoc.hasEmbeddings) {
              pollDocumentStatus(newDoc.id);
            }
          
            // Reload documents to show the new upload
            await loadDocuments();
            
            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } catch (error) {
            console.error('Error parsing response:', error);
            setError('Upload completed but failed to process response');
          }
        } else {
          setError(`Upload failed with status: ${xhr.status}`);
        }
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('error', () => {
        setError('Upload failed due to network error');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('abort', () => {
        setError('Upload was cancelled');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', '/api/documents');
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }

    // Clear messages after 3 seconds
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
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
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
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

  const getFileTypeIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('text')) return '📝';
    if (type.includes('word')) return '📘';
    if (type.includes('json')) return '🔧';
    return '📎';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Document Management
            </h1>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Documents</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{documents.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">RAG Ready</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {documents.filter(doc => doc.hasEmbeddings).length}
                  </p>
                </div>
                <Brain className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Processing</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {processingDocuments.size}
                  </p>
                </div>
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="shadow-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              Upload New Documents
            </CardTitle>
            <CardDescription className="text-base">
              Enhance your AI agents with custom knowledge. Upload PDFs, text files, and more to create a powerful RAG system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="agentId" className="text-sm font-medium">Target Agent ID</Label>
                <Input
                  id="agentId"
                  placeholder="Enter the Agent ID to link documents"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  disabled={uploading}
                  className="h-12"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Documents will be available to this specific agent for RAG queries
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">Choose File</Label>
                <div className="relative">
                  <Input
                    id="file"
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    disabled={uploading || !selectedAgentId}
                    accept=".pdf,.txt,.doc,.docx,.md,.json"
                    className="h-12 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supported: PDF, TXT, DOC, DOCX, MD, JSON (Max 10MB)
                </p>
              </div>
            </div>

            {uploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading and processing...
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full h-2" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Processing document for RAG embeddings...
                </p>
              </motion.div>
            )}

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
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              Uploaded Documents ({documents.length})
            </CardTitle>
            <CardDescription>
              Manage your uploaded documents and their RAG processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Upload your first document to start building your agent's knowledge base
                </p>
                <div className="text-sm text-gray-400 dark:text-gray-500">
                  💡 Tip: Documents are processed with embeddings for powerful semantic search
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-3xl p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {getFileTypeIcon(doc.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                          {doc.filename}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            📏 {formatFileSize(doc.size)}
                          </span>
                          <span className="flex items-center gap-1">
                            📅 {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge 
                            variant={doc.status === 'ready' ? "default" : doc.status === 'error' ? "destructive" : "secondary"}
                            className="flex items-center gap-2 px-3 py-1"
                          >
                            {processingDocuments.has(doc.id) && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            {doc.status === 'ready' ? "✅ Ready" : doc.status === 'error' ? "❌ Error" : "⏳ Processing"}
                          </Badge>
                          {doc.hasEmbeddings && (
                            <Badge variant="outline" className="text-xs flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                              <Brain className="h-3 w-3" />
                              RAG Enabled
                            </Badge>
                          )}
                        </div>
                        {doc.preview && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-left max-w-md truncate italic">
                            "{doc.preview}"
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-4 flex-shrink-0"
                      title={`Delete ${doc.filename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
