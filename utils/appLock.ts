/**
 * App lock via Face ID / Touch ID / fingerprint, falling back to the device passcode.
 */
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export type LockSupport = "available" | "no-security" | "unsupported";

/** Whether this device can lock the app (biometrics or at least a passcode is set up). */
export const getLockSupport = async (): Promise<LockSupport> => {
  if (Platform.OS === "web") return "unsupported";
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level === LocalAuthentication.SecurityLevel.NONE ? "no-security" : "available";
  } catch {
    return "unsupported";
  }
};

/** Shows the system unlock prompt. Resolves true only on success. */
export const authenticate = async (promptMessage: string, cancelLabel: string): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      // Allow the device passcode when biometrics fail or aren't enrolled.
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
};
