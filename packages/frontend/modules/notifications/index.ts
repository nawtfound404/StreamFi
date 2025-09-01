// Notification & Alerts (stubs)
export type Alert = { kind: "follow" | "donation" | "nft"; title: string; body?: string };

export const notifications = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  push(_a: Alert) {
    // integrate toasts/overlays
    return true;
  },
};
