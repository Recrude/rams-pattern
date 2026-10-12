# Rams Pattern

Braun 그릴·타공판 계열의 구멍 패턴을 만들어 SVG(mm 단위)로 내보내는 생성기.
<https://rams-pattern.vercel.app/> — 빌드 없는 정적 사이트. `index.html`을 바로 열어도 된다.

- `pattern.js` — 기하와 SVG 출력 (브라우저 `window.RamsPattern`, Node `require`)
- `app.js` — 조작 화면. 상태는 주소 `#`에 기본값과 다른 값만 JSON으로 남는다
- `tests/pattern.test.js` — `node --test tests/pattern.test.js`
- `tools/make-images.js` — 파비콘·공유 이미지(`favicon.svg`, `og.png`, `apple-touch-icon.png`)를 같은 엔진으로 그린다

## 배포·검색

Vercel 정적 배포(설정 없음). `tests`·`tools`·`README.md`는 `.vercelignore`로 뺀다.
주소 `https://rams-pattern.vercel.app/`는 `index.html`(canonical · og:url · og:image · JSON-LD), `robots.txt`, `sitemap.xml`에 적혀 있다.
도메인이 바뀌면 이 다섯 곳을 함께 바꾼다.

## 모델

판(W×H) 가운데에 영역(원 · 둥근 사각)을 두고, 배열 위치마다 구멍을 놓아 **구멍 전체가 영역 안에 들어갈 때만** 남긴다.
구멍은 원판 1·2·4개의 볼록 껍질(원 · 슬롯 · 둥근 사각)이라 원판마다 영역 안인지만 보면 된다.

- 동심원: 가운데 구멍 1개(기본 켬) + 고리 k의 반지름 = 첫 고리 + (k−1)·간격. 배수 규칙은 구멍 수 = round(배수·r/간격) → 6, 12, 18 …,
  등간격 규칙은 round(2πr/호 간격). 위상은 정렬 · 엇갈림(짝수 고리 반 칸) · 비틀기(고리마다 n°).
- 격자: 가로·세로 간격, 홀수 줄 엇갈림, 회전. 슬롯은 "영역 폭에 맞춰 늘이기"로 줄마다 현 길이 슬릿이 된다.

## 버전과 참고 제품

참고 제품은 그릴 종류(구멍 · 슬릿 · 타공판)까지만 확인했다. 실제 제품의 구멍 수·간격은 대조하지 않았다.
출처: Jatzke-Wigand, [Braun design loudspeaker fronts](https://www.designundtext.com/en/2.1.38_braun-design-loudspeaker-fronts-bdd.php), [MoMA LE 1](https://www.moma.org/collection/works/4081).

| 번호 | 이름 | 참고 |
| --- | --- | --- |
| 01 | 동심원 배수 | T 3 (1958) 타공 전면 · 사용자가 준 DR05 포스터의 그릴 |
| 02 | 동심원 엇갈림 | |
| 03 | 원형 격자 | |
| 04 | 엇갈림 타공 | LE 1 · L 01 (1958) 검은 타공판 |
| 05 | 정사각 타공 | |
| 06 | 가로 슬릿 | SK 4 (1956) 가로 슬릿 |
| 07 | 원형 슬릿 | |
| 08 | 방사 슬롯 | |
