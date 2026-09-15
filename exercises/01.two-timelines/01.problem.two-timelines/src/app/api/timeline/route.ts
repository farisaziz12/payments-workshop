import { handleGetTimeline } from '@stacknotes/lab-core/server';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return handleGetTimeline();
}
