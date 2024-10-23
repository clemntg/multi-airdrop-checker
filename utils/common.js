import fs from "fs"
import path from 'path'
import axios from "axios"
import inquirer from "inquirer"
import { HttpsProxyAgent } from "https-proxy-agent"
import { SocksProxyAgent } from "socks-proxy-agent"

export const wait = ms => new Promise(r => setTimeout(r, ms))
export const sleep = async (millis) => new Promise(resolve => setTimeout(resolve, millis))

export function random(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function readWallets(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line !== '')
        return lines
    } catch (error) {
        console.error('Error reading the file:', error.message)
        return []
    }
}

export function writeLineToFile(filePath, line) {
    try {
        fs.appendFileSync(filePath, line + '\n', 'utf-8')
    } catch (error) {
        console.error('Error appending to the file:', error.message)
    }
}

export function ensureDirectoryExistence(filePath) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

export function getBalance(balance, decimal) {
    return parseFloat((parseInt(balance) / 10 ** decimal).toFixed(6))
}

export function timestampToDate(timestamp) {
    return new Date(parseInt(timestamp) * 1000)
}

Date.prototype.getWeek = function (dowOffset) {
    /*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */

    dowOffset = typeof (dowOffset) == 'number' ? dowOffset : 0 //default dowOffset to zero
    var newYear = new Date(this.getFullYear(), 0, 1)
    var day = newYear.getDay() - dowOffset //the day of week the year begins on
    day = (day >= 0 ? day : day + 7)
    var daynum = Math.floor((this.getTime() - newYear.getTime() -
        (this.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1
    var weeknum
    //if the year starts before the middle of a week
    if (day < 4) {
        weeknum = Math.floor((daynum + day - 1) / 7) + 1
        if (weeknum > 52) {
            let nYear = new Date(this.getFullYear() + 1, 0, 1)
            let nday = nYear.getDay() - dowOffset
            nday = nday >= 0 ? nday : nday + 7
            /*if the next year starts before the middle of
              the week, it is week #1 of that year*/
            weeknum = nday < 4 ? 1 : 53
        }
    }
    else {
        weeknum = Math.floor((daynum + day - 1) / 7)
    }
    return weeknum
}

export function getNativeToken(network) {
    let token = 'ETH'
    switch (network) {
        case 'Polygon':
            token = 'MATIC'
            break
        case 'polygon':
            token = 'MATIC'
            break
        case 'BSC':
            token = 'BNB'
            break
        case 'Avalanche':
            token = 'AVAX'
            break
        case 'Core':
            token = 'CORE'
            break
    }

    return token
}

export function balanceNative(balances, network) {
    return balances[network] && balances[network][getNativeToken(network)] ? balances[network][getNativeToken(network)] : '$0'
}

export function balance(balances, network, token) {
    return balances[network] && balances[network]['tokens'][token] ? balances[network]['tokens'][token] : '$0'
}

export function balanceTotal(totalBalances, network, token) {
    return totalBalances[network] && totalBalances[network][token] ?
        '$' + parseFloat(totalBalances[network][token].usd).toFixed(2) +
        ' / ' + parseFloat(totalBalances[network][token].amount).toFixed(3) +
        ' ' + totalBalances[network][token].symbol : '$0'
}

export function balanceTotalStable(totalBalances, network, token) {
    return totalBalances[network] && totalBalances[network][token] ?
        '$' + parseFloat(totalBalances[network][token].usd).toFixed(1) : '$0'
}

export function balanceTopToken(balances, network, iteration = 0) {
    if (balances[network] && balances[network]['tokens'] && Object.keys(balances[network]['tokens'])[iteration]) {
        let skip = 0
        let obj = balances[network]['tokens']
        if (obj[Object.keys(obj)[iteration]]) {
            if (obj[Object.keys(obj)[iteration]].includes('USD')) {
                skip = 1
            }
        }
        if (obj[Object.keys(obj)[iteration + 1]]) {
            if (obj[Object.keys(obj)[iteration + 1]].includes('USD')) {
                skip = 2
            }
        }

        return obj[Object.keys(obj)[iteration + skip]]
    }

    return ''
}

export async function getEthPriceForDate(date) {
    const ethereumId = "ethereum"
    const currency = "usd"
    const historicalPriceEndpoint = `https://api.coingecko.com/api/v3/coins/${ethereumId}/market_chart`
    let isDone = false
    while (!isDone) {
        try {
            const response = await axios.get(historicalPriceEndpoint, {
                params: {
                    vs_currency: currency,
                    from: date,
                    to: date,
                    interval: "daily",
                    days: 1
                }
            })

            await sleep(1000)

            if (response.data.prices && response.data.prices.length > 0) {
                isDone = true
                return response.data.prices[0][1]
            } else {
                return null
            }
        } catch (error) {
            await sleep(10 * 1000)
        }
    }
}

export const entryPoint = async () => {
    const questions = [
        {
            name: "choice",
            type: "list",
            message: "Действие:",
            choices: [
                {
                    name: "Scroll (evm.txt)",
                    value: "scroll",
                },
                {
                    name: "Carv (private_keys.txt)",
                    value: "carv",
                },
                {
                    name: "Optimism (evm.txt)",
                    value: "optimism",
                },
                {
                    name: "Scroll pump (evm.txt)",
                    value: "scroll-pump",
                },
                {
                    name: "Energy (evm.txt)",
                    value: "energy",
                },
                {
                    name: "Grass (solana.txt)",
                    value: "grass",
                },
                {
                    name: "Debridge (evm.txt)",
                    value: "debridge",
                },
                {
                    name: "Layerzero (evm.txt)",
                    value: "layerzero",
                },
                {
                    name: "Orderly (evm.txt)",
                    value: "orderly",
                },
                {
                    name: "AiArena (evm.txt)",
                    value: "aiarena",
                },
                {
                    name: "Aethir (evm.txt)",
                    value: "aethir",
                },
                {
                    name: "Zksync (evm.txt)",
                    value: "zksync",
                },
                {
                    name: "Ionet (solana.txt)",
                    value: "ionet",
                },
                {
                    name: "Kresko (evm.txt)",
                    value: "kresko",
                },
                {
                    name: "Taiko (evm.txt)",
                    value: "taiko",
                },
                {
                    name: "Spectral (evm.txt)",
                    value: "spectral",
                },
                {
                    name: "Eigenlayer (evm.txt)",
                    value: "eigenlayer",
                },
                {
                    name: "Avail (private_keys.txt)",
                    value: "avail",
                }
            ],
            loop: false,
        },
    ]

    const answers = await inquirer.prompt(questions)
    return answers.choice
}

export function getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value)
}

export function newAbortSignal(timeoutMs) {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), timeoutMs || 0)

    return abortController.signal
}

