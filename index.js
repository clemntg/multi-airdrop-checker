import { mantaAirdropChecker } from "./checkers/manta.js"
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
    }
}

const args = process.argv.slice(2)
let mode = args[0]

await startMenu(mode)
