import { isNativeApp } from "@/lib/platform";

/**
 * Opens the native ML Kit barcode scanner and returns the decoded QR string.
 * Returns null if scan was cancelled, permission denied, or not on native.
 *
 * Web caller should keep using html5-qrcode; this is a native-only path.
 */
export async function scanQrNative(): Promise<string | null> {
  if (!isNativeApp()) return null;

  try {
    const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");

    const supported = await BarcodeScanner.isSupported();
    if (!supported.supported) return null;

    const perm = await BarcodeScanner.checkPermissions();
    let granted = perm.camera === "granted" || perm.camera === "limited";
    if (!granted) {
      const req = await BarcodeScanner.requestPermissions();
      granted = req.camera === "granted" || req.camera === "limited";
    }
    if (!granted) return null;

    // Ensure ML Kit module installed (Android only — no-op on iOS)
    try {
      const avail = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!avail.available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
      }
    } catch {
      /* iOS or unsupported — ignore */
    }

    const { barcodes } = await BarcodeScanner.scan();
    return barcodes?.[0]?.rawValue ?? null;
  } catch (e) {
    console.error("Native QR scan failed", e);
    return null;
  }
}
