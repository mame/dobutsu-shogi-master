import * as assert from "power-assert";
import {Piece, Board, Result, isResult} from "../src/board";

describe("Board", () => {
    it("should work correctly", () => {
        let b = Board.init();

        assert.equal(b.hashstr(), "000b0029c41a003");
        b = Board.from_hashstr("000b0029c41a003");
        assert.equal(b.toString(), "gle \n.c.\n.C.\nELG ");

        assert.equal(b.get(0, 0), Piece.Giraffe);
        assert.equal(b.get(1, 0), Piece.Lion);
        assert.equal(b.get(1, 3), Piece.opponent[Piece.Lion]);
        assert.equal(b.get(0, 1), Piece.Empty);

        b = b.del(1, 3).put(1, 3, Piece.Hen);
        assert.equal(b.get(1, 3), Piece.Hen);

        b = b.inc_hand(Piece.Hen);
        assert.equal(b.hand(Piece.Chick), 1);
        assert.equal(b.hand(Piece.Elephant), 0);
        assert.equal(b.hand(Piece.Giraffe), 0);
        assert.equal(b.hand(Piece.opponent[Piece.Chick]), 0);
        assert.equal(b.hand(Piece.opponent[Piece.Elephant]), 0);
        assert.equal(b.hand(Piece.opponent[Piece.Giraffe]), 0);
        assert.equal(b.dead_p(), false);

        b = b.reverse()
        assert.equal(b.hand(Piece.Chick), 0);
        assert.equal(b.hand(Piece.Elephant), 0);
        assert.equal(b.hand(Piece.Giraffe), 0);
        assert.equal(b.hand(Piece.opponent[Piece.Chick]), 1);
        assert.equal(b.hand(Piece.opponent[Piece.Elephant]), 0);
        assert.equal(b.hand(Piece.opponent[Piece.Giraffe]), 0);
        assert.equal(b.dead_p(), true);
        assert.equal(b.toString(), "elg c\n.c.\n.C.\nGhE ");

        b = Board.from_hashstr("02a000001090000");
        assert.equal(b.next_boards(), Result.Lose);
    });
});
