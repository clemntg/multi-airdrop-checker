import {
    getKeyByValue,
    readWallets
} from '../utils/common.js'
import { Table } from 'console-table-printer'
import { createObjectCsvWriter } from 'csv-writer'
import cliProgress from 'cli-progress'
import cloudscraper from 'cloudscraper'
import axios from 'axios'

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
let wallets = readWallets('./addresses/anoma.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let csvData = []
let totalAirdrop = 0
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)


async function getBalance(wallet, proxy = null) {
    let type = 'gitcoin'

    if (wallet.includes('cosmos')) {
        type = 'cosmos'
    } else if (wallet.includes('osmo')) {
        type = 'osmosis'
    } else if (wallet.includes('stars')) {
        type = 'badkids'
    } else if (wallet.includes('tpknam')) {
        type = 'ts'
    }

    let config = {
        method: 'GET',
        url: `https://api.namada.red/api/v1/airdrop/${type}/${wallet.toLowerCase()}`,
        timeout: 5000,
        headers: {
            "accept": "*/*",
            "accept-language": "uk",
            "sec-ch-ua": "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "Referer": "https://rpgfdrop.namada.net/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
    }

    if (proxy) {
        config.proxy = proxy
    }

    let isBalancesFetched = false
    let retries = 0
    while (!isBalancesFetched) {
        await cloudscraper(config).then(async response => {
            const data = JSON.parse(response)
            stats[wallet].airdrop = data.amount
            totalAirdrop += stats[wallet].airdrop
            isBalancesFetched = true
        }).catch(e => {
            retries++
            if (retries > 5) {
                stats[wallet].airdrop = 'Fetch error'
                isBalancesFetched = true
            }

            if (debug) console.log('balances', e.toString())
        })
    }
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

    await getBalance(wallet, proxy)

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
        path: './results/anoma.csv',
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


export async function anomaAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}