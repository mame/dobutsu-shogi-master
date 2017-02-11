// Enumerate all boards which are reachable from the initial board.
//
// Input: none
//
// Output:
//   board depth
//   ...
//
//   board: hex representation of bit-board
//   depth: the depth of the board
//      1: winning board (the player can capture the opponent's lion)
//      0: losing board (the opponent succeeded "try")
//     -1: unknown board

#[macro_use]
extern crate precomp;

use std::cmp;
use precomp::Out;
use precomp::board::{Board, Result};
use precomp::board_collection::BoardSet;

fn main() {
    log!("Step 1: enumerate all reachable boards");

    let mut item_counts = vec![0, 0, 0];
    let mut max_degree = 0;

    let mut out = Out::new();
    let mut boards = vec![Board::init().normalize()];
    let mut visited = BoardSet::new();

    // straightforward DFS
    while let Some(b) = boards.pop() {
        if visited.contains(b) { continue };
        visited.insert(b);

        let r = match b.next() {
            Result::Win  => { 1 },
            Result::Lose => { 0 },
            Result::Unknown(bs) => {
                max_degree = cmp::max(max_degree, bs.len());
                for b in bs { boards.push(b) }
                -1
            }
        };

        out!(out, "{:015x} {}\n", b.0, r);

        item_counts[(1 - r) as usize] += 1;
        if visited.len() % 10000000 == 0 {
            let total = item_counts[0] + item_counts[1] + item_counts[2];
            log!("enumerating... (winning: {}, losing: {}, unknown: {}, total: {})",
                item_counts[0], item_counts[1], item_counts[2], total);
        }
    }

    log!("Step 1: result");
    log!("  winning board#: {:9}", item_counts[0]);
    log!("  losing board# : {:9}", item_counts[1]);
    log!("  unknown board#: {:9}", item_counts[2]);
    log!("  total         : {:9}", item_counts[0] + item_counts[1] + item_counts[2]);
    log!("  max degree: {}", max_degree);
    log!("Step 1: done!");
}
