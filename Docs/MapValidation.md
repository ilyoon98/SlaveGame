# 이끼송곳니 거점 배경 · generate2dmap 적용 기록

2026-11-06 (Asia/Seoul). 기존에 생성한 배경에 `generate2dmap` 스킬의 장면 계약, 크롭, 캐릭터 접지·합성 검증을 적용했다. 배경을 다시 생성하거나 외부 API를 호출하지 않았다.

## 적용 범위와 출처

- 배경: [goblin-camp.png](../Assets/Environments/goblin-camp.png), 실제 **1774×887px**, RGB 불투명.
- `art_source: host_image`, 경로 `host_image`, 생성 도구 `image_gen`. 호스트가 모델 ID와 비용을 반환하지 않아 두 값은 `null`로 기록했다.
- SHA-256: `06ea76b57137327257a3f6b8e7aa82591f7488ed8742edb83dd7cd80f75e645e`.
- [원본 프롬프트](../Art/Source/goblin-camp.prompt.md)를 보존했다. 최초 그림 생성은 `directing-game-visuals`와 내장 이미지 도구로 했으며, **generate2dmap은 생성 이후 현재 검증 단계에 실제 적용했다.** 미리 레이아웃 가이드를 붙여 생성했다고 주장하지 않는다.
- 이 장면은 `baked_scene_mode`: 시설 핫스팟을 가진 완성 배경 한 장과 별도 캐릭터다. 플레이 가능한 플랫폼 맵, 충돌, 길찾기, 점프, 출구 연결, 시차 레이어를 구현하거나 검증한 것은 아니다.

계약 파일: [camp-stage.json](../Assets/Environments/camp-stage.json). 원본 좌표, 표시 변환, 시설 위치, 발 기준점, 렌더 순서를 명시했다. `hero`·`enemy` 슬롯 키는 도구를 실행하기 위한 다섯 시설의 위치 샘플이며 실제 게임의 팀 구분이 아니다.

## 실제 실행한 스킬 도구

Python은 프로젝트의 `Tools/.venv/Scripts/python.exe`를 명시했다. 최초 capability check에서 CP949 출력 오류를 발견하여 이후 명령은 `-X utf8`로 실행했다. 자격 증명 값은 읽거나 출력하지 않았고 `forge_doctor`의 설정 여부만 확인했다.

| 도구 | 입력·목적 | 출력·결과 |
| --- | --- | --- |
| `forge_doctor.py --host-tools image_gen --no-exec` | 현재 호스트 생성 경로 확인 | 최초 `FAIL`, UTF-8 재실행 `WARN`; 아래 원문 기록 |
| `conform_background.py conform --mode ground-fit` | 실제 원본에서 균일 배율로 1536×512 크롭 | [conform.json](../Art/MapValidation/desktop-crop/conform.json), `pass` |
| `validate_stage.py` | 원본 크기, 시설별 발 위치·표시 영역·배치 검사 | [stage-qa.json](../Art/MapValidation/stage-source-qa-v2/stage-qa.json), **`needs-visual-review`**, 실패·경고 없음 |
| `conform_background.py validate-crops` | 3:1 표시 영역에서 다섯 시설 보존 | [crops-qa.json](../Art/MapValidation/crops-qa/crops-qa.json), `pass`, 잘린 대상 없음 |
| `compose_layered_preview.py` | 기존 실제 캐릭터 5개를 게임 배율·피벗으로 합성 | [composition-qa-v2.json](../Art/MapValidation/composition-qa-v2.json), `pass`; [합성 보고서](../Art/MapValidation/composition-report-v2.json) 경고 없음 |

배경 원본은 수정하지 않았다. 크롭과 합성 결과는 모두 `Art/MapValidation/`의 검토용 산출물이다.

## 표시·접지 계약

