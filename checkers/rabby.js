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

let columns = [
    { name: 'n', color: 'green', alignment: "right"},
    { name: 'wallet', color: 'green', alignment: "right"},
    { name: 'metamask_swap', color: 'green', alignment: "right"},
    { name: 'rabby_old_user', color: 'green', alignment: "right"},
    { name: 'rabby_nadge', color: 'green', alignment: "right"},
    { name: 'rabby_nft', color: 'green', alignment: "right"},
    { name: 'extra_bouns', color: 'green', alignment: "right"},
    { name: 'points', color: 'green', alignment: "right"},
]

let headers = [
    { id: 'n', title: '№'},
    { id: 'wallet', title: 'wallet'},
    { id: 'metamask_swap', title: 'metamask_swap'},
    { id: 'rabby_old_user', title: 'rabby_old_user'},
    { id: 'rabby_nadge', title: 'rabby_nadge'},
    { id: 'rabby_nft', title: 'rabby_nft'},
    { id: 'extra_bouns', title: 'extra_bouns'},
    { id: 'points', title: 'points'},
]

let debug = false
let p
let csvWriter
let wallets = readWallets('./addresses/rabby.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let csvData = []
let totalpoints = 0
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

async function checkpoints(wallet, proxy = null) {
    let config = {
        timeout: 5000
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

    stats[wallet].metamask_swap = 0
    stats[wallet].rabby_old_user = 0
    stats[wallet].rabby_nadge = 0
    stats[wallet].rabby_nft = 0
    stats[wallet].extra_bouns = 0
    stats[wallet].points = 0
    
    while (!isFetched) {
        await axios.get(`https://api.rabby.io/v1/points/snapshot?id=${wallet.toLowerCase()}`, config).then(async response => {
            stats[wallet].metamask_swap = response.data.metamask_swap
            stats[wallet].rabby_old_user = response.data.rabby_old_user
            stats[wallet].rabby_nadge = response.data.rabby_nadge
            stats[wallet].rabby_nft = response.data.rabby_nft
            stats[wallet].extra_bouns = response.data.extra_bouns
            stats[wallet].points = parseFloat(response.data.metamask_swap) + parseFloat(response.data.rabby_old_user) + parseFloat(response.data.rabby_nadge) + parseFloat(response.data.rabby_nft) + parseFloat(response.data.extra_bouns)
            totalpoints += stats[wallet].points > 0 ? parseFloat(stats[wallet].points) : 0
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
        points: 0
    }

    await checkpoints(wallet, proxy)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index)+1,
        wallet: wallet,
        points: stats[wallet].points,
        metamask_swap: stats[wallet].metamask_swap,
        rabby_old_user: stats[wallet].rabby_old_user,
        rabby_nadge: stats[wallet].rabby_nadge,
        rabby_nft: stats[wallet].rabby_nft,
        extra_bouns: stats[wallet].extra_bouns,
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
        path: './results/rabby.csv',
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
        points: totalpoints
    }

    p.addRow(row, { color: "cyan" })
}

export async function rabbypointsChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}