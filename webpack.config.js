const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const Dotenv = require("dotenv-webpack");
const path = require("path");
const deps = require("./package.json").dependencies;

module.exports = (env = {}) => {
  const envName = env.production ? "production" : env.qa ? "qa" : "development";
  const envFile = path.resolve(__dirname, `env/.env.${envName}`);

  const jobsUiUrls = {
    development: "http://localhost:3001",
    qa: "https://jobs-ui.qa.matchdb.com",
    production: "http://matchingdb.com:3001",
  };

  return {
    entry: "./src/index.ts",
    mode: envName === "development" ? "development" : "production",
    devtool: envName === "development" ? "inline-source-map" : false,
    output: {
      publicPath: "auto",
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
      historyApiFallback: true,
      hot: true,
      headers: { "Access-Control-Allow-Origin": "*" },
      proxy: [
        {
          context: ["/api/auth", "/api/payments"],
          target: "http://localhost:4000",
          changeOrigin: true,
        },
        {
          // Jobs MFE runs inside the shell, so its /api/jobs calls arrive here.
          // Forward them to the jobs Node server which proxies to Django :8001.
          context: ["/api/jobs"],
          target: "http://localhost:4001",
          changeOrigin: true,
        },
      ],
    },
  };
};
