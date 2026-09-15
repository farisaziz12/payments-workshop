import { handleGetEntitlement } from '@bigpdf/lab-core/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, ctx: { params: Promise<{ workspaceId: string }> }): Promise<Response> {
  const { workspaceId } = await ctx.params;
  return handleGetEntitlement(workspaceId);
}
