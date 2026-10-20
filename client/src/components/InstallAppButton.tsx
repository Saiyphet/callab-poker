import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let appInstalled = false;
const subscribers = new Set<() => void>();

function publish() {
  subscribers.forEach((notify) => notify());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    publish();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    appInstalled = true;
    publish();
  });
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const iOS = /iPad|iPhone|iPod/.test(ua) || iPadOs;
  return iOS && /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallAppButton() {
  const [promptReady, setPromptReady] = useState(deferredPrompt !== null);
  const [installed, setInstalled] = useState(() => appInstalled || isStandalone());
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    setIosHint(isIosSafari());
    const notify = () => {
      setPromptReady(deferredPrompt !== null);
      setInstalled(appInstalled || isStandalone());
    };
    subscribers.add(notify);
    notify();
    return () => {
      subscribers.delete(notify);
    };
  }, []);

  async function install() {
    const event = deferredPrompt;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    deferredPrompt = null;
    publish();
  }

  if (installed) return null;

  if (promptReady && deferredPrompt) {
    return (
      <button type="button" className="btn primary install-app" onClick={() => void install()}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        ດາວໂຫຼດແອັບ (ໄອຄອນໜ້າ Desktop)
      </button>
    );
  }

  if (iosHint) {
    return <p className="install-hint">ກົດ Share ແລ້ວເລືອກ 'Add to Home Screen'</p>;
  }

  return null;
}
