// 國文題庫（選擇題含逐題解析，作文與公文保留原題）。
import type { Question } from "../questions";
import { clerkBank } from "./clerk-remaining";

export const bank: Question[] = clerkBank("chinese");
