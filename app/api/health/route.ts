import { connectToDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    return Response.json({ status: 'healthy' }, { status: 200 });
  } catch (error) {
    return Response.json({ status: 'unhealthy' }, { status: 503 });
  }
}
