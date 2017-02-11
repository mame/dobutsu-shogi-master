// Check if the final remaining boards are complete.
//
// Input:
//   board depth idx
//   ...
//
//   board: hex representation of bit-board
//   depth: the depth of the board
//   idx: move index (the index of return value of Board#next)

#[macro_use]
extern crate precomp;

use std::process;
use precomp::{In, Out};
use precomp::board::{Board, Result};
use precomp::board_collection::{BoardSet, BoardMap};

struct Node {
    idx: u8,
    depth: i32,
}

// load all boards
fn load() -> (Vec<Node>, BoardMap) {
    let mut map = BoardMap::new();
    let mut nodes = vec![];
    In::each(|b, depth, idx| {
        map[b] = nodes.len() as i32;
        nodes.push(Node {
            idx: idx as u8,
            depth: depth,
        })
    });
    log!("board#: {}", nodes.len());
    (nodes, map)
}

macro_rules! error(
    ($($arg:tt)*) => { {
        log!($($arg)*);
        process::exit(1)
    } }
);

fn main() {
    let mut out = Out::new();

    let (nodes, map) = load();

    let mut boards = vec![];
    if let Result::Unknown(bs) = Board::init().next() {
        for b in bs { boards.push((b, 78)) }
    }

    let mut visited = BoardSet::new();

    // straightforward DFS
    while let Some((b, depth)) = boards.pop() {
        if visited.contains(b) { continue }
        visited.insert(b);

        out!(out, "{:015x}\n", b.0);

        if b.easy() { continue }

        if !map.contains(b) {
            error!("unknown board!: {:015x}", b.0);
        }

        let ref node = nodes[map[b] as usize];

        if node.depth >= depth {
            error!("error! board={:015x} depth={} (expected: <{})\n",
                b.0, depth, depth);
        }

        match b.next() {
            Result::Win | Result::Lose => error!("error!"),
            Result::Unknown(bs) =>
                if let Result::Unknown(bs) = bs[node.idx as usize].next() {
                    for b in bs { boards.push((b, node.depth)) }
                }
        }
    }
    log!("OK!")
}
