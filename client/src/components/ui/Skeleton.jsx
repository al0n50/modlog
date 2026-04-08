// Pulse skeleton for loading states
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`} />
  )
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden shadow-lg">
      <Skeleton className="w-full h-48 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}

export function SpecSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}