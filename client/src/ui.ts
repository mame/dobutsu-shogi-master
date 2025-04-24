import "jquery-ui/dist/jquery-ui";
import "jquery-ui/themes/base/core.css";
import "jquery-ui/themes/base/button.css";
import "jquery-ui/themes/base/draggable.css";

// Hack to enable touch-punch for pointer device (e.g., Surface)
if ('onpointerenter' in window) {
  document["ontouchend"] = ((ev: TouchEvent) => void 0);
}

import "jquery-ui-touch-punch/jquery.ui.touch-punch";

import {Board, Piece, Result, isResult} from "./board";
import {AI} from "./ai";
import {Move, Normal, Drop} from "./move";

type UIState = { board: Board, depth: number };

export class UI {
    // the current board and its depth
    ui_state: UIState;

    // (the previous state, player's (black) move, master's (white) move)*
    history: [UIState, Move, Move][];

    // a mutex to change the state
    locked: boolean;

    constructor(public ai: AI) {
        this.ui_state = { board: Board.init(), depth: 78 };
        this.history = [];
        this.locked = false;

        $("span.piece").draggable({
            start: (event, ui) => { this.dragstart($(event.target) as JQuery<HTMLElement>); },
            stop: (event, ui) => { this.dragstop(); },
            revert: "invalid",
            revertDuration: 300,
            zIndex: 1000,
            scroll: false
        });
        $("div.cell").droppable({
            drop: (event, ui) => { this.drop(ui.draggable, $(event.target) as JQuery<HTMLElement>); },
        });

        $("button").button();
        $("button#undo").click((e) => this.undo_turn());
        $("button#about").click((e) => {
            $("#about-overlay").fadeIn("fast").off().click(() => {
                $("#about-overlay").fadeOut("fast");
            });
        });

        $(".piece").draggable("enable");
        this.dragstop();
    }


    // Helpers for manipulating DOMs

    // returns a div element of the cell (x, y)
    get_cell(x: number, y: number): JQuery {
        return $("div[data-x=" + x + "][data-y=" + y + "]");
    }

    // returns a div element of the cell (x, y) and a span element of the
    // piece at the cell
    get_cell_piece(x: number, y: number): [JQuery, JQuery] {
        let cell = this.get_cell(x, y);
        let piece = cell.children();
        if (piece.length === 1) throw new Error("not found");
        return [cell, piece.last()];
    }

    // lookups the position by a div element of a cell
    get_position_from_cell(cell: JQuery): [number, number] {
        return [cell.data("x"), cell.data("y")];
    }

    // returns i-th piece in hand of the player or master
    get_hand(player: boolean, i: number) {
        return $("#" + (player ? "player" : "master") + i);
    }

    // returns an empty hand cell of the player or master
    get_empty_hand(player: boolean): JQuery | never {
        for (let i = 0; i < 6; i++) {
            let hand = this.get_hand(player, i);
            if (hand.children().length === 0) return hand;
        }
        throw new Error("not found");
    }

    // returns a hand cell at that a given piece p is
    get_hand_piece(p: Piece): [JQuery, JQuery] | never {
        for (let i = 0; i < 6; i++) {
            let hand = this.get_hand(Piece.mine_p(p), i);
            let piece = hand.children().first();
            if (piece.length === 0) continue;
            let p2 = Piece.kind(p);
            if (p2 === Piece.Hen) p2 = Piece.Chick;
            let pp = this.get_piece_id_from_piece(piece);
            if (p2 === pp) return [hand, piece];
        }
        throw new Error("not found");
    }

    // lookups a number of piece by a span element of a piece
    get_piece_id_from_piece(piece: JQuery): Piece {
        let p = piece.data("p");
        if (piece.hasClass("promoted")) p = Piece.Hen;
        return p;
    }


    // Event handlers

    dragstart(piece: JQuery) {
        if (piece.hasClass("master")) return;
        if (this.ui_state.board.dead_p()) return;
        // show droppable cells
        this.query_move(piece, {}, (move) => {
            let cell = this.get_cell(move.nx, move.ny);
            cell.droppable("enable");
            cell.addClass("possible");
            let depth = this.ai.search(move.new_board)[0];
            cell.children().first().text(depth ? depth - 1 : "×");
        });
    }

    dragstop() {
        // make all cells undroppable
        $("div.cell").droppable("disable");
        $("div.cell").removeClass("possible");
        $("span.hint").text("");
    }

    drop(piece: JQuery, new_cell: JQuery) { // mouse drop
        let [nx, ny] = this.get_position_from_cell(new_cell);
        // identify and execute a move corresponding to the drop
        this.query_move(piece, { nx: nx, ny: ny }, (move) => {
            this.do_turn(move, piece);
        });
        this.dragstop();
    }

    // execute the player's turn, decide and execute the master's turn
    do_turn(move: Move, piece: JQuery) {
        if (!this.enter()) return;
        let [depth, nnb] = this.ai.search(move.new_board);
        let nmove = Move.detect_move(move.new_board, nnb);
        this.history.push([this.ui_state, move, nmove]);

        this.do_move(move, piece);
        $("span.piece").delay(300).promise().done(() => {
            this.do_move(nmove);
            this.leave({ board: nmove.new_board, depth: depth - 1 });
        });
    }

    // revoke the previous two turns (master's and player's)
    undo_turn() {
        if (!this.enter()) return;
        let prev = this.history.pop();
        if (!prev) return this.leave();
        let [prev_state, move, nmove] = prev;

        this.undo_move(nmove);
        $("span.piece").promise().done(() => {
            this.undo_move(move);
            this.leave(prev_state);
        });
    }

