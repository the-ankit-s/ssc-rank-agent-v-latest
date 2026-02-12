import { getCategoryColor } from "@/lib/helpers/submission-helpers";

interface CategoryBadgeProps {
    category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
    const colors = getCategoryColor(category);

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border-2 ${colors.bg} ${colors.text} ${colors.border}`}
        >
            {category}
        </span>
    );
}
