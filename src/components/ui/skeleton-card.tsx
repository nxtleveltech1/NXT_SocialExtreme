import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

/**
 * Channel card skeleton for loading states
 */
export function ChannelCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden", className)}>
      <div className="p-6 animate-pulse">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="h-6 w-24 bg-gray-100 rounded-full" />
        </div>

        {/* Diagnostics Grid */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-50 p-2 rounded-lg">
              <div className="h-3 w-12 bg-gray-200 rounded mx-auto mb-2" />
              <div className="h-4 w-8 bg-gray-200 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-50 p-3 rounded-lg">
              <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="h-5 w-20 bg-blue-100 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-28 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

/**
 * Multiple channel cards skeleton
 */
export function ChannelListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(count)].map((_, i) => (
        <ChannelCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Generic skeleton for lists
 */
export function ListItemSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn("flex items-center gap-4 p-4 animate-pulse", className)}>
      <div className="w-10 h-10 bg-gray-200 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-100 rounded" />
      </div>
      <div className="h-8 w-20 bg-gray-200 rounded" />
    </div>
  );
}

/**
 * Stat card skeleton
 */
export function StatCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-white rounded-xl p-4 border border-gray-100 animate-pulse", className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>
      <div className="h-8 w-16 bg-gray-200 rounded mb-1" />
      <div className="h-3 w-24 bg-gray-100 rounded" />
    </div>
  );
}

export default ChannelCardSkeleton;

