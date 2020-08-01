var webpack = require("webpack");
var path = require("path");

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
      { test: /\.scss$/, use: ["style-loader", "css-loader", "sass-loader"] },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      { test: /\.(png|jpg|html)$/, use: [{ loader: "file-loader", options: { name: '[name].[ext]' } }] },
      { test: /\.txt$/, use: "raw-loader" },
      { test: /\.tsx?$/, use: "ts-loader" }
    ]
  },
  plugins: [
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
