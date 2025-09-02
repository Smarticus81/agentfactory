'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trash2, Upload, FileText, AlertCircle, CheckCircle, Loader2, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Document Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload and manage documents for RAG-enhanced voice agents
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Upload documents to enhance your voice agents with custom knowledge.
            Supported formats: PDF, TXT, DOC, DOCX, MD, JSON (Max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="agentId">Select Agent</Label>
              <Input
                id="agentId"
                placeholder="Enter Agent ID"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div>
              <Label htmlFor="file">Choose File</Label>
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
              />
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading and processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
              >
                <CheckCircle className="h-4 w-4" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
          <CardDescription>
            Manage your uploaded documents and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload your first document to get started with RAG</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {getFileTypeIcon(doc.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge 
                            variant={doc.status === 'ready' ? "default" : doc.status === 'error' ? "destructive" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            {processingDocuments.has(doc.id) && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            {doc.status === 'ready' ? "Ready" : doc.status === 'error' ? "Error" : "Processing"}
                          </Badge>
                          {doc.hasEmbeddings && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              RAG
                            </Badge>
                          )}
                        </div>
                      </div>
                      {doc.preview && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-md truncate">
                          {doc.preview}
                        </p>
                      )}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
