import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CatLog - Your Anime Companion',
  description: 'Track anime with your virtual cat companion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-gray-800 text-white p-4">
            <h1 className="text-2xl font-bold">🐾 CatLog</h1>
            <nav className="mt-2">
              <a href="/" className="text-gray-300 hover:text-white mr-4">Home</a>
              <a href="/anime" className="text-gray-300 hover:text-white mr-4">Browse</a>
              <a href="/search" className="text-gray-300 hover:text-white mr-4">Search</a>
              <a href="/my-list" className="text-gray-300 hover:text-white mr-4">My List</a>
              <a href="/dashboard" className="text-gray-300 hover:text-white mr-4">Dashboard</a>
              <a href="/login" className="text-gray-300 hover:text-white">Login</a>
            </nav>
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