/* @flow */

const url = require(`url`)
const fs = require(`fs-extra`)
const chokidar = require(`chokidar`)
const express = require(`express`)
const graphqlHTTP = require(`express-graphql`)
const parsePath = require(`parse-filepath`)
const request = require(`request`)
const rl = require(`readline`)
const webpack = require(`webpack`)
const webpackConfig = require(`../utils/webpack.config`)
const bootstrap = require(`../bootstrap`)
const { store } = require(`../redux`)
const copyStaticDirectory = require(`../utils/copy-static-directory`)
const developHtml = require(`./develop-html`)
const { withBasePath } = require(`../utils/path`)
const report = require(`gatsby-cli/lib/reporter`)
const launchEditor = require(`react-dev-utils/launchEditor`)
const formatWebpackMessages = require(`react-dev-utils/formatWebpackMessages`)
const chalk = require(`chalk`)
const address = require(`address`)
const sourceNodes = require(`../utils/source-nodes`)
const getSslCert = require(`../utils/get-ssl-cert`)
const path = require(`path`)
const execa = require('execa');

const { fork, spawn } = require('child_process');


const rlInterface = rl.createInterface({
  input: process.stdin,
  output: process.stdout,
})

module.exports = async (program: any) => {


  let starter_one = spawn('yarn run gatsby develop -p 9000', {
    cwd: program.starterThemePaths[0].directory,
    shell: true,
    stdio: `inherit`,
  });

  let starter_two = spawn('yarn run gatsby develop -p 9001', {
    cwd: program.starterThemePaths[1].directory,
    shell: true,
    stdio: `inherit`,
  });


  starter_one.on('close', (code, signal) => {
    console.log(
      `starter one child process terminated due to receipt of signal ${signal}`);
  });

  starter_two.on('close', (code, signal) => {
    console.log(
      `starter two child process terminated due to receipt of signal ${signal}`);
  });


  // Quit immediately on hearing ctrl-c
  rlInterface.on(`SIGINT`, () => {

    starter_one.kill()
    starter_two.kill()
    process.exit()
  })


  return;

}
