import "@testing-library/jest-dom";

// Mock Telegram WebApp
Object.defineProperty(window, "Telegram", {
  value: {
    WebApp: {
      initData: "",
      ready: () => {},
      expand: () => {},
      disableVerticalSwipes: () => {},
      MainButton: { show: () => {}, hide: () => {}, setText: () => {}, onClick: () => {} },
      themeParams: {},
    },
  },
  writable: true,
});
