/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.myanimelist.net'],
  },
  // Enable standalone output for optimized Docker containers
  output: 'standalone'
};

module.exports = nextConfig;