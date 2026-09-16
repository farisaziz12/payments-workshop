import { handlers } from '@/server';

export const dynamic = 'force-dynamic';

export function POST(): Response {
  return handlers.reset();
}
