import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { channels } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    channels: {
      total: number;
      connected: number;
      disconnected: number;
    };
    api: boolean;
  };
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Check database connectivity
    const dbHealthy = await checkDatabaseHealth();

    // Check channel status
    const channelStatus = await getChannelHealth();

    // Check API response time
    const responseTime = Date.now() - startTime;

    const healthStatus: HealthStatus = {
      status: determineOverallHealth(dbHealthy, channelStatus),
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy,
        channels: channelStatus,
        api: true,
      },
      metrics: {
        uptime: process.uptime(),
        responseTime,
        errorRate: calculateErrorRate(),
      },
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error: unknown) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      services: {
        database: false,
        channels: { total: 0, connected: 0, disconnected: 0 },
        api: false,
      },
      metrics: {
        uptime: process.uptime(),
        responseTime: 0,
        errorRate: 100,
      },
    }, { status: 503 });
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await db.select({ count: channels.id }).from(channels).limit(1);
    return result.length > 0;
  } catch (error: unknown) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function getChannelHealth(): Promise<{ total: number; connected: number; disconnected: number }> {
  try {
    const allChannels = await db.select().from(channels);
    const total = allChannels.length;
    const connected = allChannels.filter(c => c.isConnected).length;
    const disconnected = total - connected;

    return { total, connected, disconnected };
  } catch (error: unknown) {
    console.error('Channel health check failed:', error);
    return { total: 0, connected: 0, disconnected: 0 };
  }
}

function determineOverallHealth(dbHealthy: boolean, channelStatus: { total: number; connected: number; disconnected: number }): 'healthy' | 'degraded' | 'unhealthy' {
  if (!dbHealthy) return 'unhealthy';

  const { total, connected } = channelStatus;

  if (total === 0) return 'degraded';
  if (connected === total) return 'healthy';
  if (connected / total >= 0.5) return 'degraded';

  return 'unhealthy';
}

function calculateErrorRate(): number {
  // This would typically track actual error rates from monitoring
  // For now, return a mock value
  return Math.random() * 5;
}