    // find a possible move that satisfies a given query
    query_move(piece: JQuery, query: any, cb: (move: Move) => void) {
        let cell = piece.parent();
        if (cell.hasClass("cell")) {
            // normal move
            let [x, y] = this.get_position_from_cell(cell);
            query.x = x;
            query.y = y;
        }
        else {
            // drop
            query.p = this.get_piece_id_from_piece(piece) ;
        }
        for (let move of Move.possible_moves(this.ui_state.board)) {
            if (move.match_p(query)) cb(move);
        }
    }

    // start changing the state
    enter(): boolean {
        if (this.locked) return false;
        this.locked = true;
        $("span#msg").text("計算中……");
        $("span.piece").draggable("disable");
        $("p#dead-msg").hide();
        $("span#master").addClass("thinking");
        return true;
    }

    // stop changing the state
    leave(s: UIState | undefined = undefined) {
        if (s) this.ui_state = s;
        let d = this.ui_state.depth;
        $("span#player").removeClass();
             if (d >= 70) $("span#player").addClass("level1");
        else if (d >= 40) $("span#player").addClass("level2");
        else if (d >= 20) $("span#player").addClass("level3");
        else if (d >= 10) $("span#player").addClass("level4");
        else if (d >=  2) $("span#player").addClass("level5");
        else if (d === 0) $("span#player").addClass("level6");
        if (d === 0) {
            let s = this.ui_state.board.dead_p() ? "ライオン取られた" : "トライされた";
            $("span#msg").text(s);
            $("p#dead-msg").show();
            $("span#last").text($("#record").children().length);
            $("span#about-image").addClass("dead");
        }
        else {
            $("span#msg").text("あと" + d + "手");
            if (d <= 10) $("#player").addClass("dying");
            $("span#about-image").removeClass("dead");
        }
        $("span.piece").draggable("enable");
        $("span#master").removeClass("thinking");
        this.locked = false;
    }

    // move a span element of a piece with animation
    animate_piece(piece: JQuery, old_place: JQuery, new_place: JQuery, fast: boolean) {
        new_place.append(piece);
        let { left: old_off_x  , top: old_off_y   } = old_place.offset()!;
        let { left: new_off_x  , top: new_off_y   } = new_place.offset()!;
        let { left: piece_off_x, top: piece_off_y } = piece.offset()!;
        let size = "" + (new_place.hasClass("hand") ? 0.5 : 1.0) + "em";
        piece.offset({
            left: piece_off_x - new_off_x + old_off_x,
            top : piece_off_y - new_off_y + old_off_y
        }).animate({ left: 0, top: 0, fontSize: size }, fast ? 200 : 300);
    }

    // perform a move forward
    do_move(move: Move, piece: JQuery | undefined = undefined) {
        let new_cell = this.get_cell(move.nx, move.ny);
        if (move instanceof Normal) {
            if (move.captured_piece() !== Piece.Empty) {
                // move a captured piece into hand
                let [new_cell, piece] = this.get_cell_piece(move.nx, move.ny);
                let hand = this.get_empty_hand(piece.hasClass("master"));
                this.animate_piece(piece, new_cell, hand, false);

                // a captured piece becomes the opponent's, promotion is revoked
                piece.toggleClass("master");
                piece.toggleClass("player");
                piece.removeClass("promoted");
            }

            // move a piece
            let [old_cell, piece] = this.get_cell_piece(move.x, move.y);
            if (move.promotion_p()) piece.addClass("promoted");
            this.animate_piece(piece, old_cell, new_cell, false);
        }
        else {
            // drop a piece
            let [hand, piece_] = piece ? [piece.parent(), piece] : this.get_hand_piece(move.p);
            this.animate_piece(piece_, hand, new_cell, false);
        }

        // add a entry to the record
        let s1 = move.toString();
        let s2 = $("ol#record").children().last().text();
        if (s1.substring(1, 3) === s2.substring(1, 3))
            s1 = s1[0] + "同" + s1.substr(3);
        $("ol#record").append($("<li>").addClass(piece ? "player-text" : "master-text").text(s1));
    }

    // perform a move backward
    undo_move(move: Move) {
        let [new_cell, piece] = this.get_cell_piece(move.nx, move.ny);
        if (move instanceof Normal) {
            // undo a move of a piece
            let old_cell = this.get_cell(move.x, move.y);
            if (move.promotion_p()) piece.removeClass("promoted");
            this.animate_piece(piece, new_cell, old_cell, true);

            let p = move.captured_piece();
            if (p !== Piece.Empty) {
                // move a captured piece back
                let [hand, piece] = this.get_hand_piece(Piece.opponent[p]);
                this.animate_piece(piece, hand, new_cell, true);

                // a captured piece becomes the opponent's, promoted back if needed
                piece.toggleClass("master");
                piece.toggleClass("player");
                if (Piece.kind(p) === Piece.Hen) piece.addClass("promoted");
            }
        }
        else {
            // undo a drop
            let hand = this.get_empty_hand(piece.hasClass("player"));
            this.animate_piece(piece, new_cell, hand, true);
        }

        // remove a record entry
        $("ol#record").children().last().detach();
    }
}

// テストしたい手順
//   にわとりになる
//   トライで負ける
//   にわとり取られる
//   持ち駒が 6 個になる
