import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-20">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                    <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
                    <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
            </div>

            {/* Controls Skeleton */}
            <div className="bg-white rounded-xl border border-gray-100 p-3 mb-6">
                <div className="flex justify-between gap-3">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Dashboard Content Skeleton */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mb-3" />
                            <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse mb-6" />
                            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
