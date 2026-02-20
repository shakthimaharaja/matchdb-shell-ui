import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgress, Box, Typography } from "@mui/material";
import { useAppDispatch } from "../store";
import { setAuthFromOAuth, User } from "../store/authSlice";

/**
 * Landing page for Google OAuth redirects.
 *
 * The shell-services backend redirects here after a successful Google sign-in
 * with token, refresh, and user data encoded in the URL query string.
 * This page reads the params, hydrates Redux state, and redirects the user.
 */
const OAuthCallbackPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refresh = params.get("refresh");
    const userRaw = params.get("user");
    const oauthError = params.get("oauth_error");

    if (oauthError) {
      // Backend signaled an error — redirect to login with error message
      const msg = decodeURIComponent(oauthError);
      navigate(`/login?oauth_error=${encodeURIComponent(msg)}`, { replace: true });
      return;
    }

    if (!token || !userRaw) {
      navigate("/login?oauth_error=missing_data", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw)) as User;
      dispatch(setAuthFromOAuth({ token, refresh: refresh || "", user }));
      navigate("/", { replace: true });
    } catch {
      navigate("/login?oauth_error=parse_error", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 2,
      }}
    >
      <CircularProgress size={48} />
      <Typography color="text.secondary">Completing sign-in…</Typography>
    </Box>
  );
};

export default OAuthCallbackPage;
