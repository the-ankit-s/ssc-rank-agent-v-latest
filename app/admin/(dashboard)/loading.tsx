export default function Loading() {
    return (
        <div className="flex flex-col space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 bg-white rounded-xl border-2 border-gray-200 h-32">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                            <div className="w-16 h-6 bg-gray-200 rounded"></div>
                        </div>
                        <div className="w-24 h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="w-32 h-4 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border-2 border-gray-200 h-96">
                    <div className="w-40 h-6 bg-gray-200 rounded mb-6"></div>
                    <div className="h-64 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="bg-white p-6 rounded-xl border-2 border-gray-200 h-96">
                    <div className="w-40 h-6 bg-gray-200 rounded mb-6"></div>
                    <div className="flex justify-center items-center h-64">
                        <div className="w-48 h-48 rounded-full bg-gray-200"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
