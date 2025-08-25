'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const Navigation = () => {
  const { user, logout, loading } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Enhanced debug logging for auth state changes
  useEffect(() => {
    console.log('[NAVIGATION] Auth state changed:', { 
      user: user?.username || 'Not logged in', 
      loading, 
      timestamp: new Date().toISOString() 
    });
  }, [user, loading]);

  // Additional debug log on every render
  console.log('[NAVIGATION] Render - Auth state:', { 
    user: user?.username || 'Not logged in', 
    loading, 
    timestamp: new Date().toISOString() 
  });

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <header className="bg-gray-800 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🐾 CatLog</h1>
          <nav className="flex space-x-4">
            <a href="/" className="text-gray-300 hover:text-white">Home</a>
            {user && !loading && (
              <>
                <a href="/anime" className="text-gray-300 hover:text-white">Browse</a>
                <a href="/search" className="text-gray-300 hover:text-white">Search</a>
                <a href="/my-list" className="text-gray-300 hover:text-white">My List</a>
                <a href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</a>
              </>
            )}
            {!loading && (
              user ? (
                <button 
                  onClick={handleLogoutClick}
                  className="text-gray-300 hover:text-white"
                >
                  Logout
                </button>
              ) : (
                <a href="/login" className="text-gray-300 hover:text-white">Login</a>
              )
            )}
          </nav>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Logout
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout? You'll need to login again to access your anime list and dashboard.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelLogout}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
