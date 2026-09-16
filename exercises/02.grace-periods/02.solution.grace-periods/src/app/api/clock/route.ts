import { handlers } from '@/server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return handlers.advance(request);
}
