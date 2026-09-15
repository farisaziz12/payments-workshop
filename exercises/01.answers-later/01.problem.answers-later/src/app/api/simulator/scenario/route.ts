import { handleSetScenario } from '@bigpdf/lab-core/server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return handleSetScenario(request);
}
