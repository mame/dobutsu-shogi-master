import "./index.html";
import "./app.scss";
import {AI} from "./ai";
import {UI} from "./ui";

declare function require(s: string): string;

new UI(new AI(require("ai.txt")));
