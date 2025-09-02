import GmailConnect from '@/components/gmail-connect';

export default function GmailTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Gmail Integration Test</h1>
        <GmailConnect />
      </div>
    </div>
  );
}
