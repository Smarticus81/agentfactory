"use client";

// Gmail OAuth setup has been replaced by POS database connections for venue agents.
export default function GmailOAuthSetup() {
  return (
    <div className="p-4 text-center text-slate-500">
      <p>Email integration is not available for venue agents.</p>
      <p className="text-sm mt-1">Configure your POS database connection instead.</p>
    </div>
  );
}
