# Minimize the DAG by encoding it to 0-1 integer programming.
#
# Usage:
#   (1) generate .lp file:        ruby 4-opt.rb 3.txt 4.lp
#   (2) invert .sol file to .txt: ruby 4-opt.rb 3.txt 4.sol 4.lp.map
#
# What problem we want to solve: Extract the minimal sub-DAG from the whole DAG
# that consists of "any" and "all" nodes.
#
#   - If we keep "any" node, we must also keep at least one child of the node.
#   - If we keep "all" node, we must also keep all children of the node.
#   - We must keep four nodes proceeded by the initial board.
#   - We want to minimize the total number of "any" nodes.
#
# How to solve the problem: Encode it to the following 0-1 integer programming,
#
#   - Assign binary variables to each node.
#   - For the initial four nodes, n = 1.
#   - For "any" node p and its children, c_i, c_1 + c_2 + ...+ c_N -   p >= 0.
#   - For "all" node p and its children, c_i, c_1 + c_2 + ...+ c_N - N p >= 0.
#   - The objection function is Sum(p) for all "any" nodes p.
#   - If a variable of a node p is 1, we must keep the corresponding board.
#
# How to golf .lp file:
#
#   (1) trivial propagation: if there are constraints 'p = 1' and 'c - p >= 0',
#       remove them and add a new constraint 'c = 1'.  (We call p is "pinned".)
#   (2) unused consitraints: remove a node that has no weight and children.
#   (3) trivial merge: if there are `c1 - p >= 0' and `c2 - c1 >= 0`, remove
#       them and add a new constraint 'c2 - p >= 0'.

# The definition of a node:
#   type: :any or :all
#   parents: previous nodes
#   children: next nodes
#   weight: coefficient in objective functoin
#   board: the corresponding board (only for "any" node)
Node = Struct.new(:type, :parents, :children, :weight, :board)

class Node
  attr_accessor :var, :value, :pinned, :merged

  # A string for a term with a given coefficient
  def term(weight)
    weight >= 2 ? "#{ weight } #{ @var }" : @var
  end

  # A string for a constraint that this node imposes.
  def constraint
    weight = type == :any ? 1 : children.size
    lhs = children.map {|c| c.var }.join(" + ")
    # if this node is pinned, var is always 1
    @pinned ? "#{ lhs } >= #{ weight }" : "#{ lhs } - #{ term(weight) } >= 0"
  end

  # make this node "pinned"
  def pin(r)
    return if @pinned
    r << self
    @pinned = true

    # Now, var of this node is 1.  This affects its parents.  If the parent is
    # "any", it has to impose no constraint; we remove all children.  If the
    # parent is "all", just remove this node from its children.
    parents.dup.each do |p|
      if p.type == :any
        p.delete_children
        # We mean "no constraints" by settting out-degree to 0.
        # It's slightly awkward that "any" node has no children, though...
      else
        p.delete_child(self)
      end
    end

    # This change also may affects its children.  If this node is "all", or if
    # it has exactly one child, we must also keep all the children.
    if type == :all || children.size == 1
      children.dup.each {|c| c.pin(r) }
    end
  end

  # marge this node and its child
  def merge
    # we merge only if out-degree(self) = 1 and out-degree(child) = 1
    while children.size == 1 && children[0].parents.size == 1
      c = children[0]
      c.children.each do |cc|
        cc.parents.reject! {|c2| c2.equal?(c) }
        cc.parents << self
      end

      # inherit the type and weight of the child
      self.children = c.children
      self.type = c.type
      self.weight += c.weight

      # remove the child from the DAG
      c.merged = true
      c.children = []
    end
  end

  def delete_children
    children.each do |c|
      c.parents.reject! {|n| n.equal?(self) }
      # If any child has no parents, we also remove it (cascade)
      c.delete_children if c.parents.empty? && !c.pinned
    end
    children.clear
  end

  def delete_child(n)
    n.parents.reject! {|p| p.equal?(self) }
    children.reject! {|c| c.equal?(n) }
  end
end

