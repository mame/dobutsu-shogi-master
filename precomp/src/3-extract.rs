// Extract the subset of boards that are strictly reachable from the initial
// board.
//
// Input: 2-analyze's output
//
// Output:
//   board depth name
//     idx: next-name...
//     ...
//   ...
//
//   board: hex representation of bit-board (only white boards)
//   depth: the depth of the board
//   name: board name (id)
//   idx: move index (the index of return value of Board#next)
//   next-name: all possible white boards proceeded by the black board

#[macro_use]
extern crate precomp;

use std::cmp;
use precomp::{In, Out};
use precomp::board::{Board, Result, ELEPHANT, GIRAFFE, CHICK};
use precomp::board_collection::{BoardSet, BoardMap};

struct Move {
    idx: u8,
    board: Board,
}

struct Node {
    board: Board,
    depth: i32,
    next_boards: Vec<Move>,
}

// load all possible boards
fn load() -> BoardMap {
    fn log(msg: &str, boards: usize) {
        log!("{} (boards: {})", msg, boards);
    }
    let mut oracle = BoardMap::new();
    In::each(|b, depth, _| {
        oracle[b] = depth;
        if oracle.len() % 10000000 == 0 {
            log("loading...", oracle.len());
        }
    });
    log("loaded!", oracle.len());
    oracle
}

// check if a given branch is hopeless
fn check_hopeless(b: Board, nb: Board) -> bool {
    // we know the two branches are hopeless by some experiments
    b.0 == 0x000a9030c41b002u64 && nb.0 == 0x400a00390c0b012u64 ||
    b.0 == 0x000a0030c41b902u64 && nb.0 == 0x400a01390c0b002u64
}

// extract strictly reachable boards
fn extract(oracle: BoardMap) -> Vec<Node> {
    // The definition of "strictly reachable"
    //  * The initial board is strictly reachable.
    //  * If a black board is strictly reachable, all white boards from the black
    //    one are strictly reachable.
    //    (i.e., a black player may choose any possible moves.)
    //  * If a white board is strictly reachable and the board is depth-N,
    //    all depth-{N-1} black boards from the black one are strictly reachable.
    //    (i.e., a white player chooses any best possible moves.)

    let mut all_in_hands = 0;
    let mut end_in_hands = 0;
    let mut min_degree = 64;
    let mut max_degree = 0;
    let mut max_hands = 0;

    let mut visited = BoardSet::new();
    let mut boards = vec![Board::init().normalize()];
    let mut nodes = vec![];

    // straightforward DFS
    while let Some(b) = boards.pop() {
        if visited.contains(b) { continue }
        visited.insert(b);

        let depth = oracle[b];
        if visited.len() % 1000000 == 0 {
            log!("extracting... (visited: {}, remaining: {})",
                visited.len(), boards.len());
        }

        // keep statistics
        {
            let h1 = b.hand(ELEPHANT) + b.hand(GIRAFFE) + b.hand(CHICK);
            let b = b.reverse();
            let h2 = b.hand(ELEPHANT) + b.hand(GIRAFFE) + b.hand(CHICK);
            if h1 == 6 || h2 == 6 {
                all_in_hands += 1;
                if b.next() == Result::Win { end_in_hands += 1 }
            }
            max_hands = cmp::max(max_hands, cmp::max(h1, h2));
        }

        if let Result::Unknown(bs) = b.next() {
            let mut node = Node {
                board: b,
                depth: depth as i32,
                next_boards: vec![],
            };

            max_degree = cmp::max(max_degree, bs.len());
            min_degree = cmp::min(min_degree, bs.len());
            for (i, &nb) in bs.iter().enumerate() {
                // record all black boards (even depth),
                // and white boards (odd depth, only best move)
                if depth % 2 == 0 || oracle[nb] == depth - 1 {
                    // ad-hoc heuristic: manually prune hopeless branches
                    if check_hopeless(b, nb) { continue }

                    node.next_boards.push(Move { idx: i as u8, board: nb });
                    boards.push(nb)
                }
            }
            nodes.push(node);
        }
    }

    log!("Step 3: result");
    log!("  extracted dag size: {}", visited.len());
    log!("  all in hands: {}", all_in_hands);
    log!("  end in hands: {}", end_in_hands);
    log!("  max hands: {}", max_hands);
    log!("  min degree: {}", min_degree);
    log!("  max degree: {}", max_degree);

    nodes.sort_by_key(|node| -node.depth );
    nodes
}

fn output(nodes: Vec<Node>) {
    let mut out = Out::new();

    let mut map = BoardMap::new();
    let mut names = BoardMap::new();
    let mut name = 0;
    for (i, node) in nodes.iter().enumerate() {
        map[node.board] = i as i32;
        if node.depth % 2 == 1 {
            names[node.board] = name;
            name += 1;
        }
    }
    for ref m in &nodes[map[Board::init().normalize()] as usize].next_boards {
        out!(out, " {}", names[m.board]);
    }
    out!(out, "\n");
    for node in &nodes {
        // black boards are omitted
        if node.depth % 2 == 0 { continue }

        // depth-3 (or less) boards are omitted
        if node.depth <= 3 { continue }

        // print this white board
        out!(out, "{:015x} {} {}\n", node.board.0, node.depth, names[node.board]);

        // print all next white boards for each best move
        for ref m in &node.next_boards {
            if !map.contains(m.board) { continue };
            let ref nnode = nodes[map[m.board] as usize];
            if nnode.depth % 2 != 0 { unreachable!() }

            out!(out, " {}:", m.idx);
            for ref m in &nnode.next_boards {
                if names.contains(m.board) { out!(out, " {}", names[m.board]) }
            }
            out!(out, "\n");
        }
        out!(out, "\n");
    }
}

fn main() {
    log!("Step 3: extract an subset of needed boards");

    let oracle = load();
    let nodes = extract(oracle);
    output(nodes);

    log!("Step 3: done!");
}
