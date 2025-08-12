'use client';

import './globals.css'
import { useAuth } from '../hooks/useAuth';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-gray-800 text-white p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">🐾 CatLog</h1>
              <nav className="flex space-x-4">
                <a href="/" className="text-gray-300 hover:text-white">Home</a>
                <a href="/anime" className="text-gray-300 hover:text-white">Browse</a>
                <a href="/search" className="text-gray-300 hover:text-white">Search</a>
                <a href="/my-list" className="text-gray-300 hover:text-white">My List</a>
                <a href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</a>
                {user ? (
                  <button 
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-white"
                  >
                    Logout
                  </button>
                ) : (
                  <a href="/login" className="text-gray-300 hover:text-white">Login</a>
                )}
              </nav>
            </div>
          </header>
          <main className="flex-grow p-4">
            {children}
          </main>
          <footer className="bg-gray-800 text-white p-4 text-center">
            <p>© 2025 CatLog. All rights reserved. 🐱</p>
          </footer>
        </div>
      </body>
    </html>
  )
}