export const Platform = { OS: "ios" as const, select: <T,>(spec: { ios?: T; default?: T }) => spec.ios ?? spec.default };
export const NativeModules = {};
export const TurboModuleRegistry = { get: () => null };
