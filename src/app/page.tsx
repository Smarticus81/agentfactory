"use client";

import { motion } from 'framer-motion';
import { ArrowRight, Mic, Zap, BarChart3, Menu, X } from 'lucide-react';
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Bevpro Studio
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-slate-600 hover:text-violet-600 font-medium transition-colors">Home</Link>
              <Link href="/dashboard" className="text-slate-600 hover:text-violet-600 font-medium transition-colors">Dashboard</Link>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              {isSignedIn ? (
                <Link href="/dashboard" className="bg-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-700 transition-colors">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" className="hidden md:block text-slate-600 hover:text-violet-600 font-medium transition-colors">
                    Sign In
                  </Link>
                  <Link href="/dashboard" className="bg-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-700 transition-colors">
                    Get Started
                  </Link>
                </>
              )}

              <button
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
              </button>
            </motion.div>
          </div>

          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl"
            >
              <div className="px-6 py-4 space-y-3">
                <Link href="/" className="block py-2 text-slate-700 hover:text-violet-600 font-medium">Home</Link>
                <Link href="/dashboard" className="block py-2 text-slate-700 hover:text-violet-600 font-medium">Dashboard</Link>
                {!isSignedIn && (
                  <Link href="/sign-in" className="block py-2 text-slate-700 hover:text-violet-600 font-medium">Sign In</Link>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Build Voice Agents
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent block">
                for Your Venue
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-12">
              Create AI-powered voice assistants for restaurants, bars, and event venues.<br />
              <span className="text-slate-500">Manage tabs, take orders, and run your POS by voice.</span>
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center mt-8"
            >
              <Link
                href="/dashboard"
                className="bg-violet-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-violet-700 transition-colors flex items-center group"
              >
                Create Your Venue Agent
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Mic,
                title: "Voice-First POS",
                description: "Staff manage tabs, orders, and payments entirely by voice. Hands-free operations."
              },
              {
                icon: Zap,
                title: "Multi-Venue Builder",
                description: "Design and deploy unique voice agents for each of your venues from one dashboard."
              },
              {
                icon: BarChart3,
                title: "Real-Time Analytics",
                description: "Track sales, popular items, and agent interactions across all your venues."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200/60">
        <div className="container text-center">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-sm flex items-center justify-center">
              <Mic className="w-3 h-3 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-slate-700 to-slate-500 bg-clip-text text-transparent">Bevpro Studio</span>
          </div>
          <p className="text-sm text-slate-500">
            &copy; 2025 Bevpro Studio. Voice-powered venue management.
          </p>
        </div>
      </footer>
    </div>
  );
}
