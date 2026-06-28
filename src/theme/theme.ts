import { createTheme, type Shadows } from '@mui/material';

// Check if running in Android WebView
const isAndroidWebView = () => {
  return (
    process.env.REACT_APP_PLATFORM === 'android' ||
    process.env.REACT_APP_IS_MOBILE_APP === 'true' ||
    (typeof window !== 'undefined' &&
      window.navigator.userAgent.includes('Android') &&
      window.navigator.userAgent.includes('wv'))
  );
};

// Shared Inter stack - loaded via <link> in public/index.html (display=swap).
const fontFamily =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";

// Soft, slightly blue-tinted elevation scale for dark surfaces (MUI needs 25).
const darkShadows: string[] = [
  'none',
  '0 1px 2px 0 rgba(0,0,0,0.40)',
  '0 2px 4px 0 rgba(0,0,0,0.42)',
  '0 4px 8px 0 rgba(0,0,0,0.44)',
  '0 6px 12px -2px rgba(0,0,0,0.46)',
  '0 8px 16px -2px rgba(0,0,0,0.48)',
  '0 12px 24px -4px rgba(0,0,0,0.50)',
  '0 16px 32px -6px rgba(0,0,0,0.52)',
  '0 20px 40px -8px rgba(0,0,0,0.54)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
  '0 24px 48px -12px rgba(0,0,0,0.56)',
];

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f1115',
      paper: '#171a21',
    },
    text: {
      primary: '#e6e9ef',
      secondary: '#aeb4c0',
      disabled: '#6b7280',
    },
    divider: 'rgba(255,255,255,0.10)',
  },
  typography: {
    fontFamily,
    // Rem-based scale; MUI converts px->rem using the html font size.
    fontSize: 16,
    htmlFontSize: 16,
    h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.6rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.35rem', fontWeight: 600, lineHeight: 1.35 },
    h5: { fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
    subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
    button: { fontWeight: 600, textTransform: 'none', lineHeight: 1.4 },
    overline: { fontWeight: 600, letterSpacing: '0.06em' },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: darkShadows as unknown as Shadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily,
          backgroundColor: '#0f1115',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#171a21',
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 16px',
          ...(isAndroidWebView() && {
            minHeight: 44,
            fontSize: '16px',
            padding: '12px 16px',
          }),
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.40)',
          '&:hover': { boxShadow: '0 4px 8px 0 rgba(0,0,0,0.44)' },
          '&:active': { boxShadow: '0 1px 2px 0 rgba(0,0,0,0.40)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
          ...(isAndroidWebView() && {
            '&:active': { transform: 'scale(0.98)' },
          }),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          ...(isAndroidWebView() && {
            margin: 16,
            maxHeight: 'calc(100vh - 32px)',
          }),
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minWidth: 40,
          minHeight: 40,
          ...(isAndroidWebView() && {
            minWidth: 44,
            minHeight: 44,
            padding: 10,
          }),
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          ...(isAndroidWebView() && {
            fontSize: '16px',
          }),
        },
        notchedOutline: {
          borderColor: 'rgba(255,255,255,0.14)',
        },
        input: {
          ...(isAndroidWebView() && {
            fontSize: '16px',
            padding: '12px 16px',
          }),
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          ...(isAndroidWebView() && {
            '& .MuiInputBase-input': {
              fontSize: '16px',
              padding: '12px 16px',
            },
          }),
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          ...(isAndroidWebView() && {
            fontSize: '16px',
            minHeight: 44,
          }),
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.10)',
        },
      },
    },
    MuiPagination: {
      styleOverrides: {
        ul: {
          gap: 4,
        },
        outlined: {
          borderRadius: 8,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
});

// Mobile-specific theme for Android WebView
export const mobileTheme = createTheme({
  ...darkTheme,
  typography: {
    ...darkTheme.typography,
    // Larger text for better readability on mobile
    body1: {
      fontSize: '16px',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '14px',
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '18px',
      fontWeight: 600,
    },
  },
  spacing: 8, // Consistent spacing unit
});