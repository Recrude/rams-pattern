// 파비콘·공유 이미지를 생성기 엔진으로 그린다.
//   node tools/make-images.js favicon > favicon.svg
//   node tools/make-images.js og | magick -density 300 svg:- -resize '1200x630!' -depth 8 -strip -colors 64 og.png
//   node tools/make-images.js favicon | magick -density 600 svg:- -resize '180x180!' -depth 8 -strip -colors 64 apple-touch-icon.png
const RP = require('../pattern.js');

const SETS = {
  // 가운데 1 + 첫 고리 6
  favicon: { panelW: 48, panelH: 48, diameter: 46, pitch: 14, firstRing: 14, d: 7 },
  // 01 동심원 배수 그대로, 판만 1200:630 비율로
  og: { panelW: 240, panelH: 126 },
};

const name = process.argv[2];
if (!SETS[name]) {
  console.error('사용: node tools/make-images.js favicon|og');
  process.exit(1);
}
const res = RP.generate({ ...RP.DEFAULTS, ...SETS[name] });
process.stdout.write(RP.toSVG(res, { preview: true }) + '\n');
