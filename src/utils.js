import fs from "fs"
import {program} from "commander"
import * as core from "./index.js"
import {createRequire} from "module"
const require = createRequire(import.meta.url)
let pjson = require("../package.json")
import axios from "axios"
import path from "path"
import ProgressBar from "progress"
import onezip from "onezip"
import byteSize from "byte-size"

const CONFIG_DEFAULT = {
    gamePatched: false,
    mods: []
}

export function createConfig() {
    if (!fs.existsSync(core.configPath)) {
        return updateConfig(CONFIG_DEFAULT)
    }

    return false
}

export function readConfig() {
    let configFile

    try {
        configFile = fs.readFileSync(core.configPath)
    } catch(err) {
        program.error(`Error reading the config file (${err})`)
    }

    try {
        return JSON.parse(configFile)
    } catch(err) {
        program.error(`Error parsing the config file (${err})`)
    }
}

export function updateConfig(config) {
    let configFile

    try {
        configFile = fs.writeFileSync(core.configPath, JSON.stringify(config, undefined, "  "))
        return true
    } catch(err) {
        program.error(`Error writing to the config file (${err})`)
        return false
    }
}

export function createDirIfNotExists(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, {recursive: true})
    }

    return path
}

export function errorIfDirNotExists(path) {
    if (!fs.existsSync(path)) {
        program.error(`The '${path}' folder is missing!`)
    }

    return path
}

export function errorColor(str) {
    // Add ANSI escape codes to display text in red.
    return `\x1b[31m${str}\x1b[0m`
}

export function warnColor(str) {
    // Add ANSI escape codes to display text in red.
    return `\x1b[33m${str}\x1b[0m`
}

export function successColor(str) {
    // Add ANSI escape codes to display text in red.
    return `\x1b[32m${str}\x1b[0m`
}

async function downloadTempFile(url, name) {
    let resp
    
    try {
        resp = await axios({
            url,
            method: "GET",
            responseType: "stream"
        })
    } catch (err) {
        program.error(`Download failed! ${err}`)
    }

    // extract from response
    const {data, headers} = resp
    const totalLength = headers["content-length"] || headers["Content-Length"]
    const progressBar = new ProgressBar("-> Downloading [:bar] (:curSize/:maxSize) :percent complete  (:etas seconds remaining)", {
        width: 44,
        complete: "=",
        incomplete: " ",
        renderThrottle: 1,
        total: parseInt(totalLength)
    })

    try {
        const writer = fs.createWriteStream(path.resolve(core.tempDir, name))

        data.on("data", (chunk) => progressBar.tick(chunk.length, {
            maxSize: byteSize(progressBar.total),
            curSize: byteSize(progressBar.curr)
        }))
        data.pipe(writer)
    } catch(err) {
        program.error(`Download failed! ${err}`)
    }

    return new Promise(function(resolve, reject) {
        data.on("end", () => resolve())
    })
}

async function deleteTempFile(name) {
    try {
        fs.unlinkSync(path.resolve(core.tempDir, name))
    } catch (err) {}
}

async function extractArchive(archive, destination) {
    let extract

    try {
        extract = onezip.extract(archive, destination)
    } catch(err) {
        program.error(`Error extracting archive! ${err}`)
    }

    const progressBar = new ProgressBar("-> Extracting [:bar] :percent complete  (:etas seconds remaining)", {
        width: 44,
        complete: "=",
        incomplete: " ",
        renderThrottle: 1,
        total: 100
    })

    extract.on("error", (err) => {
        program.error(`Error extracting archive! ${err}`)
    })

    extract.on("progress", (perc) => {
        progressBar.update(perc / 100)
    })

    return new Promise(function(resolve, reject) {
        extract.on("end", () => resolve())
    })
}

export function checkGamePatched() {
    let patchMark = false
    try {
        fs.readFileSync(`${core.mountDir}/PATCHED`)
        patchMark = true
    } catch(err) {}

    let conf = readConfig()
    conf.gamePatched = patchMark
    updateConfig(conf)

    return conf.gamePatched
}

async function getRemotePackage() {
    let remotePackage
    let remotePackageUrl = `${pjson.repository.url.replace("github.com", "raw.githubusercontent.com")}/main/package.json`

    try {
        remotePackage = await (await axios.get(remotePackageUrl)).data
    } catch(err) {
        program.error(`Error reading the remote package.json file (${err})`)
    }

    return remotePackage
}

export async function patchGame() {
    console.log("Patching game...")

    // Get content download URL from remote
    console.log("Getting remote 'package.json' file...")
    let remotePackage = await getRemotePackage()

    if (!remotePackage.patchedContentUrl) {
        program.error("No 'patchedContentUrl' in remote package.json! Tell vin!")
        return
    }

    const destination = core.mountDir
    const tempFileName = "patched_content.zip"
    
    // Wait 1 second to prevent spam
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Download patched content to a temp file
    console.log("Downloading patched content:")
    await downloadTempFile(remotePackage.patchedContentUrl, tempFileName)

    // Extract
    console.log("Extracting patched content...")
    await extractArchive(path.resolve(core.tempDir, tempFileName), destination)

    // Remove old content
    console.log("Removing old content...")

    // Remove all the default .fpx files from /tacint dir
    fs.readdirSync(core.tacintDir).forEach(file => {
        if (file.endsWith(".fpx")) {
            try {
                fs.unlinkSync(path.resolve(core.tacintDir, file)) // remove file
            } catch (err) {
                program.error(`Failed to remove ${file}! ${err}`)
                return
            }
        }
    })

    // Cleanup and mark as patched
    console.log("Finishing up...")
    await deleteTempFile(tempFileName)

    // Write PATCHED file
    try {
        fs.writeFileSync(path.resolve(core.mountDir, "PATCHED"), "PATCHED BY Tactical Intervention Mod Manager")
    } catch(err) {
        program.error(`Failed to write the PATCHED file! ${err}`)
    }

    // Final check
    let isPatched = checkGamePatched()

    if (!isPatched) {
        program.error("Something went wrong, please retry the patch :(")
    }

    console.log(successColor("Game patched successfully!"))
}