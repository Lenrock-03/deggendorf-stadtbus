"""Erzeugt einfache App-Icons (Bus-Symbol) für Manifest/Favicon. Einmalig ausgeführt,
Ergebnis-PNGs werden versioniert - Script muss nicht Teil des Build-Prozesses sein."""
from PIL import Image, ImageDraw

BLUE = (29, 78, 216)  # #1d4ed8, passend zu --color-accent / theme_color
WHITE = (255, 255, 255)


def draw_bus(draw, cx, cy, scale):
    # Einfaches, klar erkennbares Bus-Symbol: Karosserie + 2 Fenster + 2 Räder
    w, h = 62 * scale, 44 * scale
    x0, y0 = cx - w / 2, cy - h / 2 - 4 * scale
    x1, y1 = cx + w / 2, cy + h / 2 - 4 * scale
    r = 10 * scale
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=WHITE)
    # Fenster
    win_y0 = y0 + 8 * scale
    win_y1 = y0 + 22 * scale
    win_w = 12 * scale
    gap = 6 * scale
    n = 3
    total_w = n * win_w + (n - 1) * gap
    wx = cx - total_w / 2
    for i in range(n):
        draw.rounded_rectangle(
            [wx, win_y0, wx + win_w, win_y1], radius=2 * scale, fill=BLUE
        )
        wx += win_w + gap
    # Räder
    wheel_r = 7 * scale
    wheel_y = y1 - 2 * scale
    for wx in (x0 + 14 * scale, x1 - 14 * scale):
        draw.ellipse(
            [wx - wheel_r, wheel_y - wheel_r, wx + wheel_r, wheel_y + wheel_r],
            fill=BLUE,
        )
        inner = wheel_r * 0.4
        draw.ellipse(
            [wx - inner, wheel_y - inner, wx + inner, wheel_y + inner], fill=WHITE
        )


def make_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), BLUE + (255,))
    draw = ImageDraw.Draw(img)
    scale = size / 100
    # maskable Icons brauchen sichere Zone (~80% mittig), Motiv daher etwas kleiner
    bus_scale = scale * (0.78 if maskable else 1.0)
    draw_bus(draw, size / 2, size / 2, bus_scale)
    return img


make_icon(192).save("icon-192.png")
make_icon(512).save("icon-512.png")
make_icon(512, maskable=True).save("icon-512-maskable.png")
print("Icons erzeugt: icon-192.png, icon-512.png, icon-512-maskable.png")
