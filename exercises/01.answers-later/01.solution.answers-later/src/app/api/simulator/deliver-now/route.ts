import { handleDeliverNow } from '@bigpdf/lab-core/server';

export const dynamic = 'force-dynamic';

export function POST(): Response {
  return handleDeliverNow();
}
