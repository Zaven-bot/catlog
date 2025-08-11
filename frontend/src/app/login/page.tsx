'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login, register, user, loading, error, clearError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    login: '', // For login (username or email)
    username: '', // For registration only
    email: '', // For registration only
    password: '',
    confirmPassword: '' // For registration only
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      if (isRegistering) {
        // Registration validation
        if (formData.password !== formData.confirmPassword) {
          return; // Error will be shown below
        }
        if (formData.password.length < 6) {
          return; // Error will be shown below
        }

        const success = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        if (success) {
          router.push('/');
        }
      } else {
        // Login
        const success = await login({
          login: formData.login,
          password: formData.password
        });

        if (success) {
          router.push('/');
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

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Don't render if user is logged in (will redirect)
  if (user) {
    return null;
  }

  const getFormErrors = () => {
    const errors = [];
    if (isRegistering) {
      if (formData.password !== formData.confirmPassword) {
        errors.push('Passwords do not match');
      }
      if (formData.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }
    }
    return errors;
  };

  const formErrors = getFormErrors();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isRegistering ? 'Join CatLog' : 'Welcome Back'} 🐾
          </h2>
          <p className="text-gray-600">
            {isRegistering 
              ? 'Create your anime tracking account' 
              : 'Sign in to track your anime journey'
            }
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* API Error */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {/* Form Validation Errors */}
          {formErrors.length > 0 && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Choose a username"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="At least 6 characters"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Confirm your password"
                />
              </div>
            </>
          ) : (
            <>
              {/* Login Form */}
              <div>
                <label htmlFor="login" className="block text-sm font-medium text-gray-700">
                  Username or Email
                </label>
                <input
                  id="login"
                  name="login"
                  type="text"
                  value={formData.login}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter username or email"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your password"
                />
              </div>
            </>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || formErrors.length > 0}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="text-primary-600 hover:text-primary-500 text-sm font-medium"
          >
            {isRegistering 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;