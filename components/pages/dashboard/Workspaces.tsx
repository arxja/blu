import TenantCards from "./TenantCards";

type workspace = {
  logo: string;
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
  return (
    <section className="my-4 p-2">
      <div className="flex justify-between border-b mb-4">
        <h2 className="text-lg">Your Workspaces</h2>
        <p>{activeWorkspaces} Active</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-2">
        {workspaces.map((workspace) => (
          <TenantCards
            tenant={workspace}
            key={workspace.slug || workspace.name}
          />
        ))}
      </div>
    </section>
  );
};

export default Workspaces;
