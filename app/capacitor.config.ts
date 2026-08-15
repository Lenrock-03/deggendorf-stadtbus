import type { CapacitorConfig } from "@capacitor/cli";

// Nur für den Eigengebrauch (Sideload aufs Pixel 7 via adb) - kein Play-Store-Eintrag,
// appId muss daher nur auf dem eigenen Gerät eindeutig sein, keine Registrierung nötig.
const config: CapacitorConfig = {
  appId: "de.kornel.deggendorfstadtbus",
  appName: "Deggendorf Busfahrplan",
  webDir: "dist",
  server: {
    // Vermeidet Mixed-Content-Probleme beim fetch() auf die (https-gehostete) Live-Domain
    // in useSchedule.ts's Hintergrund-Refresh.
    androidScheme: "https",
  },
};

export default config;
