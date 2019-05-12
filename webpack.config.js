const path = require("path");
const webpack = require("webpack");
const entry = "./src/index.jsx";
const outputPath = path.resolve(process.cwd(), "dist");
const publicPath = process.env.PUBLIC_PATH || "/";
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const clientConfig = {
  entry,
  target: "web",
  devtool: "source-map",
  devServer: {
    writeToDisk: true
  },
  mode: process.env.NODE_ENV == "production" ? "production" : "development",
  output: {
    path: outputPath,
    publicPath,
    filename: "index.[hash].js"
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          "file-loader",
          {
            loader: "image-webpack-loader",
            options: {
              bypassOnDebug: true
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: process.env.NODE_ENV === "development"
            }
          },
          "css-loader",
          "sass-loader"
        ]
      }
    ]
  },
  resolve: {
    extensions: [".js", ".jsx"]
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin({ verbose: true }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css"
    }),
    new HtmlWebpackPlugin({
      // Load a custom template (lodash by default)
      template: "src/index.html"
    }),
    new CopyWebpackPlugin([
      { from: "assets", to: "assets" },
      { from: "public" }
    ]),
    // During the build make literal replacements on client side for
    // process.env.API_URL, because there is no process.env
    new webpack.DefinePlugin({
      "process.env.PUBLIC_PATH": publicPath,
      "process.env.API_PATH": JSON.stringify(
        process.env.API_PATH || "http://localhost:3000/api"
      )
    })
  ]
};

module.exports = clientConfig;
