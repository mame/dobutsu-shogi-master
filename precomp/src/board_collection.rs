// a custom implementation fo u64 hash set and map
//
// based on https://github.com/attractivechaos/klib/blob/master/khash.h

use std::ops::{Index, IndexMut};
use board::Board;

const FNV_OFFSET_BASIS : u64 = 0xcbf29ce484222325;
const FNV_PRIME : u64 = 0x100000001b3;

#[inline]
fn hash(key: u64) -> usize {
    let h = FNV_OFFSET_BASIS;
    let h = FNV_PRIME.wrapping_mul(h) ^ (((key >>  0) & 0xff) as u64);
    let h = FNV_PRIME.wrapping_mul(h) ^ (((key >>  8) & 0xff) as u64);
    let h = FNV_PRIME.wrapping_mul(h) ^ (((key >> 16) & 0xff) as u64);
    let h = FNV_PRIME.wrapping_mul(h) ^ (((key >> 24) & 0xff) as u64);
    let h = FNV_PRIME.wrapping_mul(h) ^ (((key >> 32) & 0xff) as u64);
    let h = FNV_PRIME.wrapping_mul(h) ^ (((key >> 40) & 0xff) as u64);
    let h = FNV_PRIME.wrapping_mul(h) ^ (((key >> 48) & 0xff) as u64);
    let h = FNV_PRIME.wrapping_mul(h) ^ (((key >> 56) & 0xff) as u64);
    return h as usize;
}

macro_rules! def {
    () => (
        #[inline]
        fn is_empty(&self, i: usize) -> bool {
            return (self.flags[i / 32] >> (i % 32 * 2)) & 1u64 != 0;
        }
        #[inline]
        fn is_deleted(&self, i: usize) -> bool {
            return (self.flags[i / 32] >> (i % 32 * 2)) & 2u64 != 0;
        }
        #[inline]
        fn is_invalid(&self, i: usize) -> bool {
            return (self.flags[i / 32] >> (i % 32 * 2)) & 3u64 != 0;
        }
        #[inline]
        fn set_deleted(&mut self, i: usize) {
            self.flags[i / 32] |= 2u64 << (i % 32 * 2);
        }
        #[inline]
        fn reset_empty(&mut self, i: usize) {
            self.flags[i / 32] &= !(1u64 << (i % 32 * 2));
        }
        #[inline]
        fn reset_both(&mut self, i: usize) {
            self.flags[i / 32] &= !(3u64 << (i % 32 * 2));
        }

        pub fn new() -> Self {
            Self::default()
        }

        pub fn len(&self) -> usize {
            return self.size;
        }

        pub fn clear(&mut self) {
            self.size = 0;
            self.n_occupied = 0;
            self.flags.clear();
            self.keys.clear();
        }

        pub fn contains(&self, b: Board) -> bool {
            return self.get(b) != self.keys.len();
        }

        pub fn get(&self, Board(key): Board) -> usize {
            if self.keys.len() > 0 {
                let k = hash(key);
                let mask = self.keys.len() - 1;
                let mut i = k & mask;
                let last = i;
                let mut step = 0;
                while !self.is_empty(i) && (self.is_deleted(i) || self.keys[i] != key) {
                    step += 1;
                    i = (i + step) & mask;
                    if i == last { return self.keys.len(); }
                }
                return if self.is_invalid(i) { self.keys.len() } else { i };
            }
            else {
                return 0;
            }
        }

        fn kick_out(&mut self, new_self: &mut Self, old_n_buckets: usize, key: u64, val: i32, new_mask: usize) {
            let k = hash(key);
            let mut i = k & new_mask;
            let mut step = 0;
            while !new_self.is_empty(i) {
                step += 1;
                i = (i + step) & new_mask;
            }
            new_self.reset_empty(i);
            if i < old_n_buckets && !self.is_invalid(i) {
                let tmp_key = self.keys[i].clone();
                let tmp_val = self.get_val(i);
                self.keys[i] = key;
                self.set_val(i, val);
                self.set_deleted(i);
                self.kick_out(new_self, old_n_buckets, tmp_key, tmp_val, new_mask);
            }
            else {
                self.keys[i] = key;
                self.set_val(i, val);
            }
        }

        pub fn resize(&mut self, new_n_buckets: usize) -> usize {
            fn nextpow2(n: usize) -> usize {
                let mut ret = 1;
                let mut val = n;
                while val > 0 {
                    val >>= 1;
                    ret <<= 1;
                }
                return if 2 * n == ret { n } else { ret };
            }
            let old_n_buckets = self.keys.len();
            let new_n_buckets = nextpow2(new_n_buckets);
            let new_n_buckets = if new_n_buckets < 4 { 4 } else { new_n_buckets };
            if self.size >= ((new_n_buckets as f64) * 0.77 + 0.5) as usize { return 0 };
            let mut new_flags = Vec::with_capacity((new_n_buckets + 31) / 32);
            new_flags.resize((new_n_buckets + 31) / 32, 0x5555_5555_5555_5555u64);
            let mut new_self = Self::default();
            new_self.flags = new_flags;
            if old_n_buckets < new_n_buckets {
                self.keys.resize(new_n_buckets, 0);
                self.resize_vals(new_n_buckets);
            };
            for i in 0..old_n_buckets {
                if self.is_invalid(i) { continue };
                let key = self.keys[i].clone();
                let val = self.get_val(i);
                let new_mask = new_n_buckets - 1;
                self.set_deleted(i);
                self.kick_out(&mut new_self, old_n_buckets, key, val, new_mask);
            }
            if old_n_buckets > new_n_buckets {
                self.keys.resize(new_n_buckets, 0);
                self.resize_vals(new_n_buckets);
            }
            self.flags = new_self.flags;
            self.n_occupied = self.size;
            self.upper_bound = ((self.keys.len() as f64) * 0.77).round() as usize;
            return 0;
        }

        pub fn insert(&mut self, Board(key): Board) -> usize {
            if self.n_occupied >= self.upper_bound {
                let m = if self.keys.len() > (self.size << 1) { self.keys.len() - 1 } else { self.keys.len() + 1 };
                self.resize(m);
            }
            let mask = self.keys.len() - 1;
            let mut x = self.keys.len();
            let mut i = hash(key) & mask;
            if self.is_empty(i) {
                x = i;
            }
            else {
                let mut step = 0;
                let mut site = self.keys.len();
                let last = i;
                while !self.is_empty(i) && (self.is_deleted(i) || self.keys[i] != key) {
                    if self.is_deleted(i) { site = i }
                    step += 1;
                    i = (i + step) & mask;
                    if i == last { x = site; break; }
                }
                if x == self.keys.len() {
                    x = if self.is_empty(i) && site != self.keys.len() { site } else { i };
                }
            }
            if self.is_empty(x) {
                self.keys[x] = key;
                self.reset_both(x);
                self.size += 1;
                self.n_occupied += 1;
            }
            else if self.is_deleted(x) {
                self.keys[x] = key;
                self.reset_both(x);
                self.size += 1;
            }
            return x
        }

        pub fn delete(&mut self, key: Board) {
            let x = self.get(key);
            if x != self.keys.len() && !self.is_invalid(x) {
                self.set_deleted(x);
                self.size -= 1;
            }
        }
    )
}