- 논리 화면: **1536×512**, 3:1. 원점은 좌상단, 아래로 +y.
- 원본 크롭: `[left=0, top=248.36, right=1774, bottom=839.693333]`. UV로는 y **0.28 → 0.9466667**이다.
- 균일 배율: **0.8658399098**. x·y를 서로 다르게 늘리지 않는다. 원본 상단 248.36px, 하단 47.306667px만 제외한다.
- 길 위 발: 원본 y=745.08px(0.84H) → 논리 y=430.08px.
- 공연 발: 원본 `[u=0.69,v=0.695]` → 논리 `[1059.84,318.72]`. 실제 무대 판자 위에서 북·악기와의 겹침을 줄인 자리다.
- 시설 버튼 중심 u: 숙소 .12, 교육 .32, 경기 .51, 공연 .71, 거래 .89. 공연장 버튼 중심과 실제 출연자의 발 위치는 구분한다.
- 대표 캐릭터는 기존 **128×112**, 피벗 **(64,100)**, 배율 **1.2**를 사용했다. 실제 보이는 몸 높이는 대략 84px다. 프레임과 팔·검을 새로 그리지 않았다.
- 원본 stage 검사 발 타원: **31.932×9.5796px**. 5개 발과 주변 샘플 모두 지정한 시각적 바닥 영역에 들어갔다.
- 실제 합성의 발 기준점 반올림 오차는 축별 0.48px 이하였다. 합성 검사는 발 중심을 검사하고, 주변 발 타원 검사는 위 stage 도구 결과를 따른다.

경기장 인원은 현재 울타리 앞 흙길에 둔다. 배경에 합쳐진 앞쪽 밧줄을 별도 전경으로 분리하지 않은 상태에서 인원을 경기장 안으로 옮기면 밧줄 위에 인물이 덧그려진다. 경기장 내부 배치는 전경 가림 처리를 추가한 뒤 검토한다.

## 그림을 열어 확인한 결과

[대표 캐릭터 합성](../Art/MapValidation/actors-preview-v2.png), [접지 디버그 그림](../Art/MapValidation/actors-debug-v2.png), [원본 stage overlay](../Art/MapValidation/stage-source-qa-v2/stage-overlay.png), [3:1 배치](../Art/MapValidation/stage-source-qa-v2/layout-3x1.png), [크롭 보존 그림](../Art/MapValidation/crops-qa/crops-overlay.png)을 실제로 열어 확인했다.

- 숙소·교육 마당·경기장·공연장·거래소가 모두 남고 시설의 주요 실루엣을 읽을 수 있다.
- 네 명은 빈 흙길 위에, 공연 인원은 판자 위에 접지한다. 다섯 대표 인원의 몸과 검이 화면 경계에서 잘리지 않는다.
- 시설별 인원이 서로 겹치거나 배경 전체에 가려지지 않는다. 인원이 14명으로 늘었을 때의 동적 배치·겹침은 이 5명 정적 샘플로 증명하지 않는다.
- 초기 전원 흙길 버전의 stage 검사와 그림도 보존했다. 최종 계약은 공연장 발을 올린 `stage-source-qa-v2`다.
- stage 도구의 최종 상태는 규칙상 **`needs-visual-review`**로 유지한다. 그림을 살펴봤다는 기록이 자동 도구의 상태를 `pass`로 바꾸지는 않는다.

## WARN·FAIL 원문과 처리

스킬 요구에 따라 공개된 검사 결과의 모든 WARN·FAIL과 도구 경고를 원문 그대로 기록한다. Doctor의 `detail`이 값 역할을 하며 별도 `value`, `threshold`, `files` 필드는 없다. 아래 `파일`은 해당 결과를 보존한 실제 파일이다. 없는 임계값을 임의로 만들지 않았다.

### 최초 capability check

파일: [doctor.json](../Art/MapValidation/doctor.json). 전체 상태 `FAIL`. 이 파일을 덮어쓰지 않았다.

