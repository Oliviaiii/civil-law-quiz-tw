export type Reference = {
  type: "statute" | "constitutional-decision" | "court-decision" | "official-material";
  title: string;
  locator?: string;
  url: string;
  text?: string;
  publishedAt?: string;
};
