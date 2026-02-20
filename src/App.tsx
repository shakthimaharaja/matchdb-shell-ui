import React from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import ResumeViewPage from "./pages/ResumeViewPage";
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

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LoginModal />
      <ShellLayout>
        <Routes>
          {/* OAuth callback — must be outside ShellLayout guard so it works pre-login */}
          <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
          {/* Public resume view — anyone can view a candidate's profile by username */}
          <Route path="/resume/:username" element={<ResumeViewPage />} />
          <Route path="/*" element={<JobsAppWrapper />} />
        </Routes>
      </ShellLayout>
    </ThemeProvider>
  );
};

export default App;
