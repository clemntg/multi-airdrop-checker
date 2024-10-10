import { aethirAirdropChecker } from "./checkers/aethir.js"
import { aiarenaAirdropChecker } from "./checkers/aiarena.js"
import { carvAirdropChecker } from "./checkers/carv.js"
import { debridgeAirdropChecker } from "./checkers/debridge.js"
import { eigenlayerAirdropChecker } from "./checkers/eigenlayer.js"
import { energyAirdropChecker } from "./checkers/energy.js"
import { grassAirdropChecker } from "./checkers/grass.js"
import { ionetAirdropChecker } from "./checkers/ionet.js"
import { kreskoAirdropChecker } from "./checkers/kresko.js"
import { layerzeroAirdropChecker } from "./checkers/layerzero.js"
import { optimismAirdropChecker } from "./checkers/optimism.js"
import { orderlyAirdropChecker } from "./checkers/orderly.js"
import { scrollPumpAirdropChecker } from "./checkers/scroll-pump.js"
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
        case "carv":
            carvAirdropChecker()
            break
        case "optimism":
            optimismAirdropChecker()
            break
        case "scroll-pump":
            scrollPumpAirdropChecker()
            break
        case "energy":
            energyAirdropChecker()
            break
        case "grass":
            grassAirdropChecker()
            break
        case "debridge":
            debridgeAirdropChecker()
            break
        case "eigenlayer":
            eigenlayerAirdropChecker()
            break
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
    }
}

const args = process.argv.slice(2)
let mode = args[0]

await startMenu(mode)
