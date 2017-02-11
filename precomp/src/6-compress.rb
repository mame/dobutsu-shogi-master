# Compress and encode the data base as a text, by range coder.

ps, a = eval($<.read)

# count the frequency and its accumulation
count = Hash.new(0)
a.each {|c| count[c] += 1 }
count_sum = Hash.new([0, 0])
sum = 0
count.keys.sort.each_with_index do |c, i|
  count_sum[c] = sum
  sum += count[c]
end
count_sum[nil] = sum

# range coder compression
BASE = 93
MAX_RANGE = BASE ** 5
MIN_RANGE = BASE ** 4
low = 0
range = MAX_RANGE
cnt = 0
buff = 0
aa = []
a.each do |c|
  tmp = range / sum
  low += count_sum[c] * tmp
  range = count[c] * tmp
  if low >= MAX_RANGE
    buff += 1
    low %= MAX_RANGE
    if cnt > 0
      aa << buff
      (cnt - 1).times { aa << 0 }
      buff = cnt = 0
    end
  end
  while range < MIN_RANGE
    if low < ((BASE - 1) * MIN_RANGE)
      aa << buff
      cnt.times { aa << (BASE - 1) }
      buff = (low / MIN_RANGE) % BASE
      cnt = 0
    else
      cnt += 1
    end
    low = (low * BASE) % MAX_RANGE
    range *= BASE
  end
end
c = BASE - 1
if low >= MAX_RANGE
  buff += 1
  c = 0
end
aa << buff
cnt.times { aa << c }

def dump(r, n)
  a = []
  (n - 1).downto(0) do |i|
    a << (r / (BASE ** i)) % BASE
  end
  a
end
aa.concat(dump(low, 5))
aa.shift # drop the head because it is always zero

# header
header = [*ps, count[0], count.size, a.size]
raise if header.any? {|n| n >= BASE ** 3 }
out = header.flat_map {|n| dump(n, 3) }
count.keys.sort.each do |ch|
  next if ch == 0
  n = ch + count[ch] * 34 * 37 * 3
  raise if n >= BASE ** 4
  header << n
  out.concat(dump(n, 4))
end

s = (out + aa).map do |n|
  n += 32
  n += 1 if n >= 34
  n += 1 if n >= 92
  n
end
print s.pack("C*")


# decoding test

ps0, ps1, ps2, count0, count_size, data_size = header.slice!(0, 6)
raise if ps != [ps0, ps1, ps2]
count2 = [count0]
count_sum2 = [[0, 0]]
sum2 = count0
(count_size - 1).times do
  n = header.shift
  c, ch = n.divmod(34 * 37 * 3)
  count2[ch] = c
  count_sum2 << [ch, sum2]
  sum2 += c
end
count_sum2 << [nil, sum2]
raise if sum != sum2
raise if count_sum.to_a != count_sum2
raise unless header.empty?

count = count2
count_sum = count_sum2
sum = sum2

# range coder decompression (test)

low = (((aa.shift * BASE + aa.shift) * BASE + aa.shift) * BASE + aa.shift) * BASE + aa.shift
range = MAX_RANGE
buff = cnt = 0
a2 = []
data_size.times do
  tmp = range / sum
  i = 0
  j = count_sum.size - 1
  while i < j
    k = (i + j) / 2
    if count_sum[k + 1][1] <= low / tmp
      i = k + 1
    else
      j = k
    end
  end
  c = count_sum[i][0]
  low -= tmp * count_sum[i][1]
  range = tmp * count[c]
  while range < MIN_RANGE
    range *= BASE
    low = ((low * BASE) + aa.shift) % MAX_RANGE
  end
  a2 << c
end

# check if decoding is succeeded
raise if a != a2
