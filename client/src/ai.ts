import {Board, Piece, Result, isResult} from "./board";

// Fake AI

export class AI {
    // An oracle data base that maps a possible board to a move that AI should
    // choose to win.  This is encoded as a perfect hash function (PHF).
    db: number[];

    // Three primes each of which is a seed of the hash functions for PHF.
    ps: number[];

    // Decodes the pre-calculated data base
    constructor(buf: string) {
        // buf is the data base which is encoded in base 93:
        // ASCII code 32, 33, 35-91, 93-126.
        let offset = 0;
        function fetch(n: number): number {
            let r = 0;
            for (let i = 0; i < n; i++) {
                let c = buf.charCodeAt(offset++) - 32;
                r = r * 93 + (c < 2 ? c : c < 60 ? c - 1 : c - 2);
            }
            return r;
        }

        // Extract the seed primes
        this.ps = [fetch(3), fetch(3), fetch(3)];

        // Extract the frequency table for range coder
        let sum = fetch(3);
        let freq = [sum];
        let freq_sym = [0];
        let freq_accum = [0];
        let freq_size = fetch(3);
        let data_size = fetch(3);
        for (let i = 0; i < freq_size - 1; i++) {
            let n = fetch(4);
            let c = Math.floor(n / (34 * 37 * 3));
            let ch = n % (34 * 37 * 3);
            freq[ch] = c;
            freq_sym.push(ch);
            freq_accum.push(sum);
            sum += c;
        }
        freq_accum.push(sum);

        // Decompress the data base
        let low = fetch(5);
        let range = Math.pow(93, 5);
        let db: number[] = [];
        for (let j = 0; j < data_size; j++) {
            let v = Math.floor(range / sum);
            let l = 0, h = freq_accum.length - 1;
            while (l < h) {
                let k = Math.floor((l + h) / 2);
                if (freq_accum[k + 1] <= low / v) {
                    l = k + 1;
                }
                else {
                    h = k;
                }
            }
            let c = freq_sym[l];
            low -= v * freq_accum[l];
            range = v * freq[c];
            while (range < Math.pow(93, 4)) {
                range *= 93;
                low = ((low * 93) + fetch(1)) % Math.pow(93, 5);
            }
            db.push(c);
        }

        this.db = db;
    }

    // Get the move index for a depth-5 (or more) boards
    lookup_db(b: Board): [number, number] {
        // lookup of PHF
        let hs: number[] = [];
        let i = 0;
        let psum = 0;
        for (let p of this.ps) {
            let h = b.hash(p) + psum;
            psum += p;
            hs.push(h);
            i += this.db[h];
        }
        let n = Math.floor(this.db[hs[i % 3]] / 3);
        let depth = Math.floor(n / 34) * 2 + 5;
        let idx = n % 34;
        return [depth, idx];
    }

    // Check if the depth of a given board is 3 or less, and if so,
    // return a pair of depth and next board
    easy_search(bs1: Board[]): [number, Board] | null {
        // check if "try" is possible: is any child in Result.Lose state?
        let bs2s: [Board, Board[]][] = [];
        for (let idx = 0; idx < bs1.length; idx++) {
            let bs2 = bs1[idx].reverse().normalize().next_boards();
            if (isResult(bs2)) {
                if (bs2 === Result.Lose) return [1, bs1[idx]]; // can do "try"
            }
            else {
                bs2s.push([bs1[idx], bs2]);
            }
        }

        // shallow search to check if b is depth-3
        //
        // b: the current board (white)
        // b2: the next board of b (black)
        // b3: the next board of b2 (white)
        //
        // if any b2 is depth-2, then b is depth-3
        for (let [b2, bs2] of bs2s) {
            let win = true;
            // if all b3 is depth-1, then b2 is depth-2 and b is depth-3
            for (let b3 of bs2) {
                let bs3 = b3.reverse().normalize().next_boards();

                // check if b3 is depth-1
                if (isResult(bs3)) {
                    if (bs3 === Result.Win) continue;
                    win = false;
                    break;
                }

                // check is any a4 is depth-0 ("try")
                win = false;
                for (let b4 of bs3) {
                    if (b4.reverse().normalize().next_boards() === Result.Lose) {
                        win = true;
                        break;
                    }
                }

                if (!win) break; // one b3 is not depth-1
            }

            if (win) {
                return [3, b2]; // b2 is depth-2
            }
        }

        return null;
    }

    // Make a board in that the opponent's lion is captured
    private calc_final_board(nr_nb: Board): Board | never {
        // Board#next_boards() returns Result::Win when a player can capture
        // the opponent's lion, instead of a board in that the lion is missing.
        // This function can be used to get such a board.
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 3; x++) {
                if (nr_nb.get(x, y) === Piece.opponent[Piece.Lion]) {
                    // delete the opponent's lion
                    nr_nb = nr_nb.del(x, y);
                    // search a board that any piece of mine can move to the
                    // cell where the opponent's lion was
                    let nr_nnbs = nr_nb.next_boards();
                    if (!isResult(nr_nnbs)) {
                        for (let nr_nnb of nr_nnbs) {
                            let p = nr_nnb.get(x, y);
                            if (p === Piece.Empty) continue;
                            if (nr_nb.hand(p) > nr_nnb.hand(p)) continue;
                            return nr_nnb;
                        }
                    }
                }
            }
        }
        throw new Error("unreachable");
    }

    // main search
    private search_core(nr_b: Board): [number, Board] {
        let nr_nbs = nr_b.next_boards();
        if (isResult(nr_nbs)) {
            // assert: nr_nbs == Result.Win
            // we can capture the opponent's lion
            return [1, this.calc_final_board(nr_b)];
        }
        else {
            // check if the board is depth-3 or less
            let v = this.easy_search(nr_nbs);
            if (v) return v;

            // if the board is depth-5 or more, lookup the data base
            let [depth, idx] = this.lookup_db(nr_b);
            return [depth, nr_nbs[idx]];
        }
    }

    // given a white board, returns a pair of depth and next black board
    search(b: Board): [number, Board] {
        let r_b = b.reverse(); // reverse black and white
        let nr_b = r_b.normalize(); // normalize 
        let flipped = r_b !== nr_b; // a flag if normalize caused a flip or not

        // find a next board
        let [depth, nr_nb] = this.search_core(nr_b);

        // invert the reverse and the normalization
        let r_nb = flipped ? nr_nb.flip() : nr_nb;
        let nb = r_nb.reverse();

        // we should go from b to nb
        return [depth, nb];
    }
}
