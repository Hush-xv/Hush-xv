/**
 * 从 wallhaven 榜单随机挑一张壁纸，裁成主页横幅。
 * 用法：
 *   node scripts/refresh-banner.mjs [本地图片路径]
 * 不带参数时自动请求 wallhaven API 随机挑选（GitHub Actions 里用）。
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const TARGET_W = 2400;
const TARGET_H = 640;
const API = "https://wallhaven.cc/api/v1/search?categories=110&purity=100&sorting=toplist&order=desc";

async function pickWallpaper() {
	const page = 1 + Math.floor(Math.random() * 5);
	const res = await fetch(`${API}&page=${page}`);
	if (!res.ok) throw new Error(`wallhaven api ${res.status}`);
	const data = (await res.json()).data;
	const candidates = data.filter(w => {
		const [x, y] = [w.dimension_x, w.dimension_y];
		const r = x / y;
		return x >= 1920 && r >= 1.3 && r <= 2.4;
	});
	if (!candidates.length) throw new Error("no suitable wallpaper on this page");
	const pick = candidates[Math.floor(Math.random() * Math.min(6, candidates.length))];
	const img = await fetch(pick.path);
	if (!img.ok) throw new Error(`image download ${img.status}`);
	return { buffer: Buffer.from(await img.arrayBuffer()), id: pick.id };
}

let input = process.argv[2];
let id = "local";

if (input) {
	console.log(`using local file: ${input}`);
} else {
	console.log("picking from wallhaven toplist...");
	const picked = await pickWallpaper();
	input = `banner-src-${picked.id}.img`;
	writeFileSync(input, picked.buffer);
	id = picked.id;
	console.log(`picked wallhaven ${picked.id}`);
}

await sharp(input)
	.resize(TARGET_W, TARGET_H, { fit: "cover", position: "attention" })
	.jpeg({ quality: 85, mozjpeg: true })
	.toFile("assets/banner.jpg");

console.log(`banner.jpg generated from wallhaven ${id}`);
