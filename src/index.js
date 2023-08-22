import {program} from "commander"
import * as util from "./utils.js"

program
    .name("timm - Tactical Intervention Mod Manager")
    .description("A tool that allows for the quick installing and updating of mods for Tactical Intervention")
    .version("1.0")
    .action((name, options, command) => {
        console.log(command)
    })

program
    .configureOutput({
        // Highlight errors in color.
        outputError: (str, write) => write(util.errorColor(str))
    })

export let workingDir = process.cwd()
let parentFolder = workingDir.substr(workingDir.lastIndexOf("\\") + 1) // Windows only but meh

if (parentFolder != "Tactical Intervention") {
    program.error("You must place timm.exe inside your 'Tactical Intervention' base folder!")
}

export let configPath = `${workingDir}/timm.json`
export let tacintDir = util.errorIfDirNotExists(`${workingDir}/tacint`)
export let binDir = util.errorIfDirNotExists(`${workingDir}/bin`)
export let mountDir = util.createDirIfNotExists(`${workingDir}/mapkit`)
export let modsDir = util.createDirIfNotExists(`${workingDir}/mods`)

util.createConfig()
util.checkGamePatched()

let conf = util.readConfig()

if (!conf.gamePatched) {
    console.log(util.warnColor("Your game is NOT patched! Before using any mods you must patch your game to support modded content!\nRun 'timm patch' to patch your game."))
}

program.command("patch")
    .description("Patches your game to allow modded content, this will include a ~5GB download and might take a while!")
    .action(async (str, options) => {
        await util.patchGame()
    })

program.parse(process.argv)

// Check the program.args obj
var NO_COMMAND_SPECIFIED = program.args.length === 0;

// Show help if its all WRONG!!!
if (NO_COMMAND_SPECIFIED) {
    program.help()
}
