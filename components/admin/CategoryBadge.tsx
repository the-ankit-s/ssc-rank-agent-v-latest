type CategoryBadgeProps = {
  category: string;
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  GEN: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-700" },
  EWS: { bg: "bg-green-100", text: "text-green-700", border: "border-green-700" },
  OBC: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-700" },
  SC: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-700" },
  ST: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-700" },
};

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const colors = categoryColors[category] || {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md border-2 ${colors.border} ${colors.bg} ${colors.text} font-bold text-sm`}
    >
      {category}
    </span>
  );
}
