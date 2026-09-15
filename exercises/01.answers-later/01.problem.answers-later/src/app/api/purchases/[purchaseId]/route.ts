import { handleGetPurchase } from '@bigpdf/lab-core/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, ctx: { params: Promise<{ purchaseId: string }> }): Promise<Response> {
  const { purchaseId } = await ctx.params;
  return handleGetPurchase(purchaseId);
}
