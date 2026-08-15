"""Erzeugt die Icon-/Splash-Quellbilder für @capacitor/assets (npx @capacitor/assets
generate --android liest diesen Ordner). Einmalig ausgeführt, Ergebnis-PNGs werden
versioniert. Gleiche Bus-Icon-Zeichnung wie app/public/icons/generate_icons.py, nur größer
und zusätzlich als Vordergrund/Hintergrund-Paar fürs adaptive Android-Icon."""
from PIL import Image, ImageDraw

BLUE = (29, 78, 216)  # #1d4ed8, passend zu --color-accent / theme_color
WHITE = (255, 255, 255)


def draw_bus(draw, cx, cy, scale, color=WHITE, window_color=BLUE):
    w, h = 62 * scale, 44 * scale
    x0, y0 = cx - w / 2, cy - h / 2 - 4 * scale
    x1, y1 = cx + w / 2, cy + h / 2 - 4 * scale
    r = 10 * scale
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=color)
    win_y0 = y0 + 8 * scale
    win_y1 = y0 + 22 * scale
    win_w = 12 * scale
    gap = 6 * scale
    n = 3
    total_w = n * win_w + (n - 1) * gap
    wx = cx - total_w / 2
    for _ in range(n):
        draw.rounded_rectangle([wx, win_y0, wx + win_w, win_y1], radius=2 * scale, fill=window_color)
        wx += win_w + gap
    wheel_r = 7 * scale
    wheel_y = y1 - 2 * scale
    for wx in (x0 + 14 * scale, x1 - 14 * scale):
        draw.ellipse([wx - wheel_r, wheel_y - wheel_r, wx + wheel_r, wheel_y + wheel_r], fill=window_color)
        inner = wheel_r * 0.4
        draw.ellipse([wx - inner, wheel_y - inner, wx + inner, wheel_y + inner], fill=color)


SIZE = 1024

# icon.png: normales quadratisches Icon (iOS, Fallback), voller Blau-Hintergrund + Bus mittig.
icon = Image.new("RGBA", (SIZE, SIZE), BLUE + (255,))
draw_bus(ImageDraw.Draw(icon), SIZE / 2, SIZE / 2, SIZE / 100)
icon.save("icon.png")

# icon-background.png: nur die Fläche, kein Motiv (Android-Adaptive-Icon-Hintergrund-Layer).
background = Image.new("RGBA", (SIZE, SIZE), BLUE + (255,))
background.save("icon-background.png")

# icon-foreground.png: nur der Bus, transparenter Hintergrund, kleiner skaliert (sichere
# Zone für adaptive Icons ist ca. die mittleren 66%, hier bewusst konservativ 60% gewählt).
foreground = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw_bus(ImageDraw.Draw(foreground), SIZE / 2, SIZE / 2, SIZE / 100 * 0.6)
foreground.save("icon-foreground.png")

# splash.png: großzügiger Rand (Splash wird je nach Gerät unterschiedlich beschnitten/skaliert).
SPLASH = 2732
splash = Image.new("RGBA", (SPLASH, SPLASH), BLUE + (255,))
draw_bus(ImageDraw.Draw(splash), SPLASH / 2, SPLASH / 2, SPLASH / 100 * 0.5)
splash.save("splash.png")
splash.save("splash-dark.png")  # kein separates Dark-Motiv, gleiche Farben reichen hier

print("Resources erzeugt: icon.png, icon-background.png, icon-foreground.png, splash.png, splash-dark.png")
