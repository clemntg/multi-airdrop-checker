import {
    getKeyByValue,
    readWallets,
    sleep
} from '../utils/common.js'
import { Table } from 'console-table-printer'
import { createObjectCsvWriter } from 'csv-writer'
import cliProgress from 'cli-progress'
import path from 'path'
import fs from 'fs'


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
let wallets = readWallets('./addresses/starknet.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let csvData = []
let totalAirdrop = 0
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

let combinedData = []

for (let i = 0; i < 7; i++) {
    const fileContent = fs.readFileSync(`./starknet/starknet-${i}.json`, 'utf8')
    const jsonData = JSON.parse(fileContent)
    combinedData = combinedData.concat(jsonData.eligibles)
}

for (let i = 0; i < 6; i++) {
    const fileContent = fs.readFileSync(`./starknet/eth/eth-${i}.json`, 'utf8')
    const jsonData = JSON.parse(fileContent)
    combinedData = combinedData.concat(jsonData.eligibles)
}


function findByIdentity(identity) {
    return combinedData.find(el => el.identity === identity.toLowerCase())
}

async function fetchWallet(wallet, index) {
    if (wallet.length > 42) {
        if (!wallet.startsWith('0x0')) {
            wallet = wallet.replace('0x', '0x0')
        }
    }

    const data = findByIdentity(wallet)
    stats[wallet] = {
        airdrop: data ? data.amount : 0
    }

    totalAirdrop += parseInt(stats[wallet].airdrop)

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

    let batchSize = 1000
    let timeout = 1

    const batchCount = Math.ceil(wallets.length / batchSize)
    const walletPromises = []

    p = new Table({
        columns: columns,
        sort: (row1, row2) => +row1.n - +row2.n
    })

    csvWriter = createObjectCsvWriter({
        path: './results/starknet.csv',
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


export async function starknetAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}