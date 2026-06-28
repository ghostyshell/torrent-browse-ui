/**
 * Mobile Optimizations Hook
 * Provides mobile-specific optimizations and touch interactions for Android WebView
 */

import { useEffect, useState, useCallback } from 'react';
import androidNetworkHandler from '../services/androidNetworkHandler';

interface MobileOptimizations {
  isMobile: boolean;
  isAndroidWebView: boolean;
  touchOptimizations: boolean;
  networkStatus: {
    isOnline: boolean;
    connectionType: string;
  };
  viewport: {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
  };
}

interface TouchFeedbackOptions {
  scale?: number;
  duration?: number;
  haptic?: boolean;
}

export const useMobileOptimizations = () => {
  const [optimizations, setOptimizations] = useState<MobileOptimizations>({
    isMobile: false,
    isAndroidWebView: false,
    touchOptimizations: false,
    networkStatus: {
      isOnline: navigator.onLine,
      connectionType: 'unknown',
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      orientation:
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    },
  });

  // Detect mobile and Android WebView environment
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      );
    const isAndroidWebView =
      userAgent.includes('Android') && userAgent.includes('wv');
    const touchOptimizations =
      process.env.REACT_APP_ENABLE_TOUCH_OPTIMIZATIONS === 'true';

    setOptimizations((prev) => ({
      ...prev,
      isMobile,
      isAndroidWebView,
      touchOptimizations,
    }));
  }, []);

  // Handle viewport changes
  useEffect(() => {
    const handleResize = () => {
      setOptimizations((prev) => ({
        ...prev,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          orientation:
            window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        },
      }));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Handle network status changes
  useEffect(() => {
    const handleNetworkChange = (status: any) => {
      setOptimizations((prev) => ({
        ...prev,
        networkStatus: {
          isOnline: status.isOnline,
          connectionType: status.connectionType,
        },
      }));
    };

    androidNetworkHandler.addListener(handleNetworkChange);

    return () => {
      androidNetworkHandler.removeListener(handleNetworkChange);
    };
  }, []);

  // Touch feedback utility
  const addTouchFeedback = useCallback(
    (element: HTMLElement, options: TouchFeedbackOptions = {}) => {
      if (!optimizations.touchOptimizations) return;

      const { scale = 0.98, duration = 150, haptic = false } = options;

      const handleTouchStart = () => {
        element.style.transform = `scale(${scale})`;
        element.style.transition = `transform ${duration}ms ease`;

        // Haptic feedback for Android
        if (haptic && 'vibrate' in navigator) {
          navigator.vibrate(10);
        }
      };

      const handleTouchEnd = () => {
        element.style.transform = 'scale(1)';
      };

      element.addEventListener('touchstart', handleTouchStart, {
        passive: true,
      });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });
      element.addEventListener('touchcancel', handleTouchEnd, {
        passive: true,
      });

      // Return cleanup function
      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
        element.removeEventListener('touchcancel', handleTouchEnd);
      };
    },
    [optimizations.touchOptimizations]
  );

  // Prevent zoom on input focus (iOS specific but good for consistency)
  const preventZoomOnFocus = useCallback(
    (inputElement: HTMLInputElement) => {
      if (!optimizations.isMobile) return;

      const originalFontSize = inputElement.style.fontSize;

      const handleFocus = () => {
        inputElement.style.fontSize = '16px';
      };

      const handleBlur = () => {
        inputElement.style.fontSize = originalFontSize;
      };

      inputElement.addEventListener('focus', handleFocus);
      inputElement.addEventListener('blur', handleBlur);

      return () => {
        inputElement.removeEventListener('focus', handleFocus);
        inputElement.removeEventListener('blur', handleBlur);
      };
    },
    [optimizations.isMobile]
  );

  // Optimize scroll performance
  const optimizeScrolling = useCallback(
    (container: HTMLElement) => {
      if (!optimizations.isMobile) return;

      container.style.webkitOverflowScrolling = 'touch';
      container.style.overflowScrolling = 'touch';

      // Add momentum scrolling for iOS
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        container.style.webkitOverflowScrolling = 'touch';
      }
    },
    [optimizations.isMobile]
  );

  // Handle safe area insets for devices with notches
  const getSafeAreaInsets = useCallback(() => {
    if (!optimizations.isMobile) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const computedStyle = getComputedStyle(document.documentElement);

    return {
      top: parseInt(
        computedStyle.getPropertyValue('--safe-area-inset-top') || '0'
      ),
      right: parseInt(
        computedStyle.getPropertyValue('--safe-area-inset-right') || '0'
      ),
      bottom: parseInt(
        computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'
      ),
      left: parseInt(
        computedStyle.getPropertyValue('--safe-area-inset-left') || '0'
      ),
    };
  }, [optimizations.isMobile]);

  // Get optimal grid columns based on viewport
  const getOptimalGridColumns = useCallback(
    (minColumnWidth: number = 300) => {
      const { width } = optimizations.viewport;
      const padding = 32; // Account for container padding
      const gap = 16; // Account for grid gap

      const availableWidth = width - padding;
      const columns = Math.floor(
        (availableWidth + gap) / (minColumnWidth + gap)
      );

      return Math.max(1, columns);
    },
    [optimizations.viewport]
  );

  // Check if device supports hover (desktop vs mobile)
  const supportsHover = useCallback(() => {
    return window.matchMedia('(hover: hover)').matches;
  }, []);

  // Get device pixel ratio for high-DPI displays
  const getDevicePixelRatio = useCallback(() => {
    return window.devicePixelRatio || 1;
  }, []);

  return {
    ...optimizations,
    addTouchFeedback,
    preventZoomOnFocus,
    optimizeScrolling,
    getSafeAreaInsets,
    getOptimalGridColumns,
    supportsHover,
    getDevicePixelRatio,
  };
};

export default useMobileOptimizations;
