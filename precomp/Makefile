.DELETE_ON_ERROR:

.PHONY: all build check clean

all: ai.txt 9.txt

OUT = target/release
LIB = src/board.rs src/board_collection.rs src/lib.rs

build:
	cargo build --release

clean:
	cargo clean

$(OUT)/1-enum: src/1-enum.rs $(LIB) build

$(OUT)/2-analyze: src/2-analyze.rs $(LIB) build

$(OUT)/3-extract: src/3-extract.rs $(LIB) build

$(OUT)/9-test: src/9-test.rs $(LIB) build

1.txt: $(OUT)/1-enum
	time $< > $@

2.txt: $(OUT)/2-analyze 1.txt
	time $< < 1.txt > $@

3.txt: $(OUT)/3-extract 2.txt
	time $< < 2.txt > $@

4.lp: src/4-opt.rb 3.txt
	time ruby $< 3.txt $@

4.txt: src/4-opt.rb 3.txt 4.sol
	time ruby $< 3.txt 4.sol 4.lp.map > $@

4.sol: neos.scip.10000sec.sol.lzma 4.lp
	md5sum -c 4.lp.md5sum
	unlzma -c $< > $@

5.txt: src/5-phf.rb 4.txt check
	time ruby $< 4.txt > $@

ai.txt: src/6-compress.rb 5.txt
	time ruby $< 5.txt > $@

9.txt: $(OUT)/9-test 4.txt
	time $< < 4.txt > $@
