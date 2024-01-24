import {
    getKeyByValue,
    readWallets
} from '../utils/common.js'
import axios from "axios"
import { Table } from 'console-table-printer'
import { createObjectCsvWriter } from 'csv-writer'
import cliProgress from 'cli-progress'
import { HttpsProxyAgent } from "https-proxy-agent"
import { SocksProxyAgent } from "socks-proxy-agent"
import cloudscraper from 'cloudscraper'

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

let debug = true
let p
let csvWriter
let wallets = readWallets('./addresses/altlayer.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let csvData = []
let totalAirdrop = 0
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

async function checkAirdrop(wallet, proxy = null) {
    console.log('test')
    let config = {
        url: "https://94c87e96-000a-4740-bc01-0ca9abbb7bca-stg-airdrop.alt.technology/",
        method: 'POST',
        timeout: 5000,
        "headers": {
            "accept": "text/x-component",
            "accept-language": "en-US,en;q=0.9,ru;q=0.8,bg;q=0.7",
            "content-type": "text/plain;charset=UTF-8",
            "next-action": "67fc7bba70928774c5305f604afe585929202b77",
            "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(homePage)%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
            "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "cookie": "_ga=GA1.1.227546664.1706125112; _ga_CJQQB4WKM9=GS1.1.1706125112.1.1.1706127430.0.0.0",
            "Referer": "https://94c87e96-000a-4740-bc01-0ca9abbb7bca-stg-airdrop.alt.technology/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        formData: "[\"\"]"
    }

    if (proxy) {
        if (proxy.includes('http')) {
            config.httpsAgent = new HttpsProxyAgent(proxy)
        }

        if (proxy.includes('socks')) {
            config.httpsAgent = new SocksProxyAgent(proxy)
        }
    }

    let isFetched = false
    let retries = 0

    stats[wallet].airdrop = 0

    // while (!isFetched) {
        cloudscraper(config).then(async response => {
            console.log(response)
            stats[wallet].airdrop = response.data.amount
            totalAirdrop += stats[wallet].airdrop > 0 ? parseFloat(stats[wallet].airdrop) : 0
            isFetched = true
        }).catch(e => {
            if (debug) console.log('balances', e)

            retries++

            if (retries >= 3) {
                isFetched = true
            }
        })
    // }
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

    stats[wallet] = {
        airdrop: 0
    }

    await checkAirdrop(wallet, proxy)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index) + 1,
        wallet: wallet,
        airdrop: stats[wallet].airdrop,
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

    csvWriter = createObjectCsvWriter({
        path: './results/altlayer.csv',
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

export async function altlayerAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}