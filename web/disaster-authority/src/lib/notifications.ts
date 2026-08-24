let requested = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  if (requested) return false;
  requested = true;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

export function pushBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    // Some browsers require a ServiceWorker for constructors; ignore failures.
  }
}
