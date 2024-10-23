import {
    getKeyByValue,
    privateKeyConvert,
    readWallets,
    ensureDirectoryExistence
} from '../utils/common.js'
import axios from "axios"
import { Table } from 'console-table-printer'
import { createObjectCsvWriter } from 'csv-writer'
import cliProgress from 'cli-progress'
import { HttpsProxyAgent } from "https-proxy-agent"
import { SocksProxyAgent } from "socks-proxy-agent"
import { createWalletClient, createPublicClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet } from "viem/chains"
import { gotScraping } from 'got-scraping'

let columns = [
    { name: 'n', color: 'green', alignment: "right" },
    { name: 'wallet', color: 'green', alignment: "right" },
    { name: 'airdrop', color: 'green', alignment: "right" },
]

let headers = [
    { id: 'n', title: '№' },
    { id: 'wallet', title: 'wallet' },
    { id: 'airdrop', title: 'airdrop' },
]

let debug = false
let p
let csvWriter
let wallets = readWallets('./addresses/private_keys.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let csvData = []
let totalAirdrop = 0
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)


function getClient(token = null, proxy) {
    const request = gotScraping.extend({
        headers: {
            ...(token ? { Authorization: token } : {}),
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9,ru;q=0.8,bg;q=0.7",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-app-id": "carv",
            "cookie": "",
            "Referer": "https://airdrop.carv.io/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        ...(proxy ? { proxyUrl: proxy } : {}),
        retry: {
            limit: 3,
            methods: ['GET', 'POST'],
            maxRetryAfter: undefined,
            backoffLimit: 5000,
            noise: 100
        },
        hooks: {
            beforeRetry: [
                (error, retryCount) => {
                    this.logger.error(`retry ${retryCount} - ${error.message}`)
                }
            ],
        }
    })

    return request
}

async function checkAirdrop(wallet, proxy = null, walletClient) {
    const walletAddress = walletClient.account.address.toLowerCase()
    
    const client = getClient(null, proxy)
    
    const message = await client({
        url: 'https://interface.carv.io/carv-airdrop/wallet/get_signature_text',
    }).then(({ body }) => {
        const data = JSON.parse(body)
        return data.data.text
    })
    
    const signature = await walletClient.signMessage({
        account: privateKeyToAccount(privateKeyConvert(wallet)),
        message: message,
    })

    const token = await client.post('https://interface.carv.io/carv-airdrop/login', {
        json: {
            signature,
            wallet_addr: walletAddress,
            text: message,
            type: 'wallet'
        }
    }).then(({ body }) => {
        const data = JSON.parse(body)
        return data.data.token
    })

    const client2 = getClient(token, proxy)
    const aidrop = await client2('https://interface.carv.io/carv-airdrop/user/snapshot').then(({ body }) => {
        const data = JSON.parse(body)
        return parseFloat(data.data.total_carv)
    })

    stats[walletAddress].airdrop = aidrop
    totalAirdrop += stats[walletAddress].airdrop
}

async function fetchWallet(wallet, index) {

    let proxy = null
    if (proxies.length) {
        if (proxies[index]) {
            proxy = proxies[index]
        } else {
            proxy = proxies[0]
        }
    }

    const walletClient = createWalletClient({ chain: mainnet, account: privateKeyToAccount(privateKeyConvert(wallet)), transport: http() })
    const walletAddress = walletClient.account.address.toLowerCase()
    stats[walletAddress] = {
        airdrop: 0
    }

    await checkAirdrop(wallet, proxy, walletClient)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index) + 1,
        wallet: walletAddress,
        airdrop: stats[walletAddress].airdrop,
    }

    p.addRow(row, { color: "cyan" })

    iteration++
}

async function fetchWallets() {
    iterations = wallets.length
    iteration = 1
    csvData = []

    let batchSize = 1
    let timeout = 1000

    if (proxies.length) {
        batchSize = 10
        timeout = 1000
    }

    const batchCount = Math.ceil(wallets.length / batchSize)
    const walletPromises = []

    p = new Table({
        columns: columns,
        sort: (row1, row2) => +row1.n - +row2.n
    })

    const csvFilePath = './results/carv.csv'
    ensureDirectoryExistence(csvFilePath)

    csvWriter = createObjectCsvWriter({
        path: csvFilePath,
        header: headers
    })

    for (let i = 0; i < batchCount; i++) {
        const startIndex = i * batchSize
        const endIndex = (i + 1) * batchSize
        const batch = wallets.slice(startIndex, endIndex)

        const promise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(fetchBatch(batch))
            }, i * timeout)
        })

        walletPromises.push(promise)
    }

    await Promise.all(walletPromises)
    return true
}

async function fetchBatch(batch) {
    await Promise.all(batch.map((account, index) => fetchWallet(account, getKeyByValue(wallets, account))))
}

async function saveToCsv() {
    p.table.rows.map((row) => {
        csvData.push(row.text)
    })
    csvData.sort((a, b) => a.n - b.n)
    csvWriter.writeRecords(csvData).then().catch()
}

async function addTotalRow() {
    p.addRow({})

    let row = {
        wallet: 'Total',
        airdrop: totalAirdrop
    }

    p.addRow(row, { color: "cyan" })
}

export async function carvAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}