class DAG
  def initialize(txt)
    open(txt) do |f|
      # The initial four nodes
      @start_nodes = f.gets.split.map {|s| s.to_i }

      # The set of nodes whose assignment we want to know
      @final_nodes = []
      @board_info = {}

      any_nodes = [] # "any" node id => "any" node
      all_nodes = {} # (list of "any" children).sort.uniq => "all" node
      while l = f.gets
        board, depth, id = l.chomp.split
        edges = {}
        n = any_nodes[id.to_i] = Node[:any, [], nil, 1, board.hex]
        until (l = f.gets.chomp) == ""
          idx, l = l.split(":")
          l = l.split.map {|s| s.to_i }.sort.uniq
          c = all_nodes[l] ||= Node[:all, [], l, 0]
          unless c.parents.any? {|n2| n.equal?(n2) }
            c.parents << n
            edges[idx.to_i] = c
          end
        end
        n.children = edges.values
        @final_nodes << n
        @board_info[board.hex] = [depth.to_i, edges.keys]
      end

      @start_nodes.map! {|i| any_nodes[i] }

      # replace all node ids with the reference to the node
      all_nodes.each_value do |all_n|
        all_n.children.map! {|i| any_nodes[i] }.compact!
        all_n.children.each do |any_n|
          any_n.parents << all_n
        end
      end

      # Now, all pairs of parent and child are doubly-linked.
    end
  end

  def each_node
    visited = {}.compare_by_identity
    stack = @start_nodes.dup
    until stack.empty?
      n = stack.pop
      next if visited[n]
      visited[n] = true
      yield n
      stack.concat(n.children)
    end
  end

  def size
    c = 0
    each_node { c += 1 }
    c
  end

  def dump_lp(lp)
    assign_var_names

    obj = []
    constraints = []
    vars = []

    @start_nodes.each_with_index do |n|
      constraints << "#{ n.var } = 1" unless n.pinned
    end
    each_node do |n|
      obj << n.term(n.weight) if n.weight >= 1 && !n.pinned
      constraints << n.constraint unless n.children.empty?
      vars << n.var unless n.pinned
    end

    gen = NameGenerator.new
    open(lp, "w") do |f|
      f.puts "minimize"
      f.puts obj.join("\n+ ")
      f.puts

      f.puts "subject to"
      f.puts constraints.map {|c| gen.new_name + ": " + c }.join("\n")
      f.puts

      f.puts "binary"
      f.puts vars.join("\n")
      f.puts
      f.puts "end"
    end
    puts "LP size: #{ File.size(lp).to_s.reverse.scan(/.{1,3}/).join(",").reverse }"

    open(lp + ".map", "w") do |f|
      @final_nodes.each do |n|
        f.puts "%015x %s" % [n.board, n.var]
      end
    end
  end

  def assign_var_names
    # count the occurences of each variable
    count = Hash.new(0).compare_by_identity
    each_node do |n|
      next if n.children.empty?
      count[n] += 2 if n.weight > 0 && !n.pinned
      n.children.each {|c| count[c] += 1 }
    end

    # assign variable names in order of frequency
    # (more frequent variable should have shorter name)
    gen = NameGenerator.new
    i = 0
    count.sort_by {|n, c| [-c, i += 1] }.each do |n, _|
      n.var = gen.new_name
    end

    @final_nodes.each do |n|
      n.var = n.pinned ? "(pinned)" : n.var || "(discarded)"
    end
    @final_nodes.each do |n|
      if n.merged
        m = n
        while m.merged
          m = m.parents[0]
        end
        n.var = m.var
      end
    end
  end

  # (1) trivial propagation: if there are constraints 'p = 1' and 'c - p >= 0',
  #     remove them and add a new constraint 'c = 1'.  (We call p is "pinned".)
  def pin_true_nodes
    r = []
    @start_nodes.each {|n| n.pin(r) }
    @start_nodes = r

    # consisitency check
    @start_nodes.each do |n|
      raise unless n.parents.empty?
      next if n.children.empty?
      raise if n.children.size == 1
      raise if n.children.any? {|cc| cc.pinned }
    end

    # remove unused nodes
    @start_nodes.reject! {|n| n.children.empty? }
  end

  # (2) unused consitraints: remove a node that has no weight and children.
  def remove_unused_leaves
    each_node do |n|
      n.pin([]) if n.weight == 0 && n.children.empty?
    end
  end

  # (3) trivial merge: if there are `c1 - p >= 0' and `c2 - c1 >= 0`, remove
  #     them and add a new constraint 'c2 - p >= 0'.
  def merge_exclusive_node_pairs
    each_node {|n| n.merge }
  end

  # reverse the solution (variable assignment) to boards we must keep, their
  # depths, and move index to choose.
  def invert_solution(sol, map)
    board2node = {}
    @final_nodes.each {|n| board2node[n.board] = n }

    var2value = {}
    File.foreach(sol) do |l|
      if l =~ /^(\S+)\s+1\s+\(obj:\d+\)$/
        var2value[$1] = true
      else
        $stderr.puts l
      end
    end

    File.foreach(map) do |l|
      board, var = l.chomp.split
      board2node[board.hex].value =
        case var
        when "(pinned)" then true
        when "(discarded)" then false
        else
          var2value[var]
        end
    end

    count = 0
    @final_nodes.each do |n|
      if n.board && n.value
        depth, idxs = @board_info[n.board]
        i = n.children.find_index {|c| c.children.all? {|cc| cc.value } }
        idx = idxs[i]
        raise unless idx
        puts "#{ "%015x" % n.board } #{ depth } #{ idx }"
        count += 1
      end
    end
    $stderr.puts "#boards: #{ count }"
  end

  def optimize
    puts "#node: #{ size }"

    puts "removing unused leaves..."
    remove_unused_leaves
    puts "#node: #{ size }"

    puts "pinning true nodes..."
    pin_true_nodes
    puts "#node: #{ size }"

    puts "removing unused leaves (again)..."
    remove_unused_leaves
    puts "#node: #{ size }"

    puts "merging exclusive node pairs..."
    merge_exclusive_node_pairs
    puts "#node: #{ size }"
  end

  class NameGenerator
    ALPHA = [*"A".."Z", *"a".."z","_"] - ["E", "e"] # Note that "e01" is float
    ALNUM = (ALPHA + [*"0".."9", "E", "e", *%w(! " # $ % & ( ) , . ; ? @ _ { } ~)]).sort

    def initialize
      @n = 0
    end

    def new_name
      loop do
        n = @n
        s = ALPHA[n % ALPHA.size]
        n /= ALPHA.size
        until n == 0
          s += ALNUM[n % ALNUM.size]
          n /= ALNUM.size
        end
        @n += 1
        return s if s !~ /GEN|SOS|BIN|END|INT|INF|NAN|ST|MIN|MAX|OBJ/i
      end
    end
  end
end

if ARGV.size < 2
  puts "usage:"
  puts "  ruby #$0 3.txt 4.lp"
  puts "  ruby #$0 3.txt 4.sol 4.lp.map"
  exit
end

dag = DAG.new(ARGV[0])
if File.extname(ARGV[1]) == ".lp"
  dag.optimize
  dag.dump_lp(ARGV[1])
else
  dag.invert_solution(ARGV[1], ARGV[2])
end
