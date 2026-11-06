# 검사 캐릭터 걷기·공격 애니메이션

승인된 `Art/Source/swordsman-animation-baseline.png`를 기준으로 만든 프로토타입 애니메이션입니다. 모든 동작 포즈는 `image_gen`에서 캐릭터 전체를 다시 그렸습니다. 로컬 처리에서는 시트 분할, 투명 배경 정리, 동일 비율 축소, 위치 정렬, 팔레트 통합과 패킹만 수행했습니다.

## 게임용 파일

| 파일 | 내용 |
| --- | --- |
| `Assets/Characters/swordsman/atlas.png` | 1024×448 RGBA 아틀라스, 공통 24색 |
| `Assets/Characters/swordsman/atlas.json` | 프레임 좌표·재생 시간·피벗·원본 프레임 번호 |
| `Assets/Characters/swordsman/frames/` | 대기 1장, 걷기 14장, 공격 14장 PNG |
| `Art/AnimationWork/walk-preview.gif` | 걷기 도트 미리보기, 980ms |
| `Art/AnimationWork/attack-preview.gif` | 공격 도트 미리보기, 770ms |
| `Art/AnimationWork/preview.html` | 실제 아틀라스 기반 재생·일시정지·프레임 확인 화면 |

각 게임 프레임은 128×112이며 피벗은 `(64,100)`입니다. 기본 방향은 오른쪽입니다. 걷기는 프레임당 70ms로 반복하고 공격은 55ms씩 한 번 재생합니다. 공격 판정 시점은 0.28초이며 원본 05번 포즈 구간에 들어갑니다. GIF의 시간 단위가 10ms이므로 공격 GIF는 60/50ms를 번갈아 사용해 총 770ms를 유지합니다. 게임은 정확한 55ms 값을 사용합니다.

## 원본과 정렬

- 각 동작의 00번은 기준 이미지를 640×560 캔버스로 평행 이동한 것입니다. 13번은 00번과 바이트 단위로 같습니다.
- 핵심 포즈는 02·05·08·11번, 사이 포즈는 01·03·04·06·07·09·10·12번입니다.
- 생성 시트는 모두 1536×1024의 2×2 배치입니다. `sources.json`에 각 셀의 프레임 번호와 시트별 정렬값을 기록했습니다.
- 모든 생성 시트에 같은 0.8배 비율을 적용합니다. 걷기의 약 433px 신장이 원본의 346px 신장에 맞습니다. 공격 중 낮아지는 자세는 그대로 유지합니다.
- 걷기 사이 포즈 시트 A/B의 전체 배치가 각각 약 19/24px 왼쪽에 있어 시트 전체에 같은 수평 보정을 적용했습니다. 공격은 모든 시트의 수평 기준을 동일하게 유지합니다.
- 발바닥을 고해상도 y=500으로 맞추는 수직 이동만 프레임별로 적용했습니다. 포즈마다 크기나 가로 위치를 자동 맞춤하지 않았습니다.
- 알파 32 미만의 흐린 배경을 제거했습니다. 본체와 검이 시트의 셀 경계에 닿지 않는지 확인했습니다.
- Codixel로 전체 프레임에 공통 24색을 정한 뒤 동일하게 5분의 1로 축소했습니다. 최종 알파는 0 또는 255입니다.

`normalized/normalization-report.json`에는 각 셀의 원본 SHA-256, 사각형, 실제 바운딩 박스, 비율, 기준점, 이동량이 있습니다. `normalized/<동작>/fullframe/`과 `keyframe/`은 고해상도 검수용이며, 각 폴더의 `contact-sheet.png`에서 손과 무기 연결을 확인할 수 있습니다.

## 생성 출처

| 승인된 원본 시트 | image_gen 결과 파일 |
| --- | --- |
| `Sources/draft-walk-keyposes.png` | `exec-9fa4c6d4-87f7-42ca-ab29-a2d6dded6705.png` |
| `Sources/walk-inbetweens-a.png` | `exec-b701ebcd-3941-4d47-a1cf-cd865912bb4d.png` |
| `Sources/walk-inbetweens-b.png` | `exec-33eaa396-9a90-4e74-b6b9-0f4bbbf47a3e.png` |
| `Sources/attack-keyposes.png` | `exec-d479ad85-1dd6-43bf-8dfe-253755e7e9c1.png` |
| `Sources/attack-inbetweens-a.png` | `exec-a81c5245-f86e-4ebd-aef0-343898e09c2b.png` |
| `Sources/attack-inbetweens-b.png` | `exec-4f9c6fa3-2733-4b35-bc50-5bcf5601ef81.png` |

초기 `Sources/draft-attack-keyposes.png`는 검을 잡은 팔이 바뀌어서 제외한 검수 기록입니다. 최종 아틀라스에서는 사용하지 않습니다. `sources-keyposes.json`과 `normalized-keyposes/`는 사이 포즈가 생성되기 전에 게임 연결을 확인한 중간 산출물입니다. 최종 빌드는 `sources.json`을 사용합니다.

## 다시 만들기

작업 폴더에서 다음 명령을 실행합니다. Python 가상 환경의 Pillow와 설치된 Codixel 스킬의 `core/pixel.js`를 사용합니다.

```powershell
Tools/.venv/Scripts/python.exe Tools/build-animation-assets.py Art/AnimationWork/sources.json
```

고해상도 프레임은 설치된 `2dimg2motion/scripts/validate_14frame_pattern.py`로 걷기·공격 모두 검증했습니다. 14장 구조, 원본 보존, 키 포즈 일치, 투명 모서리, 고정 발 기준선, 흰색 14프레임 GIF 검사가 통과했습니다. 게임용 프레임도 개수, 크기, 경계, 기준선, 00/13 동일성 및 GIF 총 재생 시간을 검사했습니다. 결과는 `validation-report.json`에 있습니다. 실제 움직임과 게임 화면에서의 가독성은 `preview.html`과 프로토타입에서 확인할 수 있습니다.
