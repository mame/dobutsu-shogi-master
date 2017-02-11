var webpack = require("webpack");
var path = require("path");

const config = {
  entry: "./src/app",
  output: {
    path: path.join(__dirname, "..", "docs"),
    filename: "app.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ""],
    modulesDirectories: ["node_modules", "../precomp"],
  },
  module: {
    loaders: [
      { test: /\.s?css$/, loader: "style!css?minimize!sass" },
      { test: /\.(png|jpg|html)$/, loader: "file?name=[name].[ext]" },
      { test: /\.txt$/, loader: "raw" },
      { test: /\.tsx?$/, loader: "ts-loader" }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      "$": "jquery",
      "jQuery": "jquery",
      "window.jQuery": "jquery",
    }),
  ]
};

if (process.env.NODE_ENV === "production") {
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compress: {
	warnings: false
      }
    })
  );
}
else {
  config.devtool = "inline-source-map";
  config.watch = true;
  config.progress = true;
  config.devServer = {
    contentBase: "dist",
    host: "0.0.0.0",
    port: 3000,
  };
}

module.exports = config;
