/** Liefert "black" oder "white" - je nachdem, was auf der gegebenen Hintergrundfarbe
 * besser lesbar ist (WCAG-Kontrastformel). Wird für Linienfarben-Badges gebraucht, da
 * z.B. Linie 2s Gelb mit weißer Schrift unlesbar wäre, Linie 4s Blau dagegen mit
 * schwarzer Schrift. */
export function readableTextColor(hex: string): "black" | "white" {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const contrastWithWhite = (1.0 + 0.05) / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / (0.0 + 0.05);
  return contrastWithWhite >= contrastWithBlack ? "white" : "black";
}
