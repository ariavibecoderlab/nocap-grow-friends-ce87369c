import type { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT: For production native builds (App Store / Play Store),
// REMOVE the `server` block so the app loads bundled web assets instead of
// pointing at the Lovable preview URL. The `server.url` below is for
// development hot-reload only.
const config: CapacitorConfig = {
  appId: 'app.lovable.1d3816d6df5a4a619f259d0086612ee9',
  appName: 'nocap-grow-friends',
  webDir: 'dist',
  server: {
    url: 'https://1d3816d6-df5a-4a61-9f25-9d0086612ee9.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
