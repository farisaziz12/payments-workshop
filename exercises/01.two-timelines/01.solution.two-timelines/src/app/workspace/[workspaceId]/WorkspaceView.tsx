'use client';

import { Shell, WorkspaceScreen } from '@stacknotes/lab-core/ui';
import { deriveAccess } from '@/lab/accessDecision';

export function WorkspaceView({ workspaceId, search }: { workspaceId: string; search: string }) {
  return (
    <Shell title="Workspace">
      <WorkspaceScreen workspaceId={workspaceId} initialSearch={search} deriveAccess={deriveAccess} />
    </Shell>
  );
}
