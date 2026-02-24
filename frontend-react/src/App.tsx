import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, SnackbarProvider } from './context';
import { router } from './router';
import { dashboardThemeStyles, fieldStyles } from './theme/dashboardStyles';
import '@/styles/globals.css';

const BRAND_BLUE = '#0075be';

const theme = createTheme({
  colorSchemes: {
    light: true,
    dark: true,
  },
  breakpoints: {
    values: {
      xs: 300,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: '#010101',
          borderStyle: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '22px',
        },
      },
    },
  },
  palette: {
    mode: 'dark',
    contrastThreshold: 4.5,
    primary: {
      main: '#146dc5cf',
      light: '#0c0c0c',
      dark: '#67bbf9',
      contrastText: '#fff',
    },
    cyberAqua: {
      main: 'rgba(0, 203, 221, 0.65)',
      light: 'rgba(0, 203, 221, 0.41)',
      dark: 'rgba(0, 203, 221, 0.93)',
    },
    cyberMag: {
      main: 'rgba(143,42,163, 0.8)',
      light: 'rgba(143, 42, 163, 0.59)',
      dark: 'rgba(143, 42, 163, 0.92)',
    },
    secondary: {
      main: '#E0C2FF',
      light: '#F5EBFF',
      contrastText: '#47008F',
    },
    navy: {
      main: '#292A69',
      light: '#0c0c0c',
      dark: '#1f1e1e',
      contrastText: '#fff',
    },
    red: {
      main: '#CB202F',
      light: '#ea323c',
      dark: '#20cbbd',
      contrastText: '#fff',
    },
    searchInput: {
      main: '#212121',
      light: '#fff',
      dark: '#212121',
      contrastText: '#fff',
    },
    white: {
      main: '#FFFFFF',
      light: '#0c0c0c',
      dark: '#1f1e1e',
      contrastText: '#fff',
    },
    green: {
      main: '#19ab09',
      light: '#0c0c0c',
      dark: '#1f1e1e',
      contrastText: '#fff',
    },
    btn: {
      main: '#9dcbec',
      light: '#0c0c0c',
      dark: '#1f1e1e',
      contrastText: '#fff',
    },
    text: {
      primary: 'rgb(216, 216, 216)',
      secondary: 'rgba(236,232,232,0.6)',
      light: '#212121',
      dark: '#fff',
      contrastText: '#fff',
    },
    background: {
      default: 'rgba(18,18,18,0.6)',
      paper: '#080707',
    },
  },
  typography: {
    fontFamily: ['gotham Bold', 'Proxima Nova', 'Arial Regular'].join(','),
  },
}) as ReturnType<typeof createTheme> & {
  customStyles: {
    dashboard: typeof dashboardThemeStyles;
    field: typeof fieldStyles;
  };
};

theme.customStyles = {
  dashboard: dashboardThemeStyles,
  field: fieldStyles,
};

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SnackbarProvider>
            <RouterProvider router={router} />
            <Outlet />
          </SnackbarProvider>
        </AuthProvider>
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
