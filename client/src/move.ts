import {Piece, Board, Result, isResult} from "./board";

const names: string[] = ["", "ライオン", "ぞう", "きりん", "ひよこ", "にわとり"];

export type Move = Normal | Drop;

export namespace Move {
    // compare two boards and detect what move is done
    export function detect_move(b: Board, nb: Board): Move {
        let changed: [number, number, Piece, Piece][] = [];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 3; x++) {
                let p  = b .get(x, y);
                let np = nb.get(x, y);
                if (p !== np) changed.push([x, y, p, np]);
            }
        }
        if (changed.length === 1) {
            let [[nx, ny, p, np]] = changed;
            return new Drop(np, nx, ny, b, nb);
        }
        else {
            if (changed[1][3] === Piece.Empty) changed = changed.reverse();
            let [[x, y, p], [nx, ny]] = changed;
            return new Normal(x, y, nx, ny, b, nb);
        }
    }

    // return all possible moves from a given board
    export function possible_moves(b: Board): Move[] {
        let bs = b.next_boards();
        if (isResult(bs)) {
            // assert: bs === Result.Lose
            return [];
        }
        else {
            let r: Move[] = [];
            for (let nb of bs) r.push(detect_move(b, nb));
            return r;
        }
    }
}

function basename(x: number, y: number, p: Piece) {
    let s = Piece.mine_p(p) ? "▲" : "△";
    s += "CBA"[x] + (4 - y);
    s += names[Piece.kind(p)];
    return s;
}

// an operation that moves a piece at (x, y) to (nx, ny)
export class Normal {
    constructor(
        public x: number,
        public y: number,
        public nx: number,
        public ny: number,
        public old_board: Board,
        public new_board: Board
    ) { }

    piece(): Piece {
        return this.new_board.get(this.nx, this.ny);
    }

    promotion_p(): boolean {
        return this.old_board.get(this.x, this.y) !== this.piece();
    }

    captured_piece(): Piece {
        return this.old_board.get(this.nx, this.ny);
    }

    match_p(query: any): boolean {
        if (this.x !== query.x) return false;
        if (this.y !== query.y) return false;
        if (query.nx !== undefined && this.nx !== query.nx) return false;
        if (query.ny !== undefined && this.ny !== query.ny) return false;
        return true;
    }

    // return a record string
    toString(): string {
        let p = this.old_board.get(this.x, this.y);
        let s = basename(this.nx, this.ny, p);

        let old_board = this.old_board;
        let x = this.x;
        let y = this.y;
        let nx = this.nx;
        let ny = this.ny;
        if (!Piece.mine_p(p)) {
            old_board = old_board.reverse().flip();
            x = 2 - x;
            y = 3 - y;
            nx = 2 - nx;
            ny = 3 - ny;
            p = Piece.opponent[p];
        }
        if (p === Piece.Chick && ny === 3) return s + "成";

        // check ambiguity: is there another move that p to the same cell?
        for (let move of Move.possible_moves(old_board)) {
            if (move instanceof Normal && move.new_board.get(nx, ny) === p) {
                // ignore self
                if (x === move.x && y === move.y) continue;

                // if the other move is promotion, there is no ambiguity
                if (move.old_board.get(move.x, move.y) !== p) continue;

                if (x === nx && y < ny && move.y < move.ny) {
                    // both are up moves, and no horizontal move
                    s += "直";
                }
                else if (y === move.y) {
                    // the vertical direction is the same (or no vertical move)
                    s += x < nx ? "左" : "右";
                }
                else if (y < ny) {
                    s += "上";
                }
                else if (y > ny) {
                    s += "引";
                }
                else {
                    s += "寄";
                }
            }
        }

        return s;
    }
}

// an operation that drops a piece in hand into (nx, ny)
export class Drop {
    constructor(
        public p: number,
        public nx: number,
        public ny: number,
        public old_board: Board,
        public new_board: Board
    ) { }

    match_p(query: any): boolean {
        if (this.p !== query.p) return false;
        if (query.nx !== undefined && this.nx !== query.nx) return false;
        if (query.ny !== undefined && this.ny !== query.ny) return false;
        return true;
    }

    toString(): string {
        let s = basename(this.nx, this.ny, this.p);

        for (let move of Move.possible_moves(this.old_board)) {
            if (move instanceof Normal && move.new_board.get(this.nx, this.ny) === this.p) {
                s += "打";
                break;
            }
        }

        return s;
    }
}
