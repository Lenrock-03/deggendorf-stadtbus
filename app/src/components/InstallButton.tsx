import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Eigener Installieren-Button statt der Standard-Browser-UI (siehe Plan, PWA-Grundlagen). */
export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferredPrompt || installed) return null;

  return (
    <button
      onClick={async () => {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
      }}
      style={{
        border: "1px solid var(--color-border)",
        background: "transparent",
        color: "inherit",
        borderRadius: "0.5rem",
        padding: "0.35rem 0.65rem",
        cursor: "pointer",
      }}
    >
      Installieren
    </button>
  );
}
