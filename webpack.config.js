const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin =
  require("webpack/lib/container/ModuleFederationPlugin");
const Dotenv = require("dotenv-webpack");
const path = require("node:path");
const deps = require("./package.json").dependencies;

module.exports = function webpackConfig(env = {}) {
  let envName = "local";
  if (env.production) envName = "production";
  else if (env.qa) envName = "qa";
  else if (env.development) envName = "development";
  const envFile = path.resolve(__dirname, `env/.env.${envName}`);

  const isDev = envName === "local" || envName === "development";
  const useHttps = Boolean(env.https);

  // Use https:// for jobs remote when HTTPS dev mode is enabled
  const jobsUiUrls = {
    local: useHttps ? "https://localhost:3001" : "http://localhost:3001",
    development: useHttps ? "https://localhost:3001" : "http://localhost:3001",
    qa: "https://jobs-ui.qa.matchdb.com",
    production: "https://matchingdb.com/jobs-remote",
  };

  return {
    entry: "./src/index.ts",
    mode: isDev ? "development" : "production",
    devtool: isDev ? "inline-source-map" : false,
    output: {
      publicPath: "/",
      filename: "[name].[contenthash].js",
      path: path.resolve(__dirname, "dist"),
      clean: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
      alias: { "@": path.resolve(__dirname, "src") },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: "ts-loader",
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    plugins: [
      new Dotenv({ path: envFile, safe: false, systemvars: true }),
      new ModuleFederationPlugin({
        name: "matchdbShell",
        remotes: {
          matchdbJobs: `matchdbJobs@${jobsUiUrls[envName]}/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: deps.react },
          "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
          "react-router-dom": {
            singleton: true,
            requiredVersion: deps["react-router-dom"],
          },
          "react-redux": {
            singleton: true,
            requiredVersion: deps["react-redux"],
          },
          "@reduxjs/toolkit": {
            singleton: true,
            requiredVersion: deps["@reduxjs/toolkit"],
          },
        },
      }),
      new HtmlWebpackPlugin({
        template: "./public/index.html",
        title: "MatchDB",
      }),
    ],
    devServer: {
      port: 3000,
      // Pass --env https to enable HTTPS (uses webpack-dev-server's built-in cert)
      server: useHttps ? "https" : "http",
      historyApiFallback: true,
      hot: true,
      headers: { "Access-Control-Allow-Origin": "*" },
      client: {
        webSocketURL: { pathname: "/hmr" },
      },
      webSocketServer: {
        type: "ws",
        options: { path: "/hmr" },
      },
      proxy: [
        {
          context: ["/api/auth", "/api/payments"],
          target: useHttps ? "https://localhost:4000" : "http://localhost:4000",
          changeOrigin: true,
          secure: false,
        },
        {
          // Jobs MFE runs inside the shell, so its /api/jobs calls arrive here.
          // Forward them to the jobs Node server which proxies to jobs-services :8001.
          context: ["/api/jobs"],
          target: useHttps ? "https://localhost:4001" : "http://localhost:4001",
          changeOrigin: true,
          secure: false,
        },
        {
          context: ["/ws"],
          target: "http://localhost:8001",
          changeOrigin: true,
          ws: true,
        },
      ],
    },
  };
};
