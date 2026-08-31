import type {
  AlertAdapter,
  AlertButton,
} from "@bystrobarista/core/platform/alert";

// Headless bridge: core fires alerts, the UI layer (AlertHost in providers)
// renders them as a modal. Falls back to window.alert/confirm if no host has
// mounted yet (e.g. an error during the very first render).
export type PendingAlert = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type Listener = (alerts: PendingAlert[]) => void;

let queue: PendingAlert[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const notify = (): void => {
  for (const l of listeners) l(queue);
};

export const subscribeToAlerts = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(queue);
  return () => listeners.delete(listener);
};

export const dismissAlert = (id: number, button?: AlertButton): void => {
  queue = queue.filter((a) => a.id !== id);
  notify();
  button?.onPress?.();
};

const fallbackAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void => {
  const text = message ? `${title}\n\n${message}` : title;
  const actionable = buttons?.filter((b) => b.style !== "cancel") ?? [];
  if (actionable.length > 0 && buttons && buttons.length > 1) {
    const confirmed = window.confirm(text);
    if (confirmed) actionable[0]?.onPress?.();
    else buttons.find((b) => b.style === "cancel")?.onPress?.();
    return;
  }
  window.alert(text);
  (buttons?.[0] ?? actionable[0])?.onPress?.();
};

export const webAlert: AlertAdapter = {
  show(title, message, buttons) {
    if (listeners.size === 0) {
      fallbackAlert(title, message, buttons);
      return;
    }
    queue = [
      ...queue,
      { id: nextId++, title, message, buttons: buttons ?? [] },
    ];
    notify();
  },
};
