import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      console.log('[ResQNet][notify] native permission:', status.display);
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        console.log('[ResQNet][notify] after request:', req.display);
        if (req.display !== 'granted') return;
      }
      await LocalNotifications.schedule({
        notifications: [{
          id: id ?? Math.floor(Math.random() * 1_000_000_000),
          title,
          body,
        }],
      });
      console.log('[ResQNet][notify] scheduled OK:', title);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
      console.log('[ResQNet][notify] web notification OK:', title);
    } else {
      console.log('[ResQNet][notify] NOT shown. web permission:', ('Notification' in window ? Notification.permission : 'no API'));
    }
  } catch (e) {
    console.warn('[ResQNet][notify] failed', JSON.stringify(e));
  }
}
