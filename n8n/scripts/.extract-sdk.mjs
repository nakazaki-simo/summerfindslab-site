import fs from "node:fs";
let t = fs.readFileSync("n8n/scripts/.sdk-reference.txt", "utf8");
// Strip UTF-8 BOM if present.
if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
const j = JSON.parse(t);
const ref =
    j.structuredContent ||
    (j.content && j.content[0] && j.content[0].text) ||
    "";
const out = typeof ref === "string" ? ref : JSON.stringify(ref, null, 2);
fs.writeFileSync("n8n/scripts/.sdk-reference.md", out);
console.log("size:", fs.statSync("n8n/scripts/.sdk-reference.md").size);
