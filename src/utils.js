import fs from "fs"
import { program } from "commander"
import * as core from "./index.js"
import axios from "axios"
import path from "path"
import ProgressBar from "progress"
import onezip from "onezip"
import byteSize from "byte-size"
import jetpack from "fs-jetpack"

const REPO_URL = "https://github.com/vingard/timm"
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
    } catch (err) {
        program.error(`Error reading the config file (${err})`)
    }

    try {
        return JSON.parse(configFile)
    } catch (err) {
        program.error(`Error parsing the config file (${err})`)
    }
}

export function updateConfig(config) {
    let configFile

    try {
        configFile = fs.writeFileSync(core.configPath, JSON.stringify(config, undefined, "  "), {overwrite: true})
        return true
    } catch (err) {
        program.error(`Error writing to the config file (${err})`)
        return false
    }
}

export function createDirIfNotExists(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true })
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
            responseType: "stream",
            headers: { "Accept-Encoding": null }
        })
    } catch (err) {
        program.error(`Download failed! ${err}`)
    }

    // extract from response
    const { data, headers } = resp
    const totalLength = headers["content-length"] || headers["Content-Length"] || 564276 // Wild guess??
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
    } catch (err) {
        program.error(`Download failed! ${err}`)
    }

    return new Promise(function (resolve, reject) {
        data.on("end", () => resolve())
    })
}

async function deleteTempFile(name) {
    try {
        fs.unlinkSync(path.resolve(core.tempDir, name))
    } catch (err) { }
}

async function extractArchive(archive, destination) {
    let extract

    try {
        extract = onezip.extract(archive, destination)
    } catch (err) {
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

    return new Promise(function (resolve, reject) {
        extract.on("end", () => resolve())
    })
}

export function checkGamePatched() {
    let patchMark = false
    try {
        fs.readFileSync(`${core.mountDir}/PATCHED`)
        patchMark = true
    } catch (err) { }

    let conf = readConfig()
    conf.gamePatched = patchMark
    updateConfig(conf)

    return conf.gamePatched
}

async function getRemotePackage() {
    let remotePackage
    let remotePackageUrl = `${REPO_URL.replace("github.com", "raw.githubusercontent.com")}/main/package.json`

    try {
        remotePackage = await (await axios.get(remotePackageUrl)).data
    } catch (err) {
        program.error(`Error reading the remote package.json file (${err})`)
    }

    return remotePackage
}

export async function patchGame(overrideUrl) {
    console.log("Patching game...")

    let url = overrideUrl

    // Get content download URL from remote
    if (!overrideUrl) {
        console.log("Getting remote 'package.json' file...")
        let remotePackage = await getRemotePackage()

        if (!remotePackage.patchedContentUrl) {
            program.error("No 'patchedContentUrl' in remote package.json! Tell vin!")
            return
        }

        url = remotePackage.patchedContentUrl
    }

    const destination = core.mountDir
    const tempFileName = "patched_content.zip"

    // Wait 1 second to prevent spam
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Download patched content to a temp file
    console.log("Downloading patched content:")
    await downloadTempFile(url, tempFileName)

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
    } catch (err) {
        program.error(`Failed to write the PATCHED file! ${err}`)
    }

    // Final check
    let isPatched = checkGamePatched()

    if (!isPatched) {
        program.error("Something went wrong, please retry the patch :(")
    }

    console.log(successColor("Game patched successfully!"))
}

async function getModInfo(url) {
    let modInfo
    let modInfoUrl = `${url.replace("github.com", "raw.githubusercontent.com")}/main/mod.json`

    try {
        modInfo = await (await axios.get(modInfoUrl)).data
    } catch (err) {
        program.error(`Could not find a valid mod at ${url} (${err})`)
    }

    if (!modInfo.name) {
        program.error("This mod does not provide a 'name' in its mod.json file, this is required!")
    }

    modInfo.version = modInfo.version || "0.0.1"
    modInfo.url = url

    return modInfo
}

export function isModURL(url) {
    return url.startsWith("https://github.com")
}

export function tryToRemoveFile(path) {
    if (fs.existsSync(path)) {
        fs.unlinkSync(path)
    }
}

export function tryToRemoveDirectory(path) {
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true, force: true })
    }
}

function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path + '/' + file).isDirectory()
    })
}

async function gitFileFix(pathTo) {
    let dirs = getDirectories(pathTo)

    if (!dirs[0]) {
        program.error("Git file fix has gone wrong!")
    }

    let source = dirs[0]

    // This is a stupid hack...
    jetpack.move(path.resolve(pathTo, source), pathTo+"_tmp", {overwrite: true})
    jetpack.move(pathTo+"_tmp", pathTo, {overwrite: true})
}

export async function installMod(url) {
    // Get mod.json file info
    // get title, version, store in timm.json mods
    let mod = await getModInfo(url)
    let modPath = path.resolve(core.modsDir, mod.name)
    let modTempFileName = `${mod.name}.zip`

    // If mod is already installed prompt?

    console.log(`Installing ${mod.name} (${mod.version}):`)

    // Download archive
    console.log(`Downloading...`)
    await downloadTempFile(`${mod.url}/archive/refs/heads/main.zip`, modTempFileName)

    // Make mods folder and remove old install
    tryToRemoveDirectory(modPath)
    await createDirIfNotExists(modPath)

    // Extract to mods folder
    console.log(`Extracting...`)
    await extractArchive(path.resolve(core.tempDir, modTempFileName), modPath)

    // Move all files up one directory and cleanup the mess
    await gitFileFix(modPath)

    // Remove mod info and git files from mod
    console.log("Finishing up...")
    tryToRemoveFile(path.resolve(modPath, ".gitignore"))
    tryToRemoveFile(path.resolve(modPath, ".gitattributes"))
    tryToRemoveFile(path.resolve(modPath, "mod.json"))

    tryToRemoveDirectory(path.resolve(modPath, ".git"))

    // Cleanup archive
    await deleteTempFile(modTempFileName)

    // Append to timm.json the mod info
    let config = readConfig()

    const foundIndex = config.mods.findIndex(x => x.name === mod.name)

    // If mod exists replace otherwise append
    if (foundIndex === -1) {
        config.mods.push(mod)
    } else {
        config.mods[foundIndex] = mod
    }
    
    updateConfig(config)

    console.log(successColor(`${mod.name} (${mod.version}) was installed succesfully!`))

    return mod
}

export async function mountMod(mod, mounted) {
    // Will need to make a recursive function to manually symlink each file i think
    jetpack.symlink(core.mountDir, path.resolve(core.modsDir, "symtest"))
}