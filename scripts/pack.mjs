// 打包：把扩展要用的文件打成 dist/world-clock-fx-extension-<版本>.zip，供上传商店或发给别人「加载已解压」。
// 只用 node 自带模块（fs、path、zlib），自己写 zip 结构，不加依赖。
// 用法：npm run pack。打完输出一行：包路径、文件数、大小；出错输出原文并以退出码 1 结束。
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 只装这些：清单、后台、共享逻辑、浮窗、弹窗、图标。tests/、scripts/、文档、package.json 不进包。
const INCLUDE = ["manifest.json", "background.js", "lib", "content", "popup", "icons"];

function listFiles(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`缺少 ${rel}`);
  if (fs.statSync(abs).isFile()) return [rel];
  return fs.readdirSync(abs).sort().flatMap((name) => listFiles(path.join(rel, name)));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function buildZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    const data = fs.readFileSync(abs);
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const name = Buffer.from(rel.split(path.sep).join("/"), "utf8");
    const crc = crc32(data);
    const { time, day } = dosTime(fs.statSync(abs).mtime);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // 文件名按 UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + packed.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

try {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  const version = String(manifest.version || "").trim();
  if (!version) throw new Error("manifest.json 里没有 version");
  const files = INCLUDE.flatMap(listFiles);
  const out = path.join(ROOT, "dist", `world-clock-fx-extension-${version}.zip`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const zip = buildZip(files);
  fs.writeFileSync(out, zip);
  console.log(`${path.relative(ROOT, out)}  ${files.length} 个文件  ${(zip.length / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error(`打包失败：${err.message}`);
  process.exit(1);
}