```json
{"id":"python.path","status":"WARN","detail":"other python.exe on PATH: ~/AppData/Local/Microsoft/WindowsApps/python.exe","remedy":"PowerShell, cmd and Git Bash may resolve different interpreters; run Forge with the one shown in python.version"}
{"id":"deps.scipy","status":"WARN","detail":"not installed; needed for faster labelling and keying (forge_core falls back to numpy)","remedy":"\"C:\\Users\\imtl\\ilyoon_Git\\SlaveGame\\Tools\\.venv\\Scripts\\python.exe\" -m pip install \"scipy>=1.11\""}
{"id":"encoding.stdout","status":"FAIL","detail":"stdout=cp949 cannot print U+2014: Python scripts that print them (your own helpers, older tools) crash with UnicodeEncodeError after doing their work","remedy":"set PYTHONUTF8=1 before running Python (PowerShell: $env:PYTHONUTF8=1; bash: export PYTHONUTF8=1)"}
{"id":"encoding.files","status":"WARN","detail":"open() and read_text() without encoding= use cp949","remedy":"pass encoding='utf-8' in your own scripts, or set PYTHONUTF8=1"}
```

### UTF-8 재실행

파일: [doctor-utf8.json](../Art/MapValidation/doctor-utf8.json). 전체 상태 `WARN`, FAIL 0개. 출력 인코딩 오류는 `-X utf8`로 해결했다. 아래 두 WARN은 남아 있다.

```json
{"id":"python.path","status":"WARN","detail":"other python.exe on PATH: ~/AppData/Local/Microsoft/WindowsApps/python.exe","remedy":"PowerShell, cmd and Git Bash may resolve different interpreters; run Forge with the one shown in python.version"}
{"id":"deps.scipy","status":"WARN","detail":"not installed; needed for faster labelling and keying (forge_core falls back to numpy)","remedy":"\"C:\\Users\\imtl\\ilyoon_Git\\SlaveGame\\Tools\\.venv\\Scripts\\python.exe\" -m pip install \"scipy>=1.11\""}
```

다른 Python 경로 문제는 모든 명령에 프로젝트 Python을 명시하여 피했다. scipy는 설치하지 않았고 제공된 numpy 대체 경로로 검사를 실행했다. Doctor의 `MISSING` 항목은 resvg-py, ffmpeg, 외부 생성 API 5종의 키, Grok CLI다. 정적 기존 이미지 검증에는 필요하지 않으며, 동영상·SVG·외부 API 실행이 가능하다고 주장하지 않는다. 호스트 `image_gen`은 `host_image ready`로 확인됐다.

### 첫 합성 명세 경고

파일: [composition-report.json](../Art/MapValidation/composition-report.json). `warnings` 배열의 원문이며 별도 check ID·value·threshold·files는 없다.

```text
placements schema 'placements_v2' is not one of generate2dmap.placements.v2; read as v2.
```

명세 ID를 `generate2dmap.placements.v2`로 고쳐 새 산출물 `composition-report-v2.json`에 재실행했다. 최종 `warnings`는 빈 배열이다. 최초 산출물은 이력으로 남겼다.

합성 도구의 첫 실행은 임시 폴더 접근 오류로 QA를 발행하기 전에 종료했다. 프로젝트 안 `Art/MapValidation/tmp`를 해당 실행의 `TMPDIR`로 지정하여 해결했다. 샌드박스나 시스템 보안 설정을 바꾸지 않았다.

## 제한

- 자동 데이터 검사와 그림 검토를 구분한다. 검증 도구는 판자가 실제 바닥인지, 실루엣이 아름다운지 판단하지 않는다.
- 현재 지원 계약은 3:1 거점 파노라마다. 세로 휴대폰 화면에 cover로 맞추면 양끝 시설이 사라지므로 동일 비율 장면을 가로 스크롤하거나 비례 축소해야 한다.
- 실제 모바일 UI·터치·안전 영역·성능은 이 정적 자산 검사로 검증하지 않았다. 브라우저와 기기 검수는 별도로 진행한다.
- 원본 한 장을 사용하므로 반복 경계의 무봉제성, 독립 시차 레이어, 배경 움직임, 조명 추출, 플랫폼 도달 가능성은 검사하지 않았다.
