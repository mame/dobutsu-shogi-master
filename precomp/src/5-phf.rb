# Make perfect hash function (PHF) for the data base,
# mapping from board to (depth, move index).
#
# ref: http://www.itu.dk/people/pagh/papers/simpleperf.pdf

require "prime"

# load the list of board, depth, and move index
Boards = {}
while l = gets
  board, depth, idx = l.split
  board = board.hex
  idx = idx.to_i
  depth = depth.to_i
  raise if depth < 5 || depth > 77
  raise if idx >= 34
  Boards[board] = (depth.to_i - 5) / 2 * 34 + idx.to_i
end

# the seed hash functions
def hashes(ps, board)
  hs = []
  c = 0
  ps.each do |m|
    hs << (board % m + c)
    c += m
  end
  hs
end

# mapping step: check if given three primes are useful
def check_seed(ps)
  t = {}
  Boards.each do |board, v|
    hashes(ps, board).each do |h|
      (t[h] ||= []) << board
    end
  end

  stack = []
  t.each {|h, a| stack << h if a.size == 1 }

  s = []
  until stack.empty?
    board, = t.delete(stack.pop)
    next unless board
    s << board
    hashes(ps, board).each do |h|
      next unless t[h]
      t[h].delete(board)
      case t[h].size
      when 0 then t.delete(h)
      when 1 then stack << h
      end
    end
  end
  s
end

# assigning step: build PHF
def build_phf(ps, s)
  assign = [0] * ps.inject(&:+)
  visited = []
  s.reverse_each do |board|
    vs = hashes(ps, board)
    vs.each_with_index do |h, i|
      next if visited[h]
      assign[h] = (i - vs.map {|v| assign[v] }.inject(&:+)) % ps.size
      break
    end
    vs.each {|v| visited[v] = true }
  end

  nh = {}
  Boards.each do |board, v|
    vs = hashes(ps, board)
    i = vs.map {|v_| assign[v_] }.inject(&:+) % ps.size
    h = vs[i]
    raise if nh[h]
    nh[h] = v
  end

  a = []
  nh.each {|k, v| a[k] = v }
  ps.inject(&:+).times {|i| a[i] ||= 0 }
  a = a.zip(assign).map {|n, m| n * ps.size + m }

  # check
  Boards.each do |board, v|
    vs = hashes(ps, board)
    i = vs.map {|v_| a[v_] % 3 }.inject(&:+) % ps.size
    raise if v != a[vs[i]] / 3
  end

  a
end

Primes = Prime.each.take(Boards.size / 2)

# determine small three primes by using binary search
m = (1..Primes.size).bsearch do |m_|
  check_seed(Primes[m_, 3]).size == Boards.size
end

ps = Primes[m, 3]
s = check_seed(ps)
raise unless s.size == Boards.size

a = build_phf(ps, s)

p [ps, a]
