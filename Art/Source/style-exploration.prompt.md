# 스타일 탐색 — 루카 3안 (Codex 이미지 생성용)

작성: 2026-11-11. 절차형 루카(42px, 사각형 조립)가 못생겼다는 피드백에 따라 **그림체 자체를 다시 고른다.** 같은 인물(루카)과 고블린 1명을 세 가지 스타일로 뽑아 비교한다.

## 사용 방법

1. Codex에서 아래 프롬프트를 **하나씩** 실행한다. 각 프롬프트마다 [거점 배경](../../Assets/Environments/goblin-camp.png)을 참조 이미지로 첨부한다(픽셀 밀도·색감 맞춤용).
2. 결과를 `Art/StyleExploration/`에 다음 이름으로 저장한다.
   - `style-a-hibit-sd.png`
   - `style-b-hibit-md.png`
   - `style-c-chibi-illust.png`
3. 마음에 들지 않으면 같은 프롬프트로 2~3번 더 뽑아 `style-a-hibit-sd-2.png`처럼 번호를 붙인다. 고른 1장이 이후 모든 캐릭터의 **기준 이미지(골든 레퍼런스)**가 된다.

프롬프트에는 다른 게임 이름을 넣지 않는다. 특정 게임을 따라 그린 결과가 아니라 이 게임만의 그림체를 만들기 위해서다.

## 공통 인물 문구 (세 안 모두 동일)

```text
Character A — "Luka": young adult human man, a trainee fighter being raised in a goblin
forest camp. Short tousled brown hair, light skin, friendly determined expression.
Navy blue training tunic and navy trousers, one plain brown leather belt, brown leather
boots, a short red scarf around the neck. Holds a plain wooden practice sword.
Character B — goblin camp keeper: short stocky goblin, moss-green skin, large ears swept
back, long nose, sly but cheerful grin, simple patched brown leather vest and rough linen
shorts, barefoot. No weapon.
No pouches, extra straps, buckles, armor engravings or patterns. Clean, readable shapes.
```

## A안 — 하이비트 픽셀 SD (추천)

```text
Pixel art character style sheet for a cozy side-scrolling management game.
[공통 인물 문구]
Style: high-resolution "hi-bit" pixel art, cute SD proportions about 2.5 heads tall,
large head with big expressive eyes, body facing right in side view but the FACE turned
three-quarters toward the viewer so both eyes are visible. Rounded silhouettes, soft
rounded head and cheeks, small hands and feet. Luka about 96 pixels tall on a 128x128
cell, the goblin about 76 pixels tall; same pixel size for both. Crisp 1px dark outline
(not pure black), 3-4 tone cel shading with light from above, limited warm earthy
palette that matches the attached forest camp background's pixel density and colours.
Layout: the two characters standing side by side on one flat ground line, full body,
plain flat dark green background #2a3a30, generous margins. No text, no UI, no frames.
```

## B안 — 하이비트 픽셀 MD

```text
Pixel art character style sheet for a side-scrolling management game.
[공통 인물 문구]
Style: high-resolution "hi-bit" pixel art, MD proportions about 3.5 heads tall, slightly
stylised but not baby-like, readable face with two visible eyes (three-quarter face,
body in side view facing right). Luka about 112 pixels tall on a 128x160 cell, the goblin
about 84 pixels tall; same pixel size for both. Crisp 1px dark outline (not pure black),
3-4 tone cel shading with light from above, palette and pixel density matching the
attached forest camp background.
Layout: the two characters standing side by side on one flat ground line, full body,
plain flat dark green background #2a3a30. No text, no UI, no frames.
```

## C안 — SD 일러스트 (픽셀 아님, 부위 분리 애니메이션용)

```text
Character style sheet for a cozy 2D management game, NOT pixel art.
[공통 인물 문구]
Style: clean hand-drawn chibi illustration, about 2.5 heads tall, big head with large
expressive eyes, three-quarter view facing right. Smooth clean lineart in dark brown,
flat colours with one soft shadow tone, warm earthy palette matching the attached forest
camp background. Designed for cut-out (bone) animation: arms, legs, head and torso are
clearly separated shapes that do not overlap in complicated ways.
Layout: the two characters standing side by side on one flat ground line, full body,
plain flat dark green background #2a3a30. No text, no UI, no frames.
```

## 고른 뒤 할 일

- [캐릭터 바이블](../../Docs/CharacterBible.md)의 규격을 고른 스타일로 다시 쓴다(키, 캔버스, 얼굴 방향, 눈 크기, 팔레트 색 수).
- 동작은 기준 이미지로 **핵심 포즈를 다시 생성**해서 만든다(`2dimg2motion` 방식). 사각형으로 팔다리를 조립하는 절차형 방식은 쓰지 않는다.
- 후처리는 배경 제거, 크기 맞춤, 팔레트 정리까지만 한다. 원본보다 해상도를 크게 낮추지 않는다.
