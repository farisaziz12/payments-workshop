import { handleDeliverNow } from '@stacknotes/lab-core/server';

export const dynamic = 'force-dynamic';

export function POST(): Response {
  return handleDeliverNow();
}
