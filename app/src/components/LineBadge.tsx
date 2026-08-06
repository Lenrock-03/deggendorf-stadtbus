import type { RouteData } from "../types/data";

export default function LineBadge({ route }: { route: Pick<RouteData, "shortName" | "color"> }) {
  return (
    <span className="line-badge" style={{ backgroundColor: `#${route.color}` }}>
      {route.shortName}
    </span>
  );
}
