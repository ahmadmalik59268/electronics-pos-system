import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

export const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Initialize native Capacitor features (Status bar, splash screen, keyboard)
 */
export async function initCapacitorNativeFeatures(theme: 'light' | 'dark' = 'dark') {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Hide Splash Screen smoothly once app boots
    await SplashScreen.hide({
      fadeOutDuration: 300,
    });
  } catch (e) {
    console.debug('SplashScreen hide note:', e);
  }

  try {
    // Set Status Bar appearance
    if (Capacitor.isPluginAvailable('StatusBar')) {
      if (theme === 'dark') {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f172a' }); // Slate-900
      } else {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
      }
    }
  } catch (e) {
    console.debug('StatusBar styling note:', e);
  }

  try {
    // Keyboard behaviors
    if (Capacitor.isPluginAvailable('Keyboard')) {
      Keyboard.setAccessoryBarVisible({ isVisible: true });
    }
  } catch (e) {
    console.debug('Keyboard plugin note:', e);
  }
}

/**
 * Set up Android hardware back button handler
 */
export function setupAndroidBackButton(
  onBackAction: () => boolean, // returns true if handled internally (e.g. closed a modal or navigated back), false if top level
  onExitAppPrompt?: () => void
) {
  if (!Capacitor.isNativePlatform()) return () => {};

  let lastBackPressTime = 0;

  const listener = CapApp.addListener('backButton', ({ canGoBack }) => {
    // 1. Try internal handler (modals, subviews)
    const handled = onBackAction();
    if (handled) {
      return;
    }

    // 2. Double-tap to exit on main dashboard/auth screen
    const now = Date.now();
    if (now - lastBackPressTime < 2000) {
      CapApp.exitApp();
    } else {
      lastBackPressTime = now;
      if (onExitAppPrompt) {
        onExitAppPrompt();
      }
    }
  });

  return () => {
    listener.then((l) => l.remove()).catch(() => {});
  };
}
