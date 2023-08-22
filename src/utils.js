import fs from "fs"
import {program} from "commander"
import fetch from "node-fetch"
import * as core from "./index.js"
import pjson from "../package.json" assert {type: "json"}

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

export function checkGamePatched() {
    let patchMark = false
    try {
        fs.readFileSync(`${core.mountDir}/PATCHED`)
        patchMark = true
    } catch(err) {}

    let conf = readConfig()
    conf.gamePatched = patchMark
    updateConfig(conf)
}

async function getRemotePackage() {
    let remotePackage
    let remotePackageUrl = `${pjson.repository.url.replace("github.com", "raw.githubusercontent.com")}/main/package.json`
    console.log(remotePackageUrl)

    try {
        remotePackage = await fetch(remotePackageUrl)
    } catch(err) {
        program.error(`Error reading the remote package.json file (${err})`)
    }

    try {
        return await remotePackage.json()
    } catch(err) {
        program.error(`Error parsing the remote package.json file (${err})`)
    }
}

async function downloadPatch(url) {
    let remotePackageUrl = repository.url
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
    
    // Wait 1 second to prevent spam
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log(downloadUrl)

}