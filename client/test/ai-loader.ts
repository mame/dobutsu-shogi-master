import {AI} from "../src/ai";

declare function require(s: string): any;

export function load_ai() {
    let fs = require("fs");
    let dat = fs.readFileSync("../precomp/ai.txt", "utf-8");
    return new AI(dat);
}
