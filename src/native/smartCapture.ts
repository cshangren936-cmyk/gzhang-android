import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeOcrResult {
  rawText: string;
  imageDataUrl?: string;
}

interface SmartCapturePlugin {
  recognizeImage(options: { dataUrl: string }): Promise<NativeOcrResult>;
  consumePendingCapture(): Promise<
    NativeOcrResult & { available: boolean }
  >;
}

const SmartCapture = registerPlugin<SmartCapturePlugin>("SmartCapture");

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function recognizeImage(
  dataUrl: string,
): Promise<NativeOcrResult> {
  if (!isNativeAndroid()) throw new Error("ANDROID_ONLY");
  return SmartCapture.recognizeImage({ dataUrl });
}

export async function consumePendingCapture() {
  if (!isNativeAndroid()) {
    return { available: false, rawText: "" };
  }
  return SmartCapture.consumePendingCapture();
}
