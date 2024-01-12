import { anomaAirdropChecker } from "./checkers/anoma.js"
import { dymensionAirdropChecker } from "./checkers/dymension.js"
import { frameAirdropChecker } from "./checkers/frame.js"
import { mantaAirdropChecker } from "./checkers/manta.js"
import { memeAirdropChecker } from "./checkers/meme.js"
import { entryPoint } from "./utils/common.js"

async function startMenu(menu) {
    let startOver = true
    if (menu === undefined) {
        mode = await entryPoint()
    } else {
        startOver = false
    }

    switch (mode) {
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
