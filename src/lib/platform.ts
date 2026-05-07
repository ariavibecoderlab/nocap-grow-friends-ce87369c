import { Capacitor } from "@capacitor/core";

export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const isIOS = (): boolean => {
  try {
    return Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
};

export const isAndroid = (): boolean => {
  try {
    return Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
};
