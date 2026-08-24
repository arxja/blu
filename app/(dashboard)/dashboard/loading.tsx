import TenantCardsSkeleton from "@/components/skeletons/TenantCardsSkeleton";

const Loading = () => {
  return (
    <div className="pt-20 pb-24 md:pt-20 md:pb-32">
      <TenantCardsSkeleton />
    </div>
  );
};

export default Loading;
