use std::fmt;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct Board(pub u64);

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Piece(u8);

#[derive(PartialEq, Eq)]
pub struct Move(i8, i8);

#[derive(PartialEq, Eq)]
pub enum Result { Win, Lose, Unknown(Vec<Board>) }

pub const EMPTY    : Piece = Piece(0);
pub const LION     : Piece = Piece(1);
pub const ELEPHANT : Piece = Piece(2);
pub const GIRAFFE  : Piece = Piece(3);
pub const CHICK    : Piece = Piece(4);
pub const HEN      : Piece = Piece(5);

const MOVE_NW : &'static Move = &Move(-1,  1);
const MOVE_N  : &'static Move = &Move( 0,  1);
const MOVE_NE : &'static Move = &Move( 1,  1);
const MOVE_W  : &'static Move = &Move(-1,  0);
const MOVE_E  : &'static Move = &Move( 1,  0);
const MOVE_SW : &'static Move = &Move(-1, -1);
const MOVE_S  : &'static Move = &Move( 0, -1);
const MOVE_SE : &'static Move = &Move( 1, -1);

const MOVE_DUMMY    : &'static [&'static Move] = &[];
const MOVE_LION     : &'static [&'static Move] = &[MOVE_NW, MOVE_N, MOVE_NE, MOVE_W, MOVE_E, MOVE_SW, MOVE_S, MOVE_SE];
const MOVE_ELEPHANT : &'static [&'static Move] = &[MOVE_NW,         MOVE_NE,                 MOVE_SW,         MOVE_SE];
const MOVE_GIRAFFE  : &'static [&'static Move] = &[         MOVE_N,          MOVE_W, MOVE_E,          MOVE_S         ];
const MOVE_CHICK    : &'static [&'static Move] = &[         MOVE_N                                                   ];
const MOVE_HEN      : &'static [&'static Move] = &[MOVE_NW, MOVE_N, MOVE_NE, MOVE_W, MOVE_E,          MOVE_S         ];

impl fmt::Display for Board {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:015x}", self.0)
    }
}

impl fmt::Display for Move {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Move({}, {})", self.0, self.1)
    }
}

impl Piece {
    fn opponent(&self) -> Piece {
        Piece(self.0 ^ 8)
    }
    fn show(&self) -> char {
        match self.0 {
            0 => '.',
            1 => 'L',  2 => 'E',  3 => 'G',  4 => 'C',  5 => 'H',
            9 => 'l', 10 => 'e', 11 => 'g', 12 => 'c', 13 => 'h',
            _ => '*'
        }
    }
    fn moves(&self) -> &'static [&'static Move] {
        match *self {
            LION     => MOVE_LION,
            ELEPHANT => MOVE_ELEPHANT,
            GIRAFFE  => MOVE_GIRAFFE,
            CHICK    => MOVE_CHICK,
            HEN      => MOVE_HEN,
            _ => MOVE_DUMMY,
        }
    }
    fn mine(&self) -> bool {
        match self.0 {
            1 | 2 | 3 | 4 | 5 => true,
            _ => false
        }
    }
}

impl Board {
    pub fn get(&self, x: i8, y: i8) -> Piece {
        Piece(((self.0 >> ((x * 4 + y) * 4)) & 0xf) as u8)
    }

    pub fn put(&self, x: i8, y: i8, p: Piece) -> Board {
        Board(self.0 | ((p.0 as u64) << ((x * 4 + y) * 4)))
    }

    pub fn del(&self, x: i8, y: i8) -> Board {
        Board(self.0 & !(0xf << ((x * 4 + y) * 4)))
    }

    pub fn hand(&self, p: Piece) -> i8 {
        ((self.0 >> ((if p.0 < 8 { 44 } else { 36 }) + p.0 * 2)) & 3) as i8
    }

    pub fn inc_hand(&self, p: Piece) -> Board {
        /* assume that p is PIECE_E or PIECE_G or PIECE_C or PIECE_H */
        let p = if p == HEN { CHICK } else { p };
        Board(self.0 + (1 << (44 + p.0 * 2)))
    }

    pub fn dec_hand(&self, p: Piece) -> Board {
        /* assume that p is PIECE_E or PIECE_G or PIECE_C or PIECE_H */
        Board(self.0 - (1 << (44 + p.0 * 2)))
    }

    pub fn normalize(&self) -> Board {
        let b =
            ((self.0 & 0xffff00000000u64) >> 32) |
            ( self.0 & 0x0000ffff0000u64       ) |
            ((self.0 & 0x00000000ffffu64) << 32) |
            (self.0 & 0xfff000000000000u64);
        Board(if self.0 < b { self.0 } else { b })
    }

    pub fn reverse(&self) -> Board {
        let mut b = Board(
            ((self.0 & 0xfc0000000000000u64) >> 6) |
            ((self.0 & 0x03f000000000000u64) << 6));
        for y in 0..4 {
            for x in 0..3 {
                let p = self.get(x, y);
                if p != EMPTY {
                    b = b.put(x, 3 - y, p.opponent())
                }
            }
        };
        b
    }

