'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login, register, user, loading, error, clearError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && typeof user === 'object' && user.id && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      if (isRegistering) {
        const success = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        if (success) {
          console.log('Registration successful, user should be set in auth hook');
          // Don't redirect immediately - let the auth state update first
          // The useEffect will handle the redirect when user is set
        }
      } else {
        const success = await login({
          login: formData.login,
          password: formData.password
        });

        if (success) {
          console.log('Login successful, user should be set in auth hook');
          // Don't redirect immediately - let the auth state update first
          // The useEffect will handle the redirect when user is set
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    clearError();
    setFormData({
      login: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  const showLoginForm = () => {
    setShowForm(true);
    setIsRegistering(false);
  };

  const showRegisterForm = () => {
    setShowForm(true);
    setIsRegistering(true);
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Don't render if user is logged in (will redirect)
  if (user && typeof user === 'object' && user.id) {
    return null;
  }

  const getFormErrors = () => {
    const errors = [];
    if (isRegistering) {
      if (formData.password !== formData.confirmPassword) {
        errors.push('Passwords do not match');
      }
      if (formData.password.length > 0 && formData.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }
    }
    return errors;
  };

  const formErrors = getFormErrors();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {!showForm ? (
        // Landing Page View
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
          {/* Hero Section */}
          <div className="text-center mb-12 max-w-4xl mx-auto">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 pb-2 leading-tight">
              🐾 CatLog
            </h1>
            <p className="text-2xl text-gray-700 mb-4">
              Your anime companion with a virtual cat twist
            </p>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Track your anime journey and celebrate your progress with hilarious cat memes! 
              The more anime you watch, the funnier the cat memes become.
            </p>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={showRegisterForm}
                className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg transform hover:scale-105"
              >
                🚀 Start Your Journey
              </button>
              <button
                onClick={showLoginForm}
                className="px-8 py-4 text-lg font-semibold text-purple-600 bg-white border-2 border-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-200 shadow-lg transform hover:scale-105"
              >
                📝 I Have an Account
              </button>
            </div>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-8 bg-white/70 backdrop-blur-sm rounded-3xl border border-white/30 shadow-xl">
              <div className="text-6xl mb-4">📺</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Track Your Anime</h3>
              <p className="text-gray-600 leading-relaxed">
                Keep track of what you're watching, completed, and planning to watch. 
                Never lose track of your anime journey again.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white/70 backdrop-blur-sm rounded-3xl border border-white/30 shadow-xl">
              <div className="text-6xl mb-4">😺</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Cat Memes</h3>
              <p className="text-gray-600 leading-relaxed">
                Celebrate your anime watching habits with custom cat memes. 
                Watch the memes get more exciting as you discover new shows!
              </p>
            </div>
            
            <div className="text-center p-8 bg-white/70 backdrop-blur-sm rounded-3xl border border-white/30 shadow-xl">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Statistics & Insights</h3>
              <p className="text-gray-600 leading-relaxed">
                Get detailed insights about your anime preferences, watching patterns, 
                and personal ratings with beautiful charts.
              </p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-4">Ready to meet your virtual cat companion?</p>
            <button
              onClick={showRegisterForm}
              className="inline-flex items-center px-6 py-3 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
            >
              Join CatLog Today 🎉
            </button>
          </div>
        </div>
      ) : (
        // Login/Register Form View
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            {/* Back Button */}
            <button
              onClick={() => setShowForm(false)}
              className="mb-6 text-purple-600 hover:text-purple-700 flex items-center gap-2 transition-colors"
            >
              ← Back to Welcome
            </button>

            {/* Form Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {isRegistering ? 'Join CatLog' : 'Welcome Back'} 🐾
                </h2>
                <p className="text-gray-600">
                  {isRegistering 
                    ? 'Create your anime tracking account' 
                    : 'Sign in to continue your anime journey'
                  }
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* API Error */}
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                
                {/* Form Validation Errors */}
                {formErrors.length > 0 && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    <ul className="list-disc list-inside space-y-1">
                      {formErrors.map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {isRegistering ? (
                  <>
                    {/* Registration Form */}
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Choose a username"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="At least 6 characters"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Login Form */}
                    <div>
                      <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-1">
                        Username or Email
                      </label>
                      <input
                        id="login"
                        name="login"
                        type="text"
                        value={formData.login}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Enter username or email"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Enter your password"
                      />
                    </div>
                  </>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting || formErrors.length > 0}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting 
                    ? (isRegistering ? 'Creating Account...' : 'Signing In...') 
                    : (isRegistering ? 'Create Account' : 'Sign In')
                  }
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors"
                >
                  {isRegistering 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;