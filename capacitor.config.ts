import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c232114e61894b4b9345b3f5a8174ff3',
  appName: 'Rollout',
  webDir: 'dist',
  // Production mode: no live-reload server.
  // To re-enable hot-reload during development, uncomment:
  // server: {
  //   url: 'https://c232114e-6189-4b4b-9345-b3f5a8174ff3.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  ios: {
    // Disable the WKWebView's native UIScrollView so the viewport cannot
    // be dragged/bounced beyond its bounds on a real device.
    // CSS overflow-scroll containers within the app still work normally.
    scrollEnabled: false,
  },
  plugins: {
    Keyboard: {
      // Resize the <body> element when the keyboard shows/hides so that
      // the layout adjusts without relying on the native WKWebView scroll
      // (which is disabled above). This fixes the keyboard not appearing
      // when scrollEnabled is false.
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
