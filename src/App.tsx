import React from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useAppSelector } from "./store";
import PricingPage from "./pages/PricingPage";
import ShellLayout from "./components/ShellLayout";
import JobsAppWrapper from "./components/JobsAppWrapper";
import LoginModal from "./components/LoginModal";

const theme = createTheme({
  palette: {
    primary: { main: "#3b6fa6", dark: "#1d4479", light: "#5888c8" },
    secondary: { main: "#a8cbf5" },
    background: { default: "#f5f5f5" },
  },
  typography: {
    fontFamily: '"Lucida Grande", Verdana, Arial, sans-serif',
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token } = useAppSelector((state) => state.auth);
  if (!token) {
    // When not logged in, show the jobs app in public mode
    return <JobsAppWrapper />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LoginModal />
      <ShellLayout>
        <Routes>
          <Route
            path="/pricing"
            element={
              <PrivateRoute>
                <PricingPage />
              </PrivateRoute>
            }
          />
          <Route path="/*" element={<JobsAppWrapper />} />
        </Routes>
      </ShellLayout>
    </ThemeProvider>
  );
};

export default App;
