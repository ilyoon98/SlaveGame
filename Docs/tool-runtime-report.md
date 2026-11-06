# 게임 리소스 도구 로컬 실행 보고

확인일: 2026-11-06 (Asia/Seoul)

## 다운로드한 공식 소스

아래 네 저장소는 `git clone --depth 1 --filter=blob:none`으로 받은 얕은 저장소다. 다운로드 과정에서 `GIT_LFS_SKIP_SMUDGE=1`을 지정했다. 이 네 저장소의 별도 모델 가중치·Python 의존성 설치와 기존 전역 스킬 덮어쓰기는 하지 않았다. sprite-gen 실행에 필요한 프로젝트 전용 가상환경은 별도로 준비했다.

| 도구 | 프로젝트 내 위치 | 버전 / commit | 현재 상태 |
| --- | --- | --- | --- |
| [PixelFX](https://github.com/patch-gg/pixelfx) | `Tools/vendor/pixelfx` | package 0.3.0 / `a84159688af3ca37a4be05a0d422b94451b2e24e` | Node CLI로 효과 3개 내보내기 및 검사 완료 |
| [Pixelbolt](https://github.com/skulitom/Pixelbolt) | `Tools/vendor/Pixelbolt` | package 0.12.1 / `8814970d7774e94432762c683b756ad3db86e896` | CLI 도움말, 예제 validate 및 render 정상 |
| [PixelOE](https://github.com/KohakuBlueleaf/PixelOE) | `Tools/vendor/PixelOE` | pyproject 1.0.1 / `7ce444b36d3876a151d845d4493240e904454d89` | 소스만 보관, 실행 의존성 미설치 |
| [Sprite Sheet Diffusion](https://github.com/chenganhsieh/Sprite-Sheet-Diffusion) | `Tools/vendor/Sprite-Sheet-Diffusion` | `382c2e7a3ae8d6e012963ec19c43415159e439c7` | 소스만 보관, 추론/훈련/모델 다운로드 미실행 |

모든 vendor 저장소에서 `git status --short`가 비어 있음을 확인했다. PixelOE와 SSD의 작업 트리에 `.safetensors`, `.pth`, `.pt`, `.ckpt`, `.bin` 파일이 없었다. 프로젝트에 포함된 예시 이미지 등은 소스 저장소의 일부로 내려받았다.

## 재사용한 실행 환경

- Node.js: `C:/Program Files/nodejs/node.exe`, v24.18.1.
- Python: `C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1104-709-0_26.1104.709.0_x64__3k8sg7r9htsxt/dependencies/python/python.exe`, 3.12.14.
- 번들 Pillow 13.0.0, NumPy 2.3.5, pip 26.2.2, venv 사용 가능.
- imageio, imageio_ffmpeg, cv2, torch는 이 Python에 없다. FFmpeg와 uv도 PATH 및 조사한 번들 위치에서 찾지 못했다.
- PixelFX와 Pixelbolt 실행에는 Node만 필요했고 `npm install`을 하지 않았다.
- 기존 `C:/Users/imtl/.codex/skills/pixelbolt-pixel-art/SKILL.md`는 그대로 보존했다. 실행 소스는 이제 프로젝트의 `Tools/vendor/Pixelbolt`를 이용할 수 있다.

## 내보낸 PixelFX 효과

원본 효과를 수정하지 않고 내보냈다. `--no-actor`로 라이브러리의 회색 임시 캐릭터를 제외했다. 아래 PNG는 투명 RGBA 스프라이트 시트이며 JSON은 프레임 영역과 시간, pivot을 포함한다. `contact.png`의 어두운 배경은 검토용 이미지에만 있다.

| 용도 | 폴더 | 프레임 크기 | 프레임 수 / fps | pivot | 시트 PNG 크기 |
| --- | --- | --- | --- | --- | --- |
| 횡스크롤 검격 | `Assets/Effects/melee/sword-slash` | 136×104 | 24 / 30 | (44, 92) | 680×520 |
| 골드 획득 시안 | `Assets/Effects/ui/coin-collect` | 176×116 | 75 / 30 | (60, 102) | 1408×1160 |
| 포획용 속박 시안 | `Assets/Effects/nature/root-snare` | 128×96 | 82 / 30 | (64, 78) | 1024×1056 |

각 폴더에 효과 이름의 `.png`, `.json`, 그리고 `contact.png`가 있다. 모든 시트의 alpha 범위는 0–255로 확인했고, 모두 `loop: false`다. 실제 엔진에서는 JSON의 개별 프레임 duration과 pivot을 사용하고 nearest-neighbour 필터를 적용한다.

### 검수 결과와 범위

- 세 효과의 contact PNG를 실제로 열어 확인했다.
- 검격은 밝은 초승달 궤적이 빠르게 나타나고 파편과 잔광으로 사라진다. 오른쪽을 향하는 횡스크롤 공격에 맞는 후보다.
- 골드 획득은 동전이 튄 뒤 우측 위 숫자로 모인다. 현재 숫자(12→22)는 효과에 포함된 데모이므로 실제 경영 UI의 골드 값과 연결할 때 수정하거나 시각 효과 부분만 활용해야 한다.
- 뿌리 속박은 바닥에서 올라와 감긴 뒤 흩어진다. 게임의 포획 연출 후보이며, 실제 포획 판정이나 캐릭터 애니메이션은 포함하지 않는다.
- `node tools/check.mjs melee/sword-slash ui/coin-collect nature/root-snare`: **3 pass, 0 fail, 0 warnings**.
- PNG/JSON 구조와 투명도도 별도 읽기 검사했다. 실시간 게임 화면에서의 캐릭터 동작 동기화 및 플레이백 검수는 아직 하지 않았다.
- 첫 실행 확인용 횃불 contact PNG는 `Assets/Effects/_validation/fire/torch/contact.png`에 있다.

## Pixelbolt 실행 확인

`node Tools/vendor/Pixelbolt/bin/pixelbolt.js --help`가 정상 종료했다. 동봉된 `examples/coin.json`에 대해 validate와 render를 실행했다.

- 결과: 24×24, 6프레임, 4색, 투명 배경, spin 루프, 경고 없음.
- 출력: `Assets/Effects/_validation/pixelbolt-coin`.
- 이 폴더에 `coin.png`, `coin.atlas.json`, `coin.tres`, `coin.pixel.json`, `animations/spin.png`, `preview.html` 등이 있다.
- 이는 실행 검증용 기존 예제이며 이번 게임의 신규 캐릭터 리소스로 주장하지 않는다.

## 추가 스킬 실행과 캐릭터 시안

- `Tools/.venv`: Python 3.12 기반의 프로젝트 전용 환경. sprite-gen 3.15.0, Pillow 12.3.0, NumPy 2.5.4, PyYAML 6.0.3 설치. 기존 Codex 번들 패키지는 변경하지 않았다.
- sprite-gen CLI `--help` 정상. `inspect-motion`을 정적 마스터에 실행해 파일과 크기를 읽는 동작을 확인했다. 단일 프레임이므로 결과는 `status: unknown`, `motion.present: false`, `stride_verified: false`이며 애니메이션 검증 통과로 취급하지 않는다.
- ASF `generate2dsprite/scripts/sheet_qc.py --help` 정상. 이미지·영상 외부 API는 실행하지 않았다.
- 2dimg2motion의 `standardize_baseline.py`로 캐릭터 기준 이미지를 생성했다. 캐릭터 247×360, 캔버스 787×900, 사방 270px 여백, 경고 없음. 생성물은 `Art/Source/swordsman-animation-baseline.png`다.
- Codixel의 `core/pixel.js`로 단순화된 원본을 픽셀화하고 1배·5배 비교 이미지를 생성했다. 캔버스 64×80, 실제 인물 49×72, 사용된 불투명색 22개, alpha는 0/255다.
- `Art/Previews/swordsman-comparison.png`를 실제로 열어 확인했다. 기존보다 주머니·중복 끈·갑옷 장식이 줄었고 붉은 망토와 검을 유지한다. 얼굴은 작은 크기에서 단순화되며 몸통은 약간의 3/4 시점이다.
- 캐릭터 걷기·공격 프레임과 실시간 게임 본체는 아직 만들지 않았다. 정적 기준 이미지와 검토 보드만 완성한 상태다.

이미지 창작은 내장 `image_gen`, 도트 변환은 Codixel, 기준 캔버스 정리는 2dimg2motion을 사용했다. 정확한 생성 프롬프트와 평가 메모는 `Art/Source/swordsman-simple-master.prompt.md`에 보관한다.

## 재실행 명령

프로젝트 루트에서:

```powershell
node Tools/vendor/Pixelbolt/bin/pixelbolt.js --help
node Tools/vendor/Pixelbolt/bin/pixelbolt.js validate Tools/vendor/Pixelbolt/examples/coin.json
node Tools/vendor/Pixelbolt/bin/pixelbolt.js render Tools/vendor/Pixelbolt/examples/coin.json --out Assets/Effects/_validation/pixelbolt-coin-v2
```

`Tools/vendor/pixelfx` 폴더에서:

```powershell
node tools/render.mjs melee/sword-slash ui/coin-collect nature/root-snare --sheet --no-actor --out C:/Users/imtl/ilyoon_Git/SlaveGame/Assets/Effects
node tools/check.mjs melee/sword-slash ui/coin-collect nature/root-snare
```

PixelFX의 GIF/MP4 CLI 미리보기는 FFmpeg가 필요해 실행하지 않았다. PNG 시트 내보내기에는 필요하지 않다. 아래 GIF는 내보낸 PNG/atlas를 Pillow로 포장했다.

## 효과 미리보기 GIF

- 출력: `Art/Previews/effects-preview.gif`.
- 크기: 896×280, 약 1.66 MiB, 재생 시간 6.97초, 무한 반복.
- 검격·골드·속박을 나란히 보여 주며 각 효과를 왼쪽부터 한 번씩 재생한다. 재생하지 않는 두 칸은 식별 가능한 대표 프레임을 유지한다.
- 처음과 끝은 세 효과의 대표 프레임을 0.5초씩 보여 주므로 빈 첫 프레임으로 시작하지 않는다.
- 원본 시트에서 atlas 순서대로 프레임을 추출하고, 어두운 단색 배경에 합성한 뒤 nearest-neighbour 2배 확대와 GIF 패킹만 수행했다. 효과 모양과 캐릭터 파일은 수정하지 않았다.
- atlas의 33ms duration을 누적 시간 기준 30/40ms로 반올림했다. 원본 시퀀스와 미리보기 정지 구간의 합은 6,973ms이며 GIF는 6,970ms다. GIF 제한에 맞게 전체 프레임에 공통 256색 팔레트를 사용했고 디더링은 사용하지 않았다.
- 입력은 정지 구간 포함 183프레임이며 GIF 인코더가 동일 프레임의 시간을 병합해 저장 프레임은 163개다.
- 골드 HUD 데모(12→22)는 원본 그대로 유지했다. 실제 게임 재화 값과 연결된 UI가 아니다.
- 실행 환경: 프로젝트 `Tools/.venv/Scripts/python.exe`, Pillow 12.3. 이미지 재생으로 동작 전체를 직접 확인하지는 못했다. 기존 세 contact sheet와 생성 GIF의 첫 장면을 열어 확인했고, GIF의 프레임 수·크기·누적 duration을 읽어서 검사했다.

## 소스 라이선스 기록

- PixelFX 코드와 효과는 MIT. 효과 폴더에 `LICENSE.pixelfx.txt`와 `NOTICE.pixelfx.md`를 보존했다. Gallery의 Patch Pixel 폰트는 저장소 MIT 범위가 아니며 게임 리소스로 복사하지 않았다.
- Pixelbolt는 MIT. 검증 예제 출력에 `LICENSE.pixelbolt.txt`를 함께 보존했다.
- PixelOE는 Apache-2.0. 무거운 torch/torchvision/kornia/slangpy 등의 의존성 설치는 보류했다.
- SSD의 최상위 `readme.md`는 MIT라고 설명하지만 최상위 LICENSE 파일은 없었다. 포함된 `Dataprocessing/openpose/LICENSE`와 `ModelTraining/openpose/LICENSE`에는 비상업 연구용 제한이 있다. 따라서 저장소 전체를 제한 없는 게임 제작 도구라고 취급하지 않으며, 현재는 연구용 소스 보관 상태다. 추론, 훈련, 상업 게임 리소스 생성에는 사용하지 않았다.
