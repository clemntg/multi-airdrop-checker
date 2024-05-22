import { aevoAirdropChecker } from "./checkers/aevo.js"
import { altlayerAirdropChecker } from "./checkers/altlayer.js"
import { anomaAirdropChecker } from "./checkers/anoma.js"
import { availAirdropChecker } from "./checkers/avail.js"
import { availStarknetAirdropChecker } from "./checkers/avail_starknet.js"
import { driftAirdropChecker } from "./checkers/drift.js"
import { dymensionAirdropChecker } from "./checkers/dymension.js"
import { eigenlayerAirdropChecker } from "./checkers/eigenlayer.js"
import { etherfiAirdropChecker } from "./checkers/etherfi.js"
import { frameAirdropChecker } from "./checkers/frame.js"
import { holographAirdropChecker } from "./checkers/holograph.js"
import { ionetAirdropChecker } from "./checkers/ionet.js"
import { lineaParkAirdropChecker } from "./checkers/linea-park.js"
import { mantaAirdropChecker } from "./checkers/manta.js"
import { memeAirdropChecker } from "./checkers/meme.js"
import { metamaskAirdropChecker } from "./checkers/metamask.js"
import { optimismAirdropChecker } from "./checkers/optimism.js"
import { polyhedraAirdropChecker } from "./checkers/polyhedra.js"
import { qnaAirdropChecker } from "./checkers/qna3.js"
import { rabbypointsChecker } from "./checkers/rabby.js"
import { spectralAirdropChecker } from "./checkers/spectral.js"
import { taikoAirdropChecker } from "./checkers/taiko.js"
import { wefAirdropChecker } from "./checkers/wef.js"
import { wormholeAirdropChecker } from "./checkers/wormhole.js"
import { zetachainAirdropChecker } from "./checkers/zetachain.js"
import { entryPoint } from "./utils/common.js"

async function startMenu(menu) {
    let startOver = true
    if (menu === undefined) {
        mode = await entryPoint()
    } else {
        startOver = false
    }

    switch (mode) {
        case "taiko":
            taikoAirdropChecker()
            break
        case "ionet":
            ionetAirdropChecker()
            break
        case "hologhraph":
            holographAirdropChecker()
            break
        case "spectral":
            spectralAirdropChecker()
            break
        case "drift":
            driftAirdropChecker()
            break
        case "eigenlayer":
            eigenlayerAirdropChecker()
            break
        case "wef":
            wefAirdropChecker()
            break
        case "avail":
            availAirdropChecker()
            break
        case "avail_starknet":
            availStarknetAirdropChecker()
            break
        case "metamask":
            metamaskAirdropChecker()
            break
        case "linea-park":
            lineaParkAirdropChecker()
            break
        case "polyhedra":
            polyhedraAirdropChecker()
            break
        case "aevo":
            aevoAirdropChecker()
            break
        case "etherfi":
            etherfiAirdropChecker()
            break
        case "wormhole":
            wormholeAirdropChecker()
            break
        case "qna":
            qnaAirdropChecker()
            break
        case "optimism":
            optimismAirdropChecker()
            break
        case "altlayer":
            altlayerAirdropChecker()
            break
        case "rabby":
            rabbypointsChecker()
            break
        case "zetachain":
            zetachainAirdropChecker()
            break
        case "manta":
            mantaAirdropChecker()
            break
        case "dymension":
            dymensionAirdropChecker()
            break
        case "frame":
            frameAirdropChecker()
            break
        case "anoma":
            anomaAirdropChecker()
            break
        case "meme":
            memeAirdropChecker()
            break
    }
}

const args = process.argv.slice(2)
let mode = args[0]

await startMenu(mode)
