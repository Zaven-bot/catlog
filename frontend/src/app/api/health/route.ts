// Simple health check endpoint for container monitoring
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Basic health check - verify Next.js server is responding
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'catlog-frontend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'not configured'
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      service: 'catlog-frontend'
    };

    return NextResponse.json(errorStatus, { status: 503 });
  }
}
