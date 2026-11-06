# 이끼송곳니 거점 배경 생성

생성 목적: 거점 육성 프로토타입에서 사용하는 불투명 배경. 기본 캐릭터는 별도 기존 아틀라스를 사용한다.

도구: 내장 image_gen. 생성일: 2026-11-06.

- 최종 자산: `Assets/Environments/goblin-camp.png` — 1774×887px, RGB, 불투명.
- 생성 원본: `C:/Users/imtl/.codex/generated_images/01a1af09-45b1-7760-aea4-96b37c0c9cf4/exec-cff34062-e69a-4659-b5e3-55f0440ebf0e.png`.
- 원본을 그대로 프로젝트에 복사했다. 사람·문자·UI가 없는 배경이며 캐릭터와 시설 표식은 실행 중 별도로 표시한다.
- 시각 확인: 숙소·교육 마당·경기장·공연장·거래소가 가로로 구분되고 전경의 흙길이 비어 있다. 원본 배경 전체를 별도 열어볼 수 있으며, 게임 화면은 조작 영역을 확보하기 위해 위쪽 숲의 일부를 잘라 보여줄 수 있다.

## 프롬프트

Use case: stylized-concept / actual 2D game environment asset.
Asset type: a wide side-scrolling goblin-operated forest settlement background for a management game. This is the actual in-game scene, not a UI mockup.
Primary request: beautiful atmospheric pixel-art panorama, landscape roughly 2:1 aspect ratio, around 2048x1024. A scrappy but organized goblin outpost called Mossfang, with a readable row of five modest facilities behind a single flat walking lane.
Composition: strict SIDE VIEW with only a slight view of building roofs, no isometric map, no aerial view. One continuous level ground line across the entire width at 82% of image height. Keep the walking lane from 74% to89% height open and uncluttered for game sprites. Building bases reach the back edge of that lane. Facility centers left to right at 12%,32%,51%,71%,89% image width:
1 left: squat moss-roofed timber dormitory with fabric door and amber window;
2 training yard: open wooden practice shelter with two straw practice targets and simple weapon rack, plenty of empty foreground;
3 small arena: low oval rope-and-log enclosure, patched olive-green pennants, open entry and plain earth;
4 performance stage: small raised wooden platform with ochre and faded wine-red drapes, a warm pair of lanterns, simple drum/lute resting at edge, no performers;
5 trading post: crooked wooden market counter with green awning, scales, crates and modest little handcart.
Use crooked timber, woven cloth, carved tusk motifs and mossy stones to suggest goblin craftsmanship. Cozy but slightly roguish frontier fantasy, not horror.
Background: distant layered muted sage forest, giant old tree trunks, soft blue-grey ridge, filtered late afternoon sky; background low contrast. Frame edges with foliage sparingly, no foreground objects blocking walkway. Main facilities midground readable large silhouettes with distinct roof shapes.
Style: polished indie fantasy game PIXEL ART, chunky coherent pixel clusters, broad color shapes, 24-to-40-color feel, restrained texture, strong silhouettes, no photoreal or smooth 3D rendering. Pixel-art lighting not bloom. The environment should be less contrasty than the foreground characters we will overlay.
Palette: marsh dark green #1f3028, weathered timber #354236, straw #dfd2ae, old brass #c9a65d, moss #97ac76, faded rust-red cloth as small accent, soft sage distance.
Constraints: fully opaque background. NO people, NO goblins or other characters, NO creatures, NO printed words/letters/numbers, NO user-interface, NO labels, NO logos, NO watermarks. No chains, cages, gore or giant skull clutter. Facilities should fit on same horizontal ground with ample clear walking strip. The center may contain arena architecture behind the lane but no high-contrast center spotlight. Do not cram hundreds of tiny props.
