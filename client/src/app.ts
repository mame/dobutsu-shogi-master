import "./index.html";
import "./app.scss";
import {AI} from "./ai";
import {UI} from "./ui";
//@ts-ignore
import ai_txt from "ai.txt";

new UI(new AI(ai_txt));
