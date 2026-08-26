import TenantCards from "./TenantCards";

type workspace = {
  id: string;
  logo?: string;
  name: string;
  slug: string;
  role: string;
  members: number;
};

interface WorkspacesProps {
  activeWorkspaces: number;
  workspaces: workspace[];
}

const Workspaces = ({ activeWorkspaces, workspaces }: WorkspacesProps) => {
  if (!workspaces.length) {
    return (
      <section className="my-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          No workspaces yet
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a workspace to get started and manage your team.
        </p>
      </section>
    );
  }

  return (
    <section className="my-6 p-2">
      <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Your Workspaces
        </h2>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {activeWorkspaces} Active
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 p-2 sm:grid-cols-2 xl:grid-cols-3">
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
