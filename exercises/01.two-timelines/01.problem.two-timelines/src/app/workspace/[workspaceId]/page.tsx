import { WorkspaceView } from './WorkspaceView';

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspaceId } = await params;
  const query = await searchParams;

  // Hand the query string down as a string, so the first render already has it and the
  // page never flashes a different access decision while it works out what the URL says.
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') search.append(key, value);
    else if (Array.isArray(value)) for (const item of value) search.append(key, item);
  }

  return <WorkspaceView workspaceId={workspaceId} search={search.toString()} />;
}
