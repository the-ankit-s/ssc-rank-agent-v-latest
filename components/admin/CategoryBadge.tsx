import { getCategoryColor } from "@/lib/helpers/submission-helpers";

type CategoryBadgeProps = {
  category: string;
};

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const colors = getCategoryColor(category);

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md border-2 ${colors.border} ${colors.bg} ${colors.text} font-bold text-sm`}
    >
      {category}
    </span>
  );
}
