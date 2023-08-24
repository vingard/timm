import {program} from "commander"
import * as util from "./utils.js"
import normalizeUrl from "normalize-url"

program
    .name("timm - Tactical Intervention Mod Manager")
    .description("A tool that allows for the quick installing and updating of mods for Tactical Intervention")
    .version("1.0")

program
    .configureOutput({
        // Highlight errors in color.
        outputError: (str, write) => write(util.errorColor(str))
    })

export let workingDir = process.cwd()
let parentFolder = workingDir.substr(workingDir.lastIndexOf("\\") + 1) // Windows only but meh

if (parentFolder != "Tactical Intervention") {
    program.error("You must place timm.bat and the _timm folder inside your 'Tactical Intervention' base folder!")
}

export let configPath = `${workingDir}/timm.json`
export let tacintDir = util.errorIfDirNotExists(`${workingDir}/tacint`)
export let binDir = util.errorIfDirNotExists(`${workingDir}/bin`)
export let mountDir = util.createDirIfNotExists(`${workingDir}/mapkit`)
export let modsDir = util.createDirIfNotExists(`${workingDir}/mods`)
export let tempDir = util.createDirIfNotExists(`${workingDir}/temp`)
export let baseContentDir = util.createDirIfNotExists(`${workingDir}/base_content`)

util.createConfig()
util.checkGamePatched()

let conf = util.readConfig()

if (!conf.gamePatched) {
    console.log(util.errorColor("Your game is NOT patched! Before using any mods you must patch your game to support modded content!\nRun 'timm patch' to patch your game."))
}

program.command("patch")
    .description("Patches your game to allow modded content, this will include a ~5GB download and might take a while!")
    .option("--url [url]", "Overrides the URL to the content .zip file")
    .action(async (options) => {
        await util.patchGame(options.url)
    })

program.command("install")
    .description("Installs a mod from a remote GitHub repository.")
    .argument("<url>", "The URL to the mods GitHub repoistory")
    .option("-M, --mount [mount]", "Should we automatically mount this mod?", true)
    .action(async (url, options) => {
        url = normalizeUrl(url, {defaultProtocol: "https"})

        if (!util.isModURL(url)) {
            program.error("The URL you have provided is invalid. It should be a URL to a github.com respository.")
            return
        }

        let mod = await util.installMod(url)

        if (options.mount) {
            await util.mountMod(mod.name, true)
        }
    })

program.command("mount")
    .description("Mounts a mod to your game.")
    .argument("<modName>", "The mod name to mount")
    .action(async (modName, options) => {
        let mod = util.getMod(modName)
        if (!mod) {
            program.error(`The mod '${modName}' does not exist.`)
        }

        await util.mountMod(mod)
    })

program.command("mount_basecontent")
    .description("Mounts the base content to your game. This is done automatically.")
    .action(async (modName, options) => {
        await util.mountBaseContent()
    })

program.command("unmount")
    .description("Un-mounts a mod from your game.")
    .argument("<modName>", "The mod name to un-mount")
    .action(async (modName, options) => {
        let mod = util.getMod(modName)
        if (!mod) {
            program.error(`The mod '${modName}' does not exist.`)
        }

        await util.unMountMod(mod)
    })

program.parse(process.argv)

// Check the program.args obj
var NO_COMMAND_SPECIFIED = program.args.length === 0;

// Show help if its all WRONG!!!
if (NO_COMMAND_SPECIFIED) {
    program.help()
}
