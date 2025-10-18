'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Search, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import './auth.css';

export default function Auth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: fullName || 'User',
            });

          if (profileError) console.error('Profile creation error:', profileError);
          router.push('/dashboard');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      {/* Background Elements */}
      <div className="background-elements">
        <div className="floating-element element-1"></div>
        <div className="floating-element element-2 floating-delay-1"></div>
        <div className="floating-element element-3 floating-delay-2"></div>
        <div className="floating-element element-4 floating-delay-3"></div>
      </div>

      <div className="auth-content">
        {/* Logo and Title */}
        <div className="logo-section">
          <div className="logo-container">
            
    
          </div>
          <h1 className="app-title">AEO Tracker</h1>
          <p className="app-subtitle">AI Search Intelligence Platform</p>
        </div>

        {/* Auth Form */}
        <div className="auth-form-container">
          <div className="form-header">
            <h2 className="form-title">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="form-subtitle">
              {isSignUp ? 'Start your AI visibility journey' : 'Continue tracking your AI presence'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {isSignUp && (
              <div className="form-group">
                <label className="form-label">FULL NAME</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="you@company.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">PASSWORD</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-field password-input"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle className="error-icon" />
                <p className="error-text">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary auth-button"
            >
              {loading ? (
                <span className="button-loading">
                  <div className="loading-spinner"></div>
                  <span>Processing...</span>
                </span>
              ) : (
                <span className="button-content">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <Sparkles className="button-icon" />
                </span>
              )}
            </button>
          </form>

          <div className="auth-switch">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setEmail('');
                setPassword('');
                setFullName('');
              }}
              className="switch-button"
            >
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <span className="switch-link">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="auth-footer">
          © 2025 AEO Tracker. All rights reserved.
        </p>
      </div>
    </div>
  );
}