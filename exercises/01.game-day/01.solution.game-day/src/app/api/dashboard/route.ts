import { handlers } from '@/server';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return handlers.dashboard();
}
