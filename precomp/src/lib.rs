pub mod board;
pub mod board_collection;

use std::fmt;
use std::io::{self, BufRead, Write};
use board::Board;

// helper for logging
#[macro_export]
macro_rules! log(
    ($($arg:tt)*) => { {
        use std::io::Write;
        let r = writeln!(&mut std::io::stderr(), $($arg)*);
        r.expect("failed printing to stderr")
    } }
);

// helper for output
#[macro_export]
macro_rules! out(
    ($out:expr, $($arg:tt)*) => { {
        ($out).out(format_args!($($arg)*))
    } }
);

pub struct Out(io::BufWriter<io::Stdout>);

impl Out {
    pub fn new() -> Self {
        Out(io::BufWriter::new(io::stdout()))
    }
    pub fn out<'a>(&mut self, s: fmt::Arguments<'a>) {
        let r = self.0.write_fmt(s);
        r.expect("failed printing to stdout")
    }
}

// helper for input
pub struct In;

impl In {
    pub fn each<F>(mut f: F) where F: FnMut(Board, i32, i32) {
        let stdin = io::stdin();
        for line in stdin.lock().lines() {
            let line = line.unwrap();
            let split: Vec<&str> = line.as_str().split(' ').collect();
            let b = Board(u64::from_str_radix(split[0], 16).unwrap());
            let depth = i32::from_str_radix(split[1], 10).unwrap();
            let idx = if split.len() >= 3 { i32::from_str_radix(split[2], 10).unwrap() } else { 0 };
            f(b, depth, idx);
        }
    }
}
