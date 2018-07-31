/* @flow */
const fs = require(`fs-extra`)
const report = require(`gatsby-cli/lib/reporter`)
const buildCSS = require(`./build-css`)
const buildHTML = require(`./build-html`)
const buildProductionBundle = require(`./build-javascript`)
const bootstrap = require(`../bootstrap`)
const apiRunnerNode = require(`../utils/api-runner-node`)
const copyStaticDirectory = require(`../utils/copy-static-directory`)
const path = require(`path`)
const yaml = require('js-yaml')
const { spawn } = require('child_process')


const DEFAULT_BROWSERS = [`> 1%`, `last 2 versions`, `IE >= 9`]

function reportFailure(msg, err: Error) {
  report.log(``)
  report.panic(msg, err)
}

// function copyStaticDirectoryFromTheme() {
//
// }

function isLocalGatsbySite() {
  let inGatsbySite = false
  try {
    let { dependencies, devDependencies } = require(path.resolve(
      `./package.json`
    ))
    inGatsbySite =
      (dependencies && dependencies.gatsby) ||
      (devDependencies && devDependencies.gatsby)
  } catch (err) {
    /* ignore */
  }
  return inGatsbySite
}


function composeStarterArgs(args, starterPath) {
  // get args needed for a starter

  let isLocalSite = true
  let parentDirectory = path.resolve('.')
  let directory = starterPath

  let siteInfo = { directory, browserslist: DEFAULT_BROWSERS }
  const useYarn = fs.existsSync(path.join(directory, `yarn.lock`))
  if (isLocalSite) {
    const json = require(path.join(directory, `package.json`))
    siteInfo.sitePackageJson = json
    siteInfo.browserslist = json.browserslist || siteInfo.browserslist
  }

  let starterArgs = { ...args, ...siteInfo, useYarn, parentDirectory }
  return starterArgs
}

function getStarterThemesArgs(argv, config, directory) {

  const entries = Object.entries(config.themes)
  const starterThemesArgs = entries.map((entry, idx) => {
    const key = entry[0]
    const starterthemePath = path.resolve(directory, config.themesDirectory, key)
    return composeStarterArgs(argv, starterthemePath)
  })

  return starterThemesArgs
}

function getStarterThemesConfig(directory) {
  const isThemesConfigPresent = fs.existsSync(path.join(directory, `gatsby-themes.yaml`))
  if (!isThemesConfigPresent) {
    return null
  }

  let gatsbyThemesConfigPath = path.resolve(directory, `gatsby-themes.yaml`)
  let gatsbyThemesConfig = yaml.safeLoad(fs.readFileSync(gatsbyThemesConfigPath, 'utf8'))
  return gatsbyThemesConfig
}


function spawnBuildProcess(key, program) {
  let starterThemeArgs = program.starterThemesManager.starterThemesArgs.find(arg => arg.directory === key)

  return spawn(`yarn run gatsby build`, {
    cwd: starterThemeArgs.directory,
    shell: true,
    stdio: `inherit`,
    env: process.env,
  })

}

async function startBuildEnabledThemes(program) {
  let gatsbyThemesConfig = program.starterThemesManager['config']
  let themesDirectory = gatsbyThemesConfig['themesDirectory']

  const themes = Object.entries(gatsbyThemesConfig['themes'])
  const activeThemes = themes.filter((item) => item[1].build === true)

  activeThemes.forEach((entry, idx) => {
    const themeName = entry[0]
    const themePath = path.join(program.directory, themesDirectory, themeName)

    spawnBuildProcess(themePath, program)
  })

}

async function startBuild(program) {
  const { graphqlRunner } = await bootstrap(program)

  await apiRunnerNode(`onPreBuild`, { graphql: graphqlRunner })

  // Copy files from the static directory to
  // an equivalent static directory within public.
  copyStaticDirectory()

  let activity
  activity = report.activityTimer(`Building CSS`)
  activity.start()
  await buildCSS(program).catch(err => {
    reportFailure(`Generating CSS failed`, err)
  })
  activity.end()

  activity = report.activityTimer(`Building production JavaScript bundles`)
  activity.start()
  await buildProductionBundle(program).catch(err => {
    reportFailure(`Generating JavaScript bundles failed`, err)
  })
  activity.end()

  activity = report.activityTimer(`Building static HTML for pages`)
  activity.start()
  await buildHTML(program).catch(err => {
    reportFailure(
      report.stripIndent`
        Building static HTML for pages failed

        See our docs page on debugging HTML builds for help https://goo.gl/yL9lND
      `,
      err
    )
  })
  activity.end()

  await apiRunnerNode(`onPostBuild`, { graphql: graphqlRunner })

  report.info(`Done building in ${process.uptime()} sec`)
}

type BuildArgs = {
  directory: string,
  sitePackageJson: object,
  browserslist: string[],
  prefixPaths: boolean,
  noUglify: boolean,
  enabledThemes: boolean,
  copyTheme: string,
}

module.exports = async function build(program: BuildArgs) {

  if (program.enabledThemes) {
    const config = getStarterThemesConfig(program.directory)
    const starterThemesArgs = getStarterThemesArgs(program, config, program.directory)

    program.starterThemesManager = {
      config: config,
      starterThemesArgs: starterThemesArgs,
    }

    return startBuildEnabledThemes(program)
  }

  if (program.copyTheme) {
    const config = getStarterThemesConfig(program.directory)
    const starterThemesArgs = getStarterThemesArgs(program, config, program.directory)

    program.starterThemesManager = {
      config: config,
      starterThemesArgs: starterThemesArgs,
    }

    const key = path.join(program.directory, program.starterThemesManager.config.themesDirectory, program.copyTheme)
    const theme = program.starterThemesManager.starterThemesArgs.find(arg => arg.directory === key)


    const parentDir = path.resolve(`${theme.parentDirectory}`, `public`)
    const themeDir = path.resolve(`${theme.directory}`, `public`)
    return fs.copy(themeDir, parentDir)

  }

  await startBuild(program)




}
