export enum Piece {
    Empty, Lion, Elephant, Giraffe, Chick, Hen
}

export namespace Piece {
    export function kind(p: Piece) {
        return p % 8;
    }
    export function mine_p(p: Piece) {
        return Piece.Lion <= p && p <= Piece.Hen;
    }
    export const opponent: Piece[] = [];

    for (let p = Piece.Empty; p <= Piece.Hen; p++) {
        opponent[p] = p === Piece.Empty ? p : p + 8;
        opponent[p + 8] = p;
    }
}

export const enum Result {
    Lose, Win
}

export function isResult(r: Board[] | Result): r is Result {
    return r === Result.Win || r === Result.Lose;
}

const move = [
    [ [ 0, 0] ],
    [ [-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [0, 0] ],
    [ [-1, 1],         [1, 1],                  [-1, -1],          [1, -1], [0, 0] ],
    [          [0, 1],         [-1, 0], [1, 0],           [0, -1],          [0, 0] ],
    [          [0, 1],                                                      [0, 0] ],
    [ [-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0],           [0, -1],          [0, 0] ],
];

const shift4: number[] = [];
for (let i = 0; i <= 12; i++) shift4[i] = Math.pow(16, i);

export class Board {
    cells: number;

    hands: number;

    constructor(cells: number, hands: number) {
        this.cells = cells;
        this.hands = hands;
    }

    get(x: number, y: number): Piece {
        return Math.floor(this.cells / shift4[x * 4 + y]) % 16;
    }

    del(x: number, y: number) {
        let p = this.get(x, y);
        let cells = this.cells - p * shift4[x * 4 + y];
        return new Board(cells, this.hands);
    }

    put(x: number, y: number, p: Piece) {
        // assume that the cell (x, y) is empty
        let cells = this.cells + p * shift4[x * 4 + y];
        return new Board(cells, this.hands);
    }

    hand(p: Piece) {
        // assume that p is E, G, C, or their opponents
        if (p >= 8) return this.hands >> ((p - Piece.Elephant - 8) * 2 + 6) & 3;
        return this.hands >> ((p - Piece.Elephant) * 2) & 3;
    }

    inc_hand(p: Piece) {
        // assume that p is E, G, C, or H and that overflow does not occur
        if (p === Piece.Hen) p = Piece.Chick;
        let hands = this.hands + (1 << ((p - Piece.Elephant) * 2));
        return new Board(this.cells, hands);
    }

    dec_hand(p: Piece) {
        // assume that p is E, G, or C, and that underflow does not occur
        let hands = this.hands - (1 << ((p - Piece.Elephant) * 2));
        return new Board(this.cells, hands);
    }

    normalize() {
        let nb = this.flip();
        return nb.cells < this.cells ? nb : this;
    }

    flip() { // left <=> right
        let cells =         this.cells              % shift4[4] * shift4[8];
        cells += Math.floor(this.cells / shift4[4]) % shift4[4] * shift4[4];
        cells += Math.floor(this.cells / shift4[8]) % shift4[4];
        return new Board(cells, this.hands);
    }

    reverse() {
        let hands = (this.hands >> 6) | ((this.hands & 0x3f) << 6);
        let cells = 0;
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 3; x++) {
                let p = this.get(x, 3 - y);
                if (p) cells += Piece.opponent[p] * shift4[x * 4 + y];
            }
        }
        return new Board(cells, hands);
    }

    hash(mod: number) {
        let h = this.hands % mod;
        let s = shift4[12] % mod;
        return (h * s + this.cells) % mod;
    }

    next_boards(): Board[] | Result {
        let boards: Board[] = [];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 3; x++) {
                let p = this.get(x, y);
                if (p >= Piece.Lion && p <= Piece.Hen) {
                    let bb = this.del(x, y);
                    for (let i = 0; ; i++) {
                        let [dx, dy] = move[p][i];
                        let nx = x + dx;
                        if (nx < 0 || nx > 2) continue;
                        let ny = y + dy;
                        if (ny < 0 || ny > 3) continue;
                        if (nx === x && ny === y) break;

                        let np = this.get(nx, ny);
                        if (Piece.Lion <= np && np <= Piece.Hen) continue; /* cannot move */
                        if (np === Piece.opponent[Piece.Lion]) return Result.Win; /* winning board */

                        let nb = bb;

                        /* capture */
                        if (np) nb = nb.del(nx, ny).inc_hand(Piece.opponent[np]);

                        nb = nb.put(nx, ny, (p === Piece.Chick && ny === 3) ? Piece.Hen : p);
                        boards.push(nb);
                    }
                }
                else if (p === Piece.Empty) {
                    /* put */
                    for (let np = Piece.Elephant; np <= Piece.Chick; np++) {
                        if (this.hand(np)) {
                            boards.push(this.put(x, y, np).dec_hand(np));
                        }
                    }
                }
            }
        }
        for (let x = 0; x < 3; x++) {
            if (this.get(x, 0) === Piece.opponent[Piece.Lion]) return Result.Lose; /* losing board */
        }
        return boards;
    }

    static init(): Board {
        let b = new Board(0, 0);
        b = b.put(2, 3, Piece.opponent[Piece.Giraffe]);
        b = b.put(1, 3, Piece.opponent[Piece.Lion]);
        b = b.put(0, 3, Piece.opponent[Piece.Elephant]);
        b = b.put(0, 0, Piece.Giraffe);
        b = b.put(1, 0, Piece.Lion);
        b = b.put(2, 0, Piece.Elephant);
        b = b.put(1, 1, Piece.Chick);
        b = b.put(1, 2, Piece.opponent[Piece.Chick]);
        return b;
    }

    dead_p(): boolean {
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 3; x++) {
                if (this.get(x, y) === Piece.Lion) return false;
            }
        }
        return true;
    }

    hashstr() {
        let cells = ("000000000000" + this.cells.toString(16)).substr(-12);
        let hands = ("000" + this.hands.toString(16)).substr(-3);
        return hands + cells;
    }

    static from_hashstr(s: string): Board {
        let hands = parseInt(s.substring(0, 3), 16);
        let cells1 = parseInt(s.substring(3, 7), 16);
        let cells2 = parseInt(s.substring(7), 16);
        let cells = cells1 * shift4[8] + cells2;
        return new Board(cells, hands);
    }

    toString(): string {
        const name = ".LEGCH***legch***";
        let r = "";
        for (let y = 3; y >= 0; y--) {
            for (let x = 2; x >= 0; x--) {
                r += name[this.get(x, y)];
            }
            if (y === 3 || y === 0) {
                r += " ";
                let hands = (this.hands >> (y === 3 ? 6 : 0)) & 0x3f;
                for (let i = 0; i < 3; i++) {
                    for (let m = (hands >> (i * 2)) & 3; m > 0; m--) {
                        let p = Piece.Elephant + i;
                        r += name[y === 3 ? Piece.opponent[p] : p];
                    }
                }
            }
            if (y !== 0) r += "\n";
        }
        return r;
    }
}
