import {
    generateRandomUserAgent,
    getKeyByValue,
    readWallets,
    ensureDirectoryExistence
} from '../utils/common.js'
import axios from "axios"
import { Table } from 'console-table-printer'
import { createObjectCsvWriter } from 'csv-writer'
import cliProgress from 'cli-progress'
import { HttpsProxyAgent } from "https-proxy-agent"
import { SocksProxyAgent } from "socks-proxy-agent"

let columns = [
    { name: 'n', color: 'green', alignment: "right"},
    { name: 'wallet', color: 'green', alignment: "right"},
    { name: 'airdrop', color: 'green', alignment: "right"},
    { name: 'etherfi', color: 'green', alignment: "right"},
    { name: 'eigen', color: 'green', alignment: "right"},
    { name: 'swell', color: 'green', alignment: "right"},
    { name: 'renzo', color: 'green', alignment: "right"},
    // { name: 'stakestone', color: 'green', alignment: "right"},
    // { name: 'kelpdao', color: 'green', alignment: "right"},
    // { name: 'eigenpie', color: 'green', alignment: "right"},
    // { name: 'puffer', color: 'green', alignment: "right"},
]

let headers = [
    { id: 'n', title: '№'},
    { id: 'wallet', title: 'wallet'},
    { id: 'airdrop', title: 'airdrop'},
    { id: 'etherfi', title: 'etherfi'},
    { id: 'eigen', title: 'eigen'},
    { id: 'swell', title: 'swell'},
    { id: 'renzo', title: 'renzo'},
    // { id: 'stakestone', title: 'stakestone'},
    // { id: 'kelpdao', title: 'kelpdao'},
    // { id: 'eigenpie', title: 'eigenpie'},
    // { id: 'puffer', title: 'puffer'},
]

let debug = true
let p
let csvWriter
let wallets = readWallets('./addresses/evm.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let csvData = []
let totalAirdrop = 0
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

async function checkAirdrop(wallet, proxy = null) {
    let config = {
        timeout: 35000,
        "headers": {
            "User-Agent": generateRandomUserAgent(),
        },
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

    while (!isFetched) {
        await axios.get(`https://checkeigen.vercel.app/api/getAmount?address=${wallet}`, config).then(async response => {
            stats[wallet].etherfi = response.data.etherfi > 0 ? parseFloat(response.data.etherfi).toFixed(2) : 0
            stats[wallet].eigen = response.data.eigenpie > 0 ? parseFloat(response.data.eigenpie).toFixed(2) : 0
            stats[wallet].swell = response.data.swell > 0 ? parseFloat(response.data.swell).toFixed(2) : 0
            stats[wallet].renzo = response.data.renzo > 0 ? parseFloat(response.data.renzo).toFixed(2) : 0
            // stats[wallet].kelpdao = parseFloat(response.data.)
            // stats[wallet].eigenpie = parseFloat(response.data.)
            // stats[wallet].puffer = parseFloat(response.data.)
            stats[wallet].airdrop = parseFloat(stats[wallet].etherfi) + parseFloat(stats[wallet].eigen) + parseFloat(stats[wallet].swell) + parseFloat(stats[wallet].renzo)
            totalAirdrop += parseFloat(stats[wallet].airdrop)
            isFetched = true
        }).catch(e => {
            if (debug) console.log('balances', e.toString())

            retries++

            if (retries >= 3) {
                isFetched = true
            }
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

    await checkAirdrop(wallet, proxy)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index)+1,
        wallet: wallet,
        airdrop: stats[wallet].airdrop,
        etherfi: stats[wallet].etherfi,
        eigen: stats[wallet].eigen,
        swell: stats[wallet].swell,
        renzo: stats[wallet].renzo,
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

    const csvFilePath = './results/eigenlayer.csv'
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
        airdrop: totalAirdrop.toFixed(2)
    }

    p.addRow(row, { color: "cyan" })
}

export async function eigenlayerAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}