import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-20">
            {/* Status Banner */}
            <Skeleton className="h-14 rounded-xl" />

            {/* Header */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-64 rounded-md" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-lg" />
                    <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
            </div>

            {/* 6-column KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-[88px] rounded-xl" />
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: Charts + Score/Demographics */}
                <div className="lg:col-span-2 space-y-5">
                    <Skeleton className="h-[340px] rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Skeleton className="h-[260px] rounded-xl" />
                        <Skeleton className="h-[260px] rounded-xl" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Skeleton className="h-[240px] rounded-xl" />
                        <Skeleton className="h-[280px] rounded-xl" />
                    </div>
                </div>
                {/* Right: Actions, Exams, Health, Activity */}
                <div className="space-y-5">
                    <Skeleton className="h-[240px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[350px] rounded-xl" />
                    <Skeleton className="h-[280px] rounded-xl" />
                </div>
            </div>
        </div>
    );
}
