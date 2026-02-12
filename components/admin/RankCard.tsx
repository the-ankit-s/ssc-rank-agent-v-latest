type RankCardProps = {
  title: string;
  rank: number | null;
  totalCandidates: number;
  percentile?: number | null;
  color?: string;
};

export default function RankCard({
  title,
  rank,
  totalCandidates,
  percentile,
  color = "blue",
}: RankCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; badge: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-500" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", badge: "bg-purple-500" },
    green: { bg: "bg-green-50", text: "text-green-600", badge: "bg-green-500" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", badge: "bg-orange-500" },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`${colors.bg} p-6 rounded-xl border-2 border-black shadow-brutal`}>
      <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">{title}</h3>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-4xl font-black ${colors.text}`}>
          {rank ? `#${rank.toLocaleString()}` : "-"}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        out of {totalCandidates.toLocaleString()} candidates
      </p>
      {percentile !== null && percentile !== undefined && (
        <div
          className={`inline-flex items-center px-3 py-1 ${colors.badge} text-white font-bold text-xs rounded-full`}
        >
          {percentile.toFixed(2)}%ile
        </div>
      )}
    </div>
  );
}
