import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import ResumeViewPage from "./pages/ResumeViewPage";
import WelcomePage from "./pages/WelcomePage";
import ShellLayout from "./components/ShellLayout";
import JobsAppWrapper from "./components/JobsAppWrapper";
import LoginModal from "./components/LoginModal";

const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';

const legacyTheme = createTheme({
  palette: {
    primary: { main: "#3b6fa6", dark: "#1d4479", light: "#5888c8" },
    secondary: { main: "#a8cbf5" },
    background: { default: "#f5f5f5" },
  },
  typography: {
    fontFamily: IOS_FONT,
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

const modernTheme = createTheme({
  palette: {
    primary: { main: "#0073bb", dark: "#005d96", light: "#4da6e8" },
    secondary: { main: "#ff9900" },
    background: { default: "#f2f3f3" },
  },
  typography: {
    fontFamily: IOS_FONT,
    fontSize: 13,
  },
  shape: { borderRadius: 2 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, boxShadow: "none" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { boxShadow: "0 1px 3px rgba(0,0,0,0.12)", borderRadius: 2 },
      },
    },
  },
});

/* ---- Animated route wrapper ---- */
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="matchdb-page-transition">
      <Routes location={location}>
        {/* Welcome landing page — default home */}
        <Route path="/" element={<WelcomePage />} />
        {/* OAuth callback — must be outside ShellLayout guard so it works pre-login */}
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
        {/* Public resume view — anyone can view a candidate's profile by username */}
        <Route path="/resume/:username" element={<ResumeViewPage />} />
        <Route path="*" element={<JobsAppWrapper />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  const [themeStyle, setThemeStyle] = useState<"legacy" | "modern">(() =>
    localStorage.getItem("matchdb_style") === "modern" ? "modern" : "legacy",
  );

  useEffect(() => {
    localStorage.setItem("matchdb_style", themeStyle);
    document.body.dataset.style = themeStyle;
  }, [themeStyle]);

  return (
    <ThemeProvider theme={themeStyle === "modern" ? modernTheme : legacyTheme}>
      <CssBaseline />
      <LoginModal />
      <ShellLayout themeStyle={themeStyle} onThemeStyleChange={setThemeStyle}>
        <AnimatedRoutes />
      </ShellLayout>
    </ThemeProvider>
  );
};

export default App;
