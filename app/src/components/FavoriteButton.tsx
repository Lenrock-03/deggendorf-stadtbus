import { toggleFavorite, useIsFavorite } from "../lib/favorites";
import Icon from "./Icon";

export default function FavoriteButton({ stopId }: { stopId: string }) {
  const isFav = useIsFavorite(stopId);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(stopId);
      }}
      aria-label={isFav ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      aria-pressed={isFav}
      className="favorite-button"
    >
      <Icon name={isFav ? "starFilled" : "starOutline"} size={20} />
    </button>
  );
}
