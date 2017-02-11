import * as assert from "power-assert";
import {Piece, Board, Result, isResult} from "../src/board";
import {Move, Normal, Drop} from "../src/move";

describe("Move", () => {
    it("should handle '直' correctly", () => {
        let b1 = new Board(0, 0).put(0, 0, Piece.Hen).put(1, 0, Piece.Hen);
        let b2 = new Board(0, 0).put(0, 0, Piece.Hen).put(1, 1, Piece.Hen);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲B3にわとり直");
    });

    it("should handle '右' correctly", () => {
        let b1 = new Board(0, 0).put(0, 0, Piece.Hen).put(2, 0, Piece.Hen);
        let b2 = new Board(0, 0).put(0, 0, Piece.Hen).put(1, 0, Piece.Hen);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲B4にわとり右");

        b1 = new Board(0, 0).put(0, 0, Piece.Elephant).put(2, 0, Piece.Elephant);
        b2 = new Board(0, 0).put(0, 0, Piece.Elephant).put(1, 1, Piece.Elephant);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲B3ぞう右");
    });

    it("should handle '左' correctly", () => {
        let b1 = new Board(0, 0).put(0, 0, Piece.Hen).put(2, 0, Piece.Hen);
        let b2 = new Board(0, 0).put(1, 0, Piece.Hen).put(2, 0, Piece.Hen);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲B4にわとり左");

        b1 = new Board(0, 0).put(0, 0, Piece.Elephant).put(2, 0, Piece.Elephant);
        b2 = new Board(0, 0).put(1, 1, Piece.Elephant).put(2, 0, Piece.Elephant);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲B3ぞう左");
    });

    it("should handle '上' correctly", () => {
        let b1 = new Board(0, 0).put(0, 0, Piece.Hen).put(0, 2, Piece.Hen);
        let b2 = new Board(0, 0).put(0, 1, Piece.Hen).put(0, 2, Piece.Hen);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲C3にわとり上");
    });

    it("should handle '下' correctly", () => {
        let b1 = new Board(0, 0).put(0, 0, Piece.Hen).put(0, 2, Piece.Hen);
        let b2 = new Board(0, 0).put(0, 0, Piece.Hen).put(0, 1, Piece.Hen);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲C3にわとり引");
    });

    it("should handle '寄' correctly", () => {
        let b1 = new Board(0, 0).put(0, 0, Piece.Hen).put(1, 1, Piece.Hen);
        let b2 = new Board(0, 0).put(0, 0, Piece.Hen).put(0, 1, Piece.Hen);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲C3にわとり寄");
    });

    it("should handle '成' correctly", () => {
        let b1 = new Board(0, 0).put(1, 3, Piece.Hen).put(0, 2, Piece.Chick);
        let b2 = new Board(0, 0).put(1, 3, Piece.Hen).put(0, 3, Piece.Hen);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲C1ひよこ成");

        b1 = new Board(0, 0).put(1, 3, Piece.Hen).put(0, 2, Piece.Chick);
        b2 = new Board(0, 0).put(0, 3, Piece.Hen).put(0, 2, Piece.Chick);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲C1にわとり");
    });

    it("should handle '打' correctly", () => {
        let b1 = new Board(0, 0).put(0, 0, Piece.Chick).inc_hand(Piece.Chick);
        let b2 = new Board(0, 0).put(0, 0, Piece.Chick).put(0, 1, Piece.Chick);
        assert.equal(Move.detect_move(b1, b2).toString(), "▲C3ひよこ打");
    });

    it("should handle an opposite move correctly", () => {
        let h = Piece.opponent[Piece.Hen];
        let b1 = new Board(0, 0).put(0, 0, h).put(0, 2, h);
        let b2 = new Board(0, 0).put(0, 0, h).put(0, 1, h);
        assert.equal(Move.detect_move(b1, b2).toString(), "△C3にわとり上");
    });

    it("should enumerate all possible moves correctly", () => {
        assert.equal(Move.possible_moves(Board.init()).length, 4);
        let b = new Board(0, 0).put(0, 0, Piece.opponent[Piece.Lion]).put(0, 1, Piece.Lion);
        assert.equal(Move.possible_moves(b).length, 0);
    });

    it("should handle property methods correctly", () => {
        let m = Move.possible_moves(Board.init())[0];
        if (m instanceof Normal) {
            assert.equal(m.piece(), Piece.Giraffe);
            assert.equal(m.promotion_p(), false);
            assert.equal(m.captured_piece(), Piece.Empty);
        }
        m = Move.possible_moves(Board.init())[3];
        if (m instanceof Normal) {
            assert.equal(m.piece(), Piece.Chick);
            assert.equal(m.promotion_p(), false);
            assert.equal(m.captured_piece(), Piece.opponent[Piece.Chick]);
        }
    });

    it("should handle match methods", () => {
        let ms = Move.possible_moves(Board.init());
        for (let j = 0; j < ms.length; j++) {
            for (let i = 0; i < ms.length; i++) {
                assert.equal(ms[i].match_p(ms[j]), i == j);
            }
        }
        let ms2 = Move.possible_moves(ms[0].new_board);
        for (let j = 0; j < ms2.length; j++) {
            for (let i = 0; i < ms2.length; i++) {
                assert.equal(ms2[i].match_p(ms2[j]), i == j);
            }
        }
        let ms3 = Move.possible_moves(ms[3].new_board.del(1, 2));
        for (let j = 0; j < ms3.length; j++) {
            for (let i = 0; i < ms3.length; i++) {
                assert.equal(ms3[i].match_p(ms3[j]), i == j);
            }
        }
    });
});
