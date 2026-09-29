import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Converter } from 'opencc-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const i18nCommands = join(root, 'i18n', 'commands');
const i18nConfig = join(root, 'i18n', 'config');
const i18nBundle = join(root, 'i18n', 'bundle');

const enNls = JSON.parse(readFileSync(join(root, 'package.nls.json'), 'utf8'));
const enCmd = JSON.parse(readFileSync(join(i18nCommands, 'en.json'), 'utf8'));
const enCfg = JSON.parse(readFileSync(join(i18nConfig, 'en.json'), 'utf8'));
const zhCn = JSON.parse(readFileSync(join(root, 'package.nls.zh-cn.json'), 'utf8'));
const zhCnCfg = JSON.parse(readFileSync(join(i18nConfig, 'zh-cn.json'), 'utf8'));

const enCmdKeys = Object.keys(enCmd).sort();
const enCfgKeys = Object.keys(enCfg).sort();

function pickCommands(full) {
  const out = {};
  for (const k of enCmdKeys) out[k] = full[k];
  return out;
}

function assertKeys(obj, expected, label) {
  const keys = Object.keys(obj).sort();
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
    const missing = expected.filter((k) => !(k in obj));
    const extra = keys.filter((k) => !expected.includes(k));
    throw new Error(`${label}: key mismatch missing=${missing.join(',')} extra=${extra.join(',')}`);
  }
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const s2t = Converter({ from: 'cn', to: 'tw' });

/** Taiwan UX terms after generic OpenCC */
const twReplacements = [
  ['内存', '記憶體'],
  ['磁盘', '磁碟'],
  ['缓存', '快取'],
  ['程序', '程式'],
  ['软件', '軟體'],
  ['网络', '網路'],
  ['指针', '指標'],
  ['字符串', '字串'],
  ['终端', '終端機'],
  ['设置', '設定'],
  ['工作区', '工作區'],
  ['启用', '啟用'],
  ['禁用', '停用'],
  ['选区', '選取範圍'],
  ['日志', '日誌'],
  ['菜单', '選單'],
  ['连接', '連線'],
  ['密钥', '金鑰'],
  ['网关', '閘道'],
  ['并发', '並行'],
  ['批量', '批次'],
  ['正则', '正規'],
  ['文档', '文件'],
  ['侧文件', '側檔'],
  ['侧', '側'],
  ['块', '區塊'],
  ['旧版', '舊版'],
  ['实验性', '實驗性'],
  ['约略', '約略'],
  ['全局', '全域'],
  ['保守', '保守'],
];

function toTraditional(text) {
  let s = s2t(text);
  for (const [from, to] of twReplacements) {
    s = s.split(from).join(to);
  }
  return s;
}

function convertObj(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = toTraditional(v);
  return out;
}

const zhTwCmd = convertObj(pickCommands(zhCn));
const zhTwCfg = convertObj(zhCnCfg);
assertKeys(zhTwCmd, enCmdKeys, 'zh-tw commands');
assertKeys(zhTwCfg, enCfgKeys, 'zh-tw config');

writeJson(join(i18nCommands, 'zh-tw.json'), zhTwCmd);
writeJson(join(i18nConfig, 'zh-tw.json'), zhTwCfg);

console.log('Generated zh-tw commands/config under i18n/');
console.log('EN reference keys:', Object.keys(enNls).length);
console.log('Run npm run merge-nls to refresh package.nls.* and l10n/');
