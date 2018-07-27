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
const execa = require('execa')
const { fork, spawn } = require('child_process')
const yaml = require('js-yaml');



const rlInterface = rl.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const printInstructions = (name, host, port) => {
  console.log(``);
  console.log(`Starter theme ${name} running on http://${host}:${port}/ `);
  console.log(``);
}

module.exports = async (program: any) => {

  let starterThemesProcesses

  // Quit immediately on hearing ctrl-c
  // rlInterface.on(`line`, () => {
  //   console.log(`Cluster termination initiated. Killing starter theme processes.`);
  // })


  starterThemesProcesses = program.starterThemePaths.map((themeProgram, idx) => {
    console.log(`Starting process: ${themeProgram.sitePackageJson.name}`);


    const gatsbyThemesConfigPath = path.resolve('.', 'gatsby-themes.yaml')
    const gatsbyThemesConfig = yaml.safeLoad(fs.readFileSync(gatsbyThemesConfigPath, 'utf8'))

    const themes = Object.keys(gatsbyThemesConfig['themes'])
    themes.map(key => {
      const childConfigChanges = gatsbyThemesConfig['themes'][key]
      const childThemeConfigBuffer = new Buffer.from(JSON.stringify(childConfigChanges), null, ' ')

      const childThemeConfigPath = path.resolve('.', gatsbyThemesConfig.themesDirectory, key, `theme.json`)
      const childThemeConfigWritableStream = fs.createWriteStream(childThemeConfigPath)

      childThemeConfigWritableStream.write(childThemeConfigBuffer)
      childThemeConfigWritableStream.end()
    })


    const name = themeProgram.sitePackageJson.name
    const host = themeProgram.host
    const port = 9000 + idx
    printInstructions(name, host, port)




    const env = process.env
    env['GATSBY_THEMES_PARENT_DIRECTORY'] = path.resolve(program.parentDirectory)
    env['GATSBY_THEMES_CONFIG'] = path.resolve(program.parentDirectory, 'gatsby-themes.yaml')


    return spawn(`yarn run gatsby develop -p ${port}`, {
      cwd: themeProgram.directory,
      shell: true,
      stdio: `inherit`,
      env: env,
    });
  })



}
