import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Users } from "lucide-react";
import Image from "next/image";

interface TenantCardsProps {
  tenant: {
    id: string;
    logo?: string;
    name: string;
    slug: string;
    role: string;
    members: number;
  };
}

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-success/15 text-success border-success/30",
  admin: "bg-info/15 text-info border-info/30",
  analyst: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  viewer: "bg-border-light text-text-tertiary border-border-default",
};

const TenantCards = ({ tenant }: TenantCardsProps) => {
  const formattedRole = tenant.role
    ? tenant.role.charAt(0).toUpperCase() + tenant.role.slice(1)
    : "Member";

  const badgeClass =
    ROLE_STYLES[tenant.role?.toLowerCase()] ?? ROLE_STYLES.viewer;

  return (
    <Card className="flex flex-col rounded-2xl border border-border-light bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border-default hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-0 pb-4">
        <div className="flex items-center gap-3">
          {tenant.logo ? (
            <Image
              src={tenant.logo}
              alt={tenant.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-border-light"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-lg font-bold text-primary-600 ring-1 ring-primary-500/20">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <Badge
          variant="outline"
          className={`border ${badgeClass} rounded-full px-3 py-0.5 text-xs font-medium`}
        >
          {formattedRole}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <CardTitle className="text-xl font-semibold text-text-primary">
          {tenant.name}
        </CardTitle>

        <CardDescription className="mt-2 truncate text-sm text-text-tertiary">
          {`${tenant.slug}.blu.so`}
        </CardDescription>
      </CardContent>

      <CardFooter className="mt-4 block p-0">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Users size={16} className="text-text-tertiary" />
          <span className="tabular-nums">
            {tenant.members} {tenant.members === 1 ? "Member" : "Members"}
          </span>
        </div>

        <a
          href={`/api/workspaces/${tenant.id}/launch`}
          className="group mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span>Launch Workspace</span>
          <ArrowRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </a>
      </CardFooter>
    </Card>
  );
};

export default TenantCards;
