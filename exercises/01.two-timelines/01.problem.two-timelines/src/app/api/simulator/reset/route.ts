import { handleReset } from '@stacknotes/lab-core/server';

export const dynamic = 'force-dynamic';

export function POST(): Response {
  return handleReset();
}
