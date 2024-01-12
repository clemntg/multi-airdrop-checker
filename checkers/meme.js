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
    { name: 'points', color: 'green', alignment: "right"},
]

let headers = [
    { id: 'n', title: '№'},
    { id: 'wallet', title: 'wallet'},
    { id: 'points', title: 'points'},
]

let requestHeaders = {
    "authority": "memefarm-api.memecoin.org",
    "accept": "application/json",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9,ru;q=0.8,bg;q=0.7",
    "origin": "https://www.memecoin.org",
    "sec-ch-ua": "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "Windows",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

let debug = false
let p
let csvWriter
let wallets = readWallets('./addresses/private_keys.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let csvData = []
let totalPoints = 0
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

async function getPoints(wallet, proxy = null, walletClient) {
    const walletAddress = walletClient.account.address
    let config = {
        timeout: 5000,
        headers: requestHeaders
    }

    if (proxy) {
        if (proxy.includes('http')) {
            config.httpsAgent = new HttpsProxyAgent(proxy)
        }

        if (proxy.includes('socks')) {
            config.httpsAgent = new SocksProxyAgent(proxy)
        }
    }

    const message = `The wallet will be used for MEME allocation. If you referred friends, family, lovers or strangers, ensure this wallet has the NFT you referred.\n\nBut also...\n\nNever gonna give you up\nNever gonna let you down\nNever gonna run around and desert you\nNever gonna make you cry\nNever gonna say goodbye\nNever gonna tell a lie and hurt you\n\nWallet: ${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)}`

    const signature = await walletClient.signMessage({
        account: privateKeyToAccount(privateKeyConvert(wallet)),
        message: message,
    })

    let isFetched = false
    let retries = 0
    let token = ''
    while (!isFetched) {
        await axios.post(`https://memefarm-api.memecoin.org/user/wallet-auth`, {
            address: walletAddress,
            delegate: walletAddress,
            message: message,
            signature: signature
        }, config).then(async response => {
            token = response.data.accessToken
        }).catch(e => {
            if (debug) console.log('points', e.toString())

            retries++

            if (retries >= 3) {
                isFetched = true
            }
        })

        config.headers.authorization = `Bearer ${token}`
        await axios.get(`https://memefarm-api.memecoin.org/user/tasks`, config).then(async response => {
            // console.log(response.data)
            stats[walletAddress].points = response.data.points.current
            totalPoints += stats[walletAddress].points
            isFetched = true
        }).catch(e => {
            if (debug) console.log('points', e.toString())

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
    const walletAddress = walletClient.account.address
    stats[walletAddress] = {
        points: 0
    }

    await getPoints(wallet, proxy, walletClient)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index)+1,
        wallet: walletAddress,
        points: stats[walletAddress].points,
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
        path: './results/meme.csv',
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
        points: totalPoints
    }

    p.addRow(row, { color: "cyan" })
}

export async function memeAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}