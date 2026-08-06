import type { RouteData } from "../types/data";
import { readableTextColor } from "../lib/color";

export default function LineBadge({ route }: { route: Pick<RouteData, "shortName" | "color"> }) {
  return (
    <span
      className="line-badge"
      style={{ backgroundColor: `#${route.color}`, color: readableTextColor(route.color) }}
    >
      {route.shortName}
    </span>
  );
}
