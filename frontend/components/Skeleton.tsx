import { clsx } from 'clsx';

interface SkeletonProps { className?: string; }

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx('animate-pulse bg-zinc-800 rounded-lg', className)} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="col-span-2 h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function MenuSkeleton() {
  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <Skeleton className="h-28 rounded-none" />
          <div className="p-3 space-y-2 bg-zinc-900">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}
