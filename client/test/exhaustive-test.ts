import {Board, Result, isResult} from "../src/board";
import {load_ai} from "./ai-loader";

declare function require(s: string): any;
let fs = require("fs");

let ai = load_ai();

let stack = Board.init().next_boards();
if (isResult(stack)) throw new Error("broken");

let visited: { [key: string]: boolean } = {};

let expected = fs.readFileSync("../precomp/9.txt", "utf-8").split("\n");
expected.pop();

let i = 0;

while (true) {
    let b = stack.pop();
    if (b == null) break;

    let r_b = b.reverse();
    let id = r_b.normalize().hashstr();

    if (visited[id]) continue;
    visited[id] = true;

    if (id !== expected[i]) {
        throw new Error("unknown board: " + i);
    }
    if (++i % 1000 === 0) {
        console.log("" + i + " / " + expected.length);
    }

    if (isResult(r_b.next_boards())) continue;
    let [depth, nb] = ai.search(b);
    if (depth <= 4) continue;

    let nbs = nb.normalize().next_boards();
    if (isResult(nbs)) {
        if (nbs === Result.Lose) continue;
        throw Error("BOO!");
    }
    else {
        for (let nnb of nbs) {
            stack.push(nnb);
        }
    }
}
if (i !== expected.length) throw new Error("error");
console.log("OK!");
