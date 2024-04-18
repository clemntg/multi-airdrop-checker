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
import { privateKeyToAccount } from "viem/accounts"
import * as starknet from "starknet"

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
let wallets = readWallets('./addresses/starknet_keys.txt')
let addresses = readWallets('./addresses/starknet_addresses.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let csvData = []
let totalAirdrop = 0
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
const provider = new starknet.RpcProvider({ nodeUrl: 'https://starknet.blockpi.network/v1/rpc/public' })

function getMessage(timestamp) {
    return {
        types: {
            StarkNetDomain: [
                {
                    name: 'name',
                    type: 'felt',
                },
                {
                    name: 'version',
                    type: 'felt',
                },
                {
                    name: 'chainId',
                    type: 'felt',
                },
            ],
            contents: [
                {
                    name: 'Greetings',
                    type: 'string',
                },
                {
                    name: 'Sign',
                    type: 'felt',
                },
                {
                    name: 'timestamp',
                    type: 'felt',
                },
            ],
            Message: [
                {
                    name: 'contents',
                    type: 'contents',
                },
            ],
        },
        primaryType: 'Message',
        domain: {
            name: 'Avail Rewards',
            version: '1',
            chainId: '0x534e5f4d41494e',
        },
        message: {
            contents: {
                Greetings: 'Greetings from Avail!',
                Sign: 'Sign to Check your Eligibility',
                timestamp: String(timestamp),
            },
        },
    }
}

async function getSignature(account, message) {
    const signed = await account.signMessage(message)
    return [String(signed.r), String(signed.s)]
}

async function checkAirdropStarknet(address, privatekey, proxy = null) {

    const account = new starknet.Account(provider, address, privatekey)
    const currentTimestamp = String(Math.floor(new Date().getTime() / 1000))
    const message = getMessage(currentTimestamp)
    const signature = await getSignature(account, message)

    let config = {
        timeout: 100000
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
    while (!isFetched) {
        await axios.post(`https://claim-api.availproject.org/check-rewards`, {
            account: address,
            type: 'ARGENTX',
            timestamp: currentTimestamp,
            signedMessage: signature
        }, config).then(async response => {
            stats[walletAddress].airdrop = response.data.message === 'Not Eligible' ? 0 : response.data.data.reward_amount_avail
            totalAirdrop += stats[walletAddress].airdrop
            isFetched = true
        }).catch(e => {
            if (debug) console.log('airdrop', e)

            retries++

            if (retries >= 3) {
                isFetched = true
            }
        })
    }
}

async function fetchWallet(privatekey, index) {

    let proxy = null
    if (proxies.length) {
        if (proxies[index]) {
            proxy = proxies[index]
        } else {
            proxy = proxies[0]
        }
    }

    stats[addresses[index]] = {
        airdrop: 0
    }

    await checkAirdropStarknet(addresses[index], privatekey, proxy)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index) + 1,
        wallet: addresses[index],
        airdrop: stats[addresses[index]].airdrop,
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
        path: './results/avail_starknet.csv',
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

export async function availStarknetAirdropChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}