    pub fn init() -> Board {
        let b = Board(0);
        let b = b.put(0, 0, GIRAFFE );
        let b = b.put(1, 0, LION    );
        let b = b.put(2, 0, ELEPHANT);
        let b = b.put(1, 1, CHICK   );
        let b = b.put(1, 2, CHICK   .opponent());
        let b = b.put(2, 3, GIRAFFE .opponent());
        let b = b.put(1, 3, LION    .opponent());
        let b = b.put(0, 3, ELEPHANT.opponent());
        b
    }

    pub fn show(&self) {
        println!("---");
        for y in (0..4).rev() {
            let mut s : String = (0..3).rev().map(|x| self.get(x, y).show()).collect();
            if y == 0 || y == 3 {
                s = s + " (";
                for p in [ELEPHANT, GIRAFFE, CHICK].iter() {
                    for _ in 0..self.hand(if y == 3 { p.opponent() } else { *p }) { s.push(p.show()) }
                }
                s = s + ")";
            }
            println!("{}", s)
        }
    }

    pub fn next(&self) -> Result {
        let mut boards = vec![];
        for y in 0..4 {
            for x in 0..3 {
                let p = self.get(x, y);
                match p {
                    LION | ELEPHANT | GIRAFFE | CHICK | HEN => {
                        let b = self.del(x, y);
                        for m in p.moves() {
                            let nx = x + m.0;
                            if nx < 0 || 2 < nx { continue }
                            let ny = y + m.1;
                            if ny < 0 || 3 < ny { continue }
                            let np = b.get(nx, ny);
                            if np.mine() { continue }
                            if np == LION.opponent() { return Result::Win }
                            let b = if np == EMPTY { b } else { b.del(nx, ny).inc_hand(np.opponent()) };
                            let b = b.put(nx, ny, if p == CHICK && ny == 3 { HEN } else { p });
                            boards.push(b)
                        }
                    },
                    EMPTY => {
                        if self.hand(ELEPHANT) > 0 {
                            boards.push(self.put(x, y, ELEPHANT).dec_hand(ELEPHANT))
                        }
                        if self.hand(GIRAFFE) > 0 {
                            boards.push(self.put(x, y, GIRAFFE).dec_hand(GIRAFFE))
                        }
                        if self.hand(CHICK) > 0 {
                            boards.push(self.put(x, y, CHICK).dec_hand(CHICK))
                        }
                    },
                    _ => ()
                }
            }
        }
        for x in 0..3 {
            if self.get(x, 0) == LION.opponent() { return Result::Lose }
        }
        for i in 0..boards.len() {
            boards[i] = boards[i].reverse().normalize()
        }
        Result::Unknown(boards)
    }

    pub fn prev(&self) -> Vec<Board> {
        fn move_backward(boards: &mut Vec<Board>, b: Board, x: i8, y: i8, nx: i8, ny: i8, p: Piece) {
            let nb = b.put(nx, ny, p);
            boards.push(nb);
            for p in vec![ELEPHANT, GIRAFFE, CHICK] {
                if b.hand(p) > 0 {
                    boards.push(nb.put(x, y, p.opponent()).dec_hand(p));
                    if p == CHICK {
                        boards.push(nb.put(x, y, HEN.opponent()).dec_hand(p));
                    }
                }
            }
        }

        let mut boards = vec![];
        let b = self.reverse();
        for y in 0..4 {
            for x in 0..3 {
                let p = b.get(x, y);
                match p {
                    LION | ELEPHANT | GIRAFFE | CHICK | HEN => {
                        let b2 = b.del(x, y);
                        for m in p.moves() {
                            let nx = x - m.0;
                            if nx < 0 || 2 < nx { continue }
                            let ny = y - m.1;
                            if ny < 0 || 3 < ny { continue }
                            if b.get(nx, ny) != EMPTY { continue }
                            move_backward(&mut boards, b2, x, y, nx, ny, p);
                        }
                        if p == HEN && y == 3 && b2.get(x, 2) == EMPTY {
                            move_backward(&mut boards, b2, x, 3, x, 2, CHICK);
                        }
                        if p != LION && p != HEN {
                            boards.push(b2.inc_hand(p))
                        }
                    },
                    _ => ()
                }
            }
        }
        for i in 0..boards.len() {
            boards[i] = boards[i].normalize()
        }
        return boards;
    }

    pub fn easy(&self) -> bool {
        if let Result::Unknown(bs) = self.next() {
            // check if "try" is possible
            for ref b in &bs {
                if b.next() == Result::Lose { return true }
            }

            // shallow search
            for ref b in &bs {
                if let Result::Unknown(nbs) = b.next() {
                    let mut win = true;
                    for nb in nbs {
                        match nb.next() {
                            Result::Win => {}
                            Result::Lose => {
                                win = false;
                                break
                            }
                            Result::Unknown(nnbs) => {
                                let mut lose = false;
                                for nnb in nnbs {
                                    if nnb.next() == Result::Lose {
                                        lose = true;
                                        break
                                    }
                                }
                                if !lose {
                                    win = false;
                                    break
                                }
                            }
                        }
                    }
                    if win { return true }
                }
            }

            false
        }
        else {
            true
        }
    }
}