#[derive(Default)]
pub struct BoardSet {
    size: usize,
    n_occupied: usize,
    upper_bound: usize,
    flags: Vec<u64>,
    keys: Vec<u64>,
}

impl BoardSet {
    #[inline]
    fn get_val(&self, _: usize) -> i32 { 0 }
    #[inline]
    fn set_val(&mut self, _: usize, _: i32) { }
    #[inline]
    fn resize_vals(&mut self, _: usize) { }

    def!();

    #[inline]
    pub fn each<F>(&self, mut f: F) where F: FnMut(Board) -> () {
        for i in 0..self.keys.len() {
            if self.is_invalid(i) { continue }
            f(Board(self.keys[i]));
        }
    }
}

#[derive(Default)]
pub struct BoardMap {
    size: usize,
    n_occupied: usize,
    upper_bound: usize,
    flags: Vec<u64>,
    keys: Vec<u64>,
    vals: Vec<i32>
}

impl BoardMap {
    #[inline]
    fn get_val(&self, i: usize) -> i32 { self.vals[i] }
    #[inline]
    fn set_val(&mut self, i: usize, v: i32) { self.vals[i] = v }
    #[inline]
    fn resize_vals(&mut self, n: usize) { self.vals.resize(n, 0) }

    def!();

    pub fn put(&mut self, b: Board, val: i32) {
        let x = self.insert(b);
        self.vals[x] = val;
    }
}

impl Index<Board> for BoardMap {
    type Output = i32;
    fn index<'a>(&'a self, b: Board) -> &'a i32 {
        &self.vals[self.get(b)]
    }
}

impl IndexMut<Board> for BoardMap {
    fn index_mut(&mut self, b: Board) -> &mut i32 {
        let x = self.insert(b);
        &mut self.vals[x]
    }
}
