declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: Record<string, unknown>;
        themeParams: Record<string, string>;
        colorScheme: "light" | "dark";
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
        openTelegramLink: (url: string) => void;
        switchInlineQuery: (query: string, chatTypes?: string[]) => void;
      };
    };
  }
}

export function useWebApp() {
  const webApp = window.Telegram?.WebApp;

  // ready() and expand() are called in main.tsx before React renders

  return {
    webApp,
    initData: webApp?.initData ?? "",
    themeParams: webApp?.themeParams ?? {},
    colorScheme: webApp?.colorScheme ?? "light",
    mainButton: webApp?.MainButton,
    backButton: webApp?.BackButton,
    haptic: webApp?.HapticFeedback,
  };
}
