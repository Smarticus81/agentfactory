"use client";

import { SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="inline-flex items-center text-text-secondary hover:text-accent mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>
        
        <div className="text-center mb-8">
          <h1 className="text-h1 font-bold text-text-primary dark:text-text-primary-dark mb-2">
            Create your account
          </h1>
          <p className="text-body text-text-secondary dark:text-text-secondary-dark">
            Start building your personal AI assistant platform
          </p>
        </div>
        
        <div className="card-base p-8">
          <SignUp 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                formButtonPrimary: "bg-accent hover:bg-accent-hover text-white font-medium py-3 px-6 rounded-pill transition-all duration-180 ease-smooth hover:shadow-button-hover",
                formFieldInput: "min-h-[44px] rounded-DEFAULT px-4 py-3 text-body bg-panel border border-hairline text-text-primary placeholder:text-text-secondary transition-all duration-180 hover:shadow-button hover:border-accent-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
                formFieldLabel: "text-text-primary font-medium text-body",
                footerActionLink: "text-accent hover:text-accent-hover font-medium",
                dividerLine: "bg-border",
                dividerText: "text-text-secondary font-medium",
                socialButtonsBlockButton: "btn-ghost"
              }
            }}
            redirectUrl="/onboarding"
            afterSignUpUrl="/onboarding"
          />
        </div>
        
        <div className="text-center mt-6">
          <p className="text-body text-text-secondary dark:text-text-secondary-dark">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-accent hover:text-accent-hover">
              Sign in
            </Link>
          </p>
        </div>

        {/* Platform features */}
        <div className="mt-12 pt-8 border-t border-hairline">
          <p className="text-small text-text-secondary text-center mb-4">What you'll get:</p>
          <ul className="space-y-2">
            <li className="text-small text-text-secondary flex items-center">
              <span className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></span>
              Voice-first AI assistant with wake words
            </li>
            <li className="text-small text-text-secondary flex items-center">
              <span className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></span>
              Email triage and calendar management
            </li>
            <li className="text-small text-text-secondary flex items-center">
              <span className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></span>
              RAG over your personal knowledge
            </li>
            <li className="text-small text-text-secondary flex items-center">
              <span className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></span>
              Start free, upgrade anytime
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}