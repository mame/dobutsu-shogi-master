const webpack = require("webpack");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: "./src/app.ts",
  output: {
    path: path.join(__dirname, "..", "docs"),
    filename: "app.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", "*"],
    modules: ["node_modules", "../precomp"],
  },
  module: {
    rules: [
      { test: /\.s?css$/, use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"] },
      { test: /\.(png|jpg|html|ico)$/, use: [{ loader: "file-loader", options: { name: "[name].[ext]" } }] },
      { test: /\.txt$/, use: "raw-loader" },
      { test: /\.tsx?$/, use: "ts-loader" }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new webpack.ProvidePlugin({
      "$": "jquery",
      "jQuery": "jquery",
      "window.jQuery": "jquery",
    }),
  ],
  performance: {
    maxEntrypointSize: 2000000,
    maxAssetSize: 2000000,
  }
};
