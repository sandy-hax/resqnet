import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

let permissionRequested = false;

export async function ensureNotificationPermission() {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* ignore */ }
    }
    return;
  }
  if (permissionRequested) return;
  permissionRequested = true;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    console.warn('[ResQNet] notification permission failed', e);
  }
}

export async function notifyLocal(title: string, body: string) {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 2_000_000_000),
          title,
          body,
          schedule: { at: new Date(Date.now()) },
        }],
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch (e) {
    console.warn('[ResQNet] notify failed', e);
  }
}
