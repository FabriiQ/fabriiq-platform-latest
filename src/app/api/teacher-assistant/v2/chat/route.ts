import { NextRequest } from 'next/server';
import { handleStreamingChat } from '@/features/teacher-assistant-v2/server/streaming-route';

export async function POST(request: NextRequest) {
  return handleStreamingChat(request);
}
