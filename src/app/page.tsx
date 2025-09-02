"use client";

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Brain, Mic, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/25 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Smarticus
              </span>
            </motion.div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="nav-item-premium">
                Home
              </Link>
              <Link href="/features" className="nav-item-premium">
                Features
              </Link>
              <Link href="/pricing" className="nav-item-premium">
                Pricing
              </Link>
              <Link href="/docs" className="nav-item-premium">
                Docs
              </Link>
              <Link href="/support" className="nav-item-premium">
                Support
              </Link>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              {isSignedIn ? (
                <Link 
                  href="/dashboard" 
                  className="btn-premium-compact"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    href="/sign-in" 
                    className="hidden md:block nav-item-premium"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/dashboard" 
                    className="btn-premium-compact"
                  >
                    Get Started
                  </Link>
                </>
              )}
              
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-slate-600" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-600" />
                )}
              </button>
            </motion.div>
          </div>
          
          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl"
            >
              <div className="px-6 py-4 space-y-3">
                <Link href="/" className="block py-2 text-slate-700 hover:text-orange-600 font-medium">
                  Home
                </Link>
                <Link href="/features" className="block py-2 text-slate-700 hover:text-orange-600 font-medium">
                  Features
                </Link>
                <Link href="/pricing" className="block py-2 text-slate-700 hover:text-orange-600 font-medium">
                  Pricing
                </Link>
                <Link href="/docs" className="block py-2 text-slate-700 hover:text-orange-600 font-medium">
                  Docs
                </Link>
                <Link href="/support" className="block py-2 text-slate-700 hover:text-orange-600 font-medium">
                  Support
                </Link>
                {!isSignedIn && (
                  <Link href="/sign-in" className="block py-2 text-slate-700 hover:text-orange-600 font-medium">
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Compact Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="hero-title-premium mb-6">
              Build your own
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent block">
                Voice Assistant
              </span>
            </h1>
            
            <p className="hero-subtitle-premium mb-12">
              Create intelligent voice assistants that understand your schedule.<br />
              <span className="text-slate-600">Simple, secure, and surprisingly smart.</span>
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center mt-8"
            >
              <Link 
                href="/dashboard" 
                className="btn-premium-primary group"
              >
                Create Your Assistant
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Compact Features Grid */}
      <section className="py-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Intelligent Understanding",
                description: "Learns your family's patterns and priorities over time."
              },
              {
                icon: Mic,
                title: "Natural Voice Interface",
                description: "Speak naturally. No commands or complicated syntax."
              },
              {
                icon: Sparkles,
                title: "Beautifully Simple",
                description: "Zen-like design that disappears into your routine."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="premium-feature-card"
              >
                <div className="premium-feature-icon">
                  <feature.icon className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="premium-feature-title">
                  {feature.title}
                </h3>
                <p className="premium-feature-description">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-8 px-4 border-t border-slate-200/60">
        <div className="container text-center">
          <div className="flex-center space-x-3 mb-3">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 shadow-sm flex-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-slate-700 to-slate-500 bg-clip-text text-transparent">Smarticus</span>
          </div>
          <p className="text-sm text-slate-500">
            © 2025 Smarticus. Crafted with care for modern families.
          </p>
        </div>
      </footer>
    </div>
  );
}