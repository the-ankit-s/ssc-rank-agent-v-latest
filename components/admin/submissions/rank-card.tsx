import { calculatePercentile } from "@/lib/helpers/submission-helpers";

interface RankCardProps {
    title: string;
    rank: number | null;
    total: number;
    icon?: string;
}

export function RankCard({ title, rank, total, icon = "trophy" }: RankCardProps) {
    const percentile = rank ? calculatePercentile(rank, total) : 0;

    return (
        <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 border-2 border-black rounded-lg text-yellow-600">
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div className="text-sm font-bold text-gray-700 uppercase">{title}</div>
            </div>

            <div className="space-y-2">
                <div className="text-4xl font-black text-gray-900">
                    {rank ? `#${rank}` : "N/A"}
                </div>
                <div className="text-sm font-medium text-gray-500">
                    out of {total.toLocaleString()}
                </div>
                {rank && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 border border-green-300 rounded text-green-700 text-xs font-bold">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        {percentile}th percentile
                    </div>
                )}
            </div>
        </div>
    );
}
