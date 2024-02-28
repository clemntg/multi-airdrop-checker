import {
    getKeyByValue,
    privateKeyConvert,
    readWallets
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

let columns = [
    { name: 'n', color: 'green', alignment: "right"},
    { name: 'wallet', color: 'green', alignment: "right"},
    { name: 'airdrop', color: 'green', alignment: "right"},
]

let headers = [
    { id: 'n', title: '№'},
    { id: 'wallet', title: 'wallet'},
    { id: 'airdrop', title: 'airdrop'},
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

async function getBalance(wallet, proxy = null, walletClient) {
    const walletAddress = walletClient.account.address.toLowerCase()
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

    const signature = await walletClient.signMessage({
        account: privateKeyToAccount(privateKeyConvert(wallet)),
        message: `AI + DYOR = Ultimate Answer to Unlock Web3 Universe`,
    })

    let isFetched = false
    let retries = 0
    let accessToken = ''
    while (!isFetched) {
        await axios.post(`https://api.qna3.ai/api/v2/auth/login?via=wallet`, {
            wallet_address: walletAddress,
            signature: signature
        }, config).then(async response => {
            accessToken = response.data.data.accessToken
        }).catch(e => {
            if (debug) console.log('token', e.toString())

            retries++

            if (retries >= 3) {
                isFetched = true
            }
        })

        config.headers = {
            'Authorization': `Bearer ${accessToken}`
        }

        await axios.post(`https://api.qna3.ai/api/v2/graphql`, {
            query: 'query loadAirDrop {\n  airdrop {\n    binance_claim {\n      amount\n      binance_address\n      id\n    }\n    current {\n      contract\n      end_at\n      start_at\n    }\n    claim {\n      amount\n      claimed\n      proof\n      id\n    }\n    claimed {\n      amount\n      updated_at\n    }\n  }\n}',
            variables: {}
        }, config).then(async response => {
            stats[walletAddress].airdrop = response.data.data.airdrop.claim ? response.data.data.airdrop.claim?.amount : 0
            totalAirdrop += parseInt(stats[walletAddress].airdrop)
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

    const walletClient = createWalletClient({ chain: mainnet, account: privateKeyToAccount(privateKeyConvert(wallet)), transport: http() })
    const walletAddress = walletClient.account.address.toLowerCase()
    stats[walletAddress] = {
        airdrop: 0
    }

    await getBalance(wallet, proxy, walletClient)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index)+1,
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

    csvWriter = createObjectCsvWriter({
        path: './results/qna.csv',
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

export async function qnaAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}