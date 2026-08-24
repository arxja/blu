import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TenantCardsSkeletonProps {
  count?: number;
}

const TenantCardsSkeleton = ({ count = 3 }: TenantCardsSkeletonProps) => {
  return (
    <section className="my-6 p-2">
      <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 p-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <Card
            key={index}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-3 p-0 pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </CardHeader>

            <CardContent className="flex-1 p-0">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="mt-2 h-4 w-28 rounded-md" />
            </CardContent>

            <CardFooter className="mt-4 block p-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <Skeleton className="mt-4 h-10 w-full rounded-xl" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default TenantCardsSkeleton;
