import { aethirAirdropChecker } from "./checkers/aethir.js"
import { aiarenaAirdropChecker } from "./checkers/aiarena.js"
import { availAirdropChecker } from "./checkers/avail.js"
import { availStarknetAirdropChecker } from "./checkers/avail_starknet.js"
import { ionetAirdropChecker } from "./checkers/ionet.js"
import { kreskoAirdropChecker } from "./checkers/kresko.js"
import { layerzeroAirdropChecker } from "./checkers/layerzero.js"
import { orderlyAirdropChecker } from "./checkers/orderly.js"
import { spectralAirdropChecker } from "./checkers/spectral.js"
import { taikoAirdropChecker } from "./checkers/taiko.js"
import { zksyncAirdropChecker } from "./checkers/zksync.js"
import { entryPoint } from "./utils/common.js"

async function startMenu(menu) {
    let startOver = true
    if (menu === undefined) {
        mode = await entryPoint()
    } else {
        startOver = false
    }

    switch (mode) {
        case "layerzero":
            layerzeroAirdropChecker()
            break
        case "orderly":
            orderlyAirdropChecker()
            break
        case "aiarena":
            aiarenaAirdropChecker()
            break
        case "aethir":
            aethirAirdropChecker()
            break
        case "zksync":
            zksyncAirdropChecker()
            break
        case "kresko":
            kreskoAirdropChecker()
            break
        case "taiko":
            taikoAirdropChecker()
            break
        case "ionet":
            ionetAirdropChecker()
            break
        case "spectral":
            spectralAirdropChecker()
            break
        case "avail":
            availAirdropChecker()
            break
        case "avail_starknet":
            availStarknetAirdropChecker()
            break
    }
}

const args = process.argv.slice(2)
let mode = args[0]

await startMenu(mode)
