import type { Category } from "../types";
import { AppIcon } from "./AppIcon";

export function CategoryIcon({
  category,
  size = 42,
}: {
  category?: Category;
  size?: number;
}) {
  const color = category?.color ?? "#8A93A5";
  return (
    <span
      className="category-icon"
      style={{
        width: size,
        height: size,
        color,
        backgroundColor: `${color}18`,
      }}
    >
      <AppIcon name={category?.icon ?? "Ellipsis"} size={size * 0.46} />
    </span>
  );
}
