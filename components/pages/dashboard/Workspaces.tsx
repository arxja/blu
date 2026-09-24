import TenantCards from "./TenantCards";

type Workspace = {
  id: string;
  logo?: string;
  name: string;
  slug: string;
  role: string;
  members: number;
};

interface WorkspacesProps {
  activeWorkspaces: number;
  workspaces: Workspace[];
}

const Workspaces = ({ activeWorkspaces, workspaces }: WorkspacesProps) => {
  if (!workspaces.length) {
    return (
      <section className="my-6 rounded-2xl border border-dashed border-border-default bg-surface-elevated p-8 text-center shadow-sm transition-colors duration-300">
        <h2 className="text-xl font-semibold text-text-primary">
          No workspaces yet
        </h2>
        <p className="mt-2 text-sm text-text-tertiary">
          Create a workspace to get started and manage your team.
        </p>
      </section>
    );
  }

  return (
    <section className="my-6">
      <div className="mb-5 flex items-center justify-between border-b border-border-light pb-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Your Workspaces
        </h2>
        <p className="rounded-full border border-border-light bg-surface-elevated px-3 py-1 text-sm font-medium text-text-secondary tabular-nums">
          {activeWorkspaces} Active
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((workspace) => (
          <TenantCards
            tenant={workspace}
            key={workspace.id || workspace.slug || workspace.name}
          />
        ))}
      </div>
    </section>
  );
};

export default Workspaces;
