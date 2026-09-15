import { handleGetTimeline } from '@bigpdf/lab-core/server';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return handleGetTimeline();
}
