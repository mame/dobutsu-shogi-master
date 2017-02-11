import * as assert from "power-assert";
import {Piece, Board, Result, isResult} from "../src/board";
import {load_ai} from "./ai-loader";

describe("AI", () => {
    let ai = load_ai();

    it("should win against a random player", () => {
        for (let i = 0; i < 100; i++) {
            let b = Board.init();
            while (true) {
                let bs = b.next_boards();
                if (isResult(bs)) {
                    assert.equal(bs, Result.Lose);
                    if (bs === Result.Lose) break;
                }
                else {
                    let i = Math.floor(Math.random() * bs.length);
                    let nb = bs[i];
                    let nbs = nb.reverse().next_boards();
                    if (isResult(nbs)) {
                        assert.equal(nbs, Result.Win);
                        if (nbs === Result.Win) break;
                    }
                    else {
                        let [depth, new_board] = ai.search(nb);
                        b = new_board;
                    }
                }
            }
        }
    });
});
