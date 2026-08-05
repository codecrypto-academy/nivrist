const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // The wagmi/connectors barrel imports @coinbase/cdp-sdk (baseAccount), which
    // pulls optional @x402/* packages we never use. Ignore them so the build passes;
    // baseAccount is never instantiated (we only use `mock` and `injected`).
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@x402\/|@react-native-async-storage\/|pino-pretty$)/,
      }),
    );
    return config;
  },
};

module.exports = nextConfig;