let proxies = readWallets('./proxies.txt')

export function getProxy(index, isRandom = false) {
    let agent
    let proxy = null
    if (proxies.length) {
        if (proxies[index]) {
            if (isRandom) {
                proxy = proxies[random(0, proxies.length)]
            } else {
                proxy = proxies[index]
            }
        } else {
            proxy = proxies[0]
        }
    }

    if (proxy) {
        if (proxy.includes('http')) {
            agent = new HttpsProxyAgent(proxy)
        }

        if (proxy.includes('socks')) {
            agent = new SocksProxyAgent(proxy)
        }
    }

    return agent
}

export function sortObjectByKey(obj) {
    const sortedEntries = Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0]))
    return Object.fromEntries(sortedEntries)
}

export function privateKeyConvert(privateKey) {
    if (privateKey.startsWith('0x')) {
        return privateKey
    } else {
        return `0x${privateKey}`
    }
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function generateRandomUserAgent() {
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Opera', 'Edge']
    const os = ['Windows NT 10.0', 'Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64', 'iPhone; CPU iPhone OS 14_0 like Mac OS X', 'Android 10']

    const browser = getRandomElement(browsers)
    const operatingSystem = getRandomElement(os)

    let userAgent = ''

    switch (browser) {
        case 'Chrome':
            userAgent = `Mozilla/5.0 (${operatingSystem}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 100)}.0.${Math.floor(Math.random() * 10000)}.0 Safari/537.36`
            break
        case 'Firefox':
            userAgent = `Mozilla/5.0 (${operatingSystem}; rv:${Math.floor(Math.random() * 100)}.0) Gecko/20100101 Firefox/${Math.floor(Math.random() * 100)}.0`
            break
        case 'Safari':
            userAgent = `Mozilla/5.0 (${operatingSystem}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${Math.floor(Math.random() * 15)}.0 Safari/605.1.15`
            break
        case 'Opera':
            userAgent = `Mozilla/5.0 (${operatingSystem}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 100)}.0.${Math.floor(Math.random() * 10000)}.0 Safari/537.36 OPR/${Math.floor(Math.random() * 100)}.0.0.0`
            break
        case 'Edge':
            userAgent = `Mozilla/5.0 (${operatingSystem}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 100)}.0.${Math.floor(Math.random() * 10000)}.0 Safari/537.36 Edg/${Math.floor(Math.random() * 100)}.0.0.0`
            break
    }

    return userAgent
}