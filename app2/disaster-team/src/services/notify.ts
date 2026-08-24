import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

// Track real app foreground state via Capacitor (more reliable than
// document.visibilityState, which does NOT flip on Android background).
let appInForeground: boolean | null = null;
if (Capacitor.isNativePlatform()) {
  App.getState()
    .then((s) => { appInForeground = s.isActive; })
    .catch(() => { appInForeground = null; });
  App.addListener('appStateChange', ({ isActive }) => { appInForeground = isActive; });
}

export async function ensureNotificationPermission() {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* ignore */ }
    }
    return;
  }
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    console.warn('[ResQNet] notification permission failed', e);
  }
}

export async function notifyLocal(title: string, body: string, id?: number) {
  try {
    // Suppress only when we are CERTAIN the app is in the foreground (user is
    // already looking at it). If we don't know the state, default to notifying.
    if (Capacitor.isNativePlatform() && appInForeground === true) return;

    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }
      await LocalNotifications.schedule({
        notifications: [{
          id: id ?? Math.floor(Math.random() * 2_000_000_000),
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
