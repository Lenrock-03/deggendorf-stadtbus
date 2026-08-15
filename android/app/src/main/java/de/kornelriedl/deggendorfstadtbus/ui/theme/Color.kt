package de.kornelriedl.deggendorfstadtbus.ui.theme

import androidx.compose.ui.graphics.Color

// Dieselbe Blau-Akzentfarbe wie die Web-App (--color-accent), damit beide Apps optisch
// zusammengehören. Dunkelmodus nutzt einen helleren Blauton (bessere Lesbarkeit auf
// dunklem Grund), exakt wie app/src/index.css.
val AccentLight = Color(0xFF1D4ED8)
val AccentDark = Color(0xFF60A5FA)
val Color_White = Color(0xFFFFFFFF)

// Light Theme (siehe app/src/index.css :root)
val LightBackground = Color(0xFFFFFFFF)
val LightSurface = Color(0xFFF8FAFC)
val LightOnBackground = Color(0xFF1A1A1A)
val LightMuted = Color(0xFF6B7280)
val LightBorder = Color(0xFFE5E7EB)

// Dark Theme (siehe app/src/index.css prefers-color-scheme: dark)
val DarkBackground = Color(0xFF0F1115)
val DarkSurface = Color(0xFF171A21)
val DarkOnBackground = Color(0xFFE5E7EB)
val DarkMuted = Color(0xFF9CA3AF)
val DarkBorder = Color(0xFF2A2E37)
