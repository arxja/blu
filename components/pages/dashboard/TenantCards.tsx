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
import Link from "next/link";

interface TenantCardsProps {
  tenant: {
    logo: string;
    name: string;
    slug: string;
    role: string;
    members: number;
  };
}

const TenantCards = ({ tenant }: TenantCardsProps) => {
  const chooseBadgeColor = (role: string) => {
    const rle = role.toLowerCase();
    switch (rle) {
      case "owner":
        return "bg-green-500 text-white p-3";
      case "admin":
        return "bg-blue-500 text-white p-3";
      case "user":
        return "bg-gray-500 text-white p-3";
      default:
        return "bg-gray-500 text-white p-3";
    }
  };
  return (
    <Card className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition flex flex-col ">
      <CardHeader className="flex flex-row justify-between items-center">
        <div className="flex flex-row justify-between">
          {tenant.logo ? (
            <Image
              src={tenant.logo}
              alt={tenant.name}
              className="w-16 h-16 object-contain"
            />
          ) : (
            <div className="bg-gray-200 border border-gray-300 rounded-lg w-16 h-16 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {tenant.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <Badge
          variant={"outline"}
          className={`${chooseBadgeColor(tenant.role)}`}
        >
          {tenant.role}
        </Badge>
      </CardHeader>
      <CardContent className="gap-0">
        <CardTitle className="text-2xl">{tenant.name}</CardTitle>
        <div className="flex items-center">
          <CardDescription className="text-lg text-gray-500">{`${tenant.slug}.blu.so`}</CardDescription>
        </div>
      </CardContent>
      <CardFooter className="block">
        <div className="flex flex-row gap-2">
          <div className="flex flex-row items-center gap-1">
            <Users size={16} />
            <span>{tenant.members} Members</span>
          </div>
        </div>
        <div className="flex flex-row items-center justify-center gap-1 rounded-lg bg-gray-200 p-2 mt-2">
          <Link
            className="flex flex-row items-center"
            href={`${tenant.slug}.blu.so`}
          >
            Launch Workspace
          </Link>
          <ArrowRight size={16} />
        </div>
      </CardFooter>
    </Card>
  );
};

export default TenantCards;
