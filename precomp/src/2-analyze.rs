// Determine the depth of each board by retrospective analysis.
//
// Input: 1-enum's output
//
// Output:
//   board depth
//   ...
//
//   board: hex representation of bit-board
//   depth: the depth of the board
//     odd: black will win
//     even: white will win
//     -1: draw

#[macro_use]
extern crate precomp;

use precomp::{In, Out};
use precomp::board::{Board, Result};
use precomp::board_collection::BoardSet;

#[derive(Default)]
struct State {
    prev_boards: Vec<Board>, // board list of depth-{N-1}
    next_boards: Vec<Board>, // board list of depth-N
    fixed: BoardSet,        // boards whose depth is already fixed
    unfixed: BoardSet,      // boards whose depth is not fixed yet
}

// load all possible boards
fn load() -> State {
    fn log(msg: &str, fixed: usize, unfixed: usize) {
        log!("{} (unfixed: {}, fixed: {}, total: {})",
            msg, unfixed, fixed, unfixed + fixed);
    }

    let mut s = State::default();

    In::each(|b, depth, _| {
        if depth == 0 {
            // a depth-0 board is fixed
            s.fixed.insert(b);
            s.prev_boards.push(b);
        }
        else {
            // a board whose depth is more than 0 is unfixed
            s.unfixed.insert(b);
            if depth == 1 { s.next_boards.push(b); }
        }

        if (s.fixed.len() + s.unfixed.len()) % 10000000 == 0 {
            log("loading...", s.fixed.len(), s.unfixed.len());
        }
    });

    log("loaded!", s.fixed.len(), s.unfixed.len());

    s
}

// identify all depth-N boards
fn enumerate_next_boards(s: &mut State, depth: i32) {
    // We can determine a board B is depth-N, only if:
    //   (1) N is odd (white's turn) and any B's next board is depth-{N-1}, or
    //   (2) N is even (black's turn) and all B's next boards are depth-{N-1}
    //
    // We call "a depth-N board candidate" if any next of the board is depth-{N-1}.

    // Check if a depth-N board candidate satisfies the conditions above
    #[inline]
    fn check(fixed: &BoardSet, b: Board, depth: i32, next_boards: &mut Vec<Board>) {
        if depth % 2 != 0 {
            if let Result::Unknown(bs) = b.next() {
                for b in bs {
                    if !fixed.contains(b) { return }
                }
            }
        }
        next_boards.push(b)
    }

    let prev_boards = &s.prev_boards;
    let fixed = &s.fixed;
    let unfixed = &s.unfixed;
    let mut next_boards = &mut s.next_boards;

    // There are two approaches to enumerate depth-N board candidates:
    //   1) calculate back the depth-N candidates from all depth-{N-1} boards
    //   2) filter the depth-N candidates that can proceed to any depth-N board
    if prev_boards.len() * 4 < unfixed.len() {
        // approach 1
        let mut visited = BoardSet::new();
        for b in prev_boards { // depth-{N-1} boards
            for b in b.prev() { // calculate candidates
                if unfixed.contains(b) { // skip unreachable board
                    if !visited.contains(b) { // avoid duplication
                        visited.insert(b);
                        // candidate found
                        check(fixed, b, depth, &mut next_boards);
                    }
                }
            }
        }
    }
    else {
        // approach 2
        let mut prev_set = BoardSet::new();
        for &pb in prev_boards {
            prev_set.insert(pb);
        }
        unfixed.each(|b| {
            if let Result::Unknown(bs) = b.next() {
                for nb in bs {
                    if prev_set.contains(nb) {
                        // candidate found
                        check(fixed, b, depth, &mut next_boards);
                        return;
                    }
                }
            }
        });
    }
}

fn main() {
    log!("Step 2: perform retrospective analysis");

    let mut out = Out::new();
    let mut s = load();
    let init_board = Board::init().normalize();

    let mut board_counts = vec![0, 0];
    let mut init_depth = 0;

    let mut depth = 0;

    for b in &s.prev_boards { out!(out, "{:015x} 0\n", b.0); }

    // retrospective analysis
    while s.prev_boards.len() > 0 || depth == 0 {
        board_counts[depth % 2] += s.prev_boards.len();

        log!("analyzing... (depth-{} boards: {}, unfixed boards: {})",
            depth, s.prev_boards.len(), s.unfixed.len());

        // identify all depth-N boards from depth-{N-1} boards
        enumerate_next_boards(&mut s, depth as i32);

        for &b in &s.next_boards {
            s.fixed.insert(b);
            s.unfixed.delete(b);
            out!(out, "{:015x} {}\n", b.0, depth + 1);
            if b == init_board { init_depth = depth; }
        }

        s.prev_boards = s.next_boards;
        s.next_boards = vec![];
        let len = s.unfixed.len();
        s.unfixed.resize(len);
        depth += 1;
    }

    s.unfixed.each(|b| { out!(out, "{:015x} -1\n", b.0); }); // draw

    log!("Step 2: result");
    log!("  black-winning boards: {:9}", board_counts[0]);
    log!("  white-winning boards: {:9}", board_counts[1]);
    log!("  draw                : {:9}", s.unfixed.len());
    log!("  max depth : {:3}", depth - 1);
    log!("  init depth: {:3}", init_depth);
    log!("Step 2: done!");
}
