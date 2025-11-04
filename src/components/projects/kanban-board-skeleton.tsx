import { Skeleton } from "@/components/ui/skeleton";

export function KanbanBoardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className='mb-4 flex flex-wrap justify-between items-center gap-4'>
        <Skeleton className="h-10 w-48" />
        <div className='flex items-center gap-2'>
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="flex h-full min-w-max gap-4 pb-4 overflow-x-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex w-80 shrink-0 flex-col rounded-lg">
            <div className="p-3">
              <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 rounded-b-lg bg-muted/50">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
