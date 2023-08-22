import fs from "fs"
import {program} from "commander"
import * as core from "./index.js"

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

function getRemotePackage() {
    let remotePackage

    try {
        remotePackage = fs.readFileSync(core.configPath)
    } catch(err) {
        program.error(`Error reading the config file (${err})`)
    }

    try {
        return JSON.parse(configFile)
    } catch(err) {
        program.error(`Error parsing the config file (${err})`)
    }
}

function downloadPatch(url) {

}

export function patchGame() {

}