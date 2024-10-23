import {
    getKeyByValue,
    readWallets,
    sleep,
    ensureDirectoryExistence
} from '../utils/common.js'
import { Table } from 'console-table-printer'
import { createObjectCsvWriter } from 'csv-writer'
import cliProgress from 'cli-progress'
import path from 'path'
import fs from 'fs'
import Papa from "papaparse"


let columns = [
    { name: 'n', color: 'green', alignment: "right" },
    { name: 'wallet', color: 'green', alignment: "right" },
    { name: 'airdrop1', color: 'green', alignment: "right" },
    { name: 'airdrop2', color: 'green', alignment: "right" },
]

let headers = [
    { id: 'n', title: '№' },
    { id: 'wallet', title: 'wallet' },
    { id: 'airdrop1', title: 'airdrop1' },
    { id: 'airdrop2', title: 'airdrop2' },
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
let totalAirdrop1 = 0
let totalAirdrop2 = 0
let data = []
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

const csvFile = fs.readFileSync('./data/debridge.csv', 'utf8')

Papa.parse(csvFile, {
    header: true,
    delimiter: "\t",
    complete: function(results) {
        results.data.forEach(row => {
            if (row['Wallet address'] && row['Token allocation']) {
                data[row['Wallet address']] = row
            }
        })
    }
})

async function fetchWallet(wallet, index) {
    wallet = wallet.toLowerCase()
    stats[wallet] = {
        airdrop1: data[wallet] ? parseInt(data[wallet]['First distribution']) : 0,
        airdrop2: data[wallet] ? data[wallet]['Second distribution'] ? parseInt(data[wallet]['Second distribution']) : 0 : 0,
    }

    totalAirdrop1 += parseInt(stats[wallet].airdrop1)
    totalAirdrop2 += parseInt(stats[wallet].airdrop2)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index) + 1,
        wallet: wallet,
        airdrop1: stats[wallet].airdrop1,
        airdrop2: stats[wallet].airdrop2,
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

    const csvFilePath = './results/debridge.csv'
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
        airdrop1: totalAirdrop1,
        airdrop2: totalAirdrop2
    }

    p.addRow(row, { color: "cyan" })
}


export async function debridgeAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}