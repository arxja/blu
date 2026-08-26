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

const TenantCards = ({ tenant }: TenantCardsProps) => {
  const formattedRole = tenant.role
    ? tenant.role.charAt(0).toUpperCase() + tenant.role.slice(1)
    : "Member";

  const chooseBadgeColor = (role: string) => {
    const normalizedRole = role.toLowerCase();

    switch (normalizedRole) {
      case "owner":
        return "bg-emerald-500 text-white";
      case "admin":
        return "bg-blue-500 text-white";
      case "analyst":
        return "bg-violet-500 text-white";
      case "viewer":
        return "bg-slate-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  return (
    <Card className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-0 pb-4">
        <div className="flex items-center gap-3">
          {tenant.logo ? (
            <Image
              src={tenant.logo}
              alt={tenant.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-lg font-bold text-slate-700 ring-1 ring-slate-300">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <Badge variant="outline" className={chooseBadgeColor(tenant.role)}>
          {formattedRole}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {tenant.name}
        </CardTitle>

        <CardDescription className="mt-2 text-sm text-slate-500">
          {`${tenant.slug}.blu.so`}
        </CardDescription>
      </CardContent>

      <CardFooter className="mt-4 block p-0">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users size={16} />
          <span>{tenant.members} Members</span>
        </div>

        <a
          href={`/api/workspaces/${tenant.id}/launch`}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          <span>Launch Workspace</span>
          <ArrowRight size={16} />
        </a>
      </CardFooter>
    </Card>
  );
};

export default TenantCards;
