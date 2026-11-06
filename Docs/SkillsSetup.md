# 게임 리소스 도구 및 스킬 설치 기록

확인일: 2026-11-06 (Asia/Seoul)

## 출처와 범위

- [오늘코딩 1편](https://www.youtube.com/watch?v=_U5wuMhZXI0): 2dimg2motion, sprite-gen, PixelFX, PixelOE.
- [오늘코딩 2편](https://www.youtube.com/watch?v=ZN019l8wGBg): Agent Sprite Forge, Codixel, Pixelbolt, Sprite Sheet Diffusion.

영상의 8개 항목은 **8개 프로젝트**다. 설치형 에이전트 스킬, 코드 라이브러리, 연구 모델을 함께 소개한다. Agent Sprite Forge는 상호 참조하는 스킬 5개로 구성된다. PixelOE와 Sprite Sheet Diffusion에는 이 작업에서 확인한 독립 `SKILL.md`가 없어 일반 도구로 보관한다.

## 영상의 8개 프로젝트

| 프로젝트·공식 저장소 | 분류 | 이 게임에서의 용도 | 주요 실행 조건 | 현재 상태 |
| --- | --- | --- | --- | --- |
| [2dimg2motion](https://github.com/WU-HAOTIAN34/2dimg2motion) | Codex/Claude 에이전트 스킬 | 단순화한 캐릭터 원본으로 핵심 포즈·중간 프레임을 만들고 동작 시트로 정리 | 이미지 생성 도구, Python, Pillow. 기본 계약은 14프레임이며 실제 동작 품질은 시각 검수 필요 | 스킬과 참조·처리 스크립트 설치 및 구성 검사 완료 |
| [sprite-gen](https://github.com/aldegad/sprite-gen) | 에이전트 스킬 + Python CLI | 배경 정리, 프레임 추출, 아틀라스와 엔진용 메타데이터 생성 | 설치본 3.15.0: Python ≥3.11, Pillow ≥12.3.0 및 <13, NumPy ≥2.2.6 및 <3. 영상 기능은 ffmpeg 등 추가 실행 도구 사용 | 스킬 설치 완료. 프로젝트 별도 가상환경에서 CLI 도움말 실행 확인. 외부 생성 API 호출 없음 |
| [PixelFX](https://github.com/patch-gg/pixelfx) | 스킬 + 픽셀 이펙트 라이브러리 | 베기, 피격, 보상 획득 등 횡스크롤 전투 피드백 | Node ≥18. PNG 시트는 Node로 내보내며 GIF·MP4에는 선택적으로 ffmpeg 사용 | 스킬·저장소 확보. 검격·동전 획득·뿌리 속박 효과 3종 내보내기와 도구 검사 통과 |
| [PixelOE](https://github.com/KohakuBlueleaf/PixelOE) | 픽셀화 라이브러리 | 생성 이미지의 윤곽·색상을 픽셀 표현으로 후처리 | 설치 소스 1.0.1: Python ≥3.10, OpenCV, NumPy, Pillow, Torch, Torchvision, Kornia. 플랫폼에 따라 Slang 경로도 사용 | 소스만 확보. 실행 의존성 미설치, 픽셀화 미실행 |
| [Agent Sprite Forge](https://github.com/0x0funky/agent-sprite-forge) | 스킬 5개 묶음 + 처리 도구 | 캐릭터 기준 이미지, 동작 패키징, 횡스크롤 배경·맵과 시차 레이어 | Python ≥3.10, NumPy, Pillow, SciPy(가속용). 영상 처리에는 ffmpeg ≥5.1, 새 영상 생성에는 지원 제공자나 영상 생성 도구 필요 | 5개 스킬 설치 및 상호 참조 검사 완료. 이미지·영상 서비스 설정과 실제 생성은 별도 |
| [Codixel](https://github.com/mankidev/codixel) | 스킬 + Node 픽셀 처리 코드 | 참조 이미지의 픽셀화, 분리된 부위 리깅, 프레임·효과 표현 | Node와 `core/pixel.js`. 본체 PNG 입출력은 Node 내장 `fs`·`zlib` 사용 | 스킬과 핵심 코드 설치 및 파일 검사 완료 |
| [Pixelbolt](https://github.com/skulitom/Pixelbolt) | 스킬 + CLI/MCP 픽셀 제작 도구 | 정확한 픽셀 크기의 아이콘·타일·효과·프레임 제작과 검증 | Node ≥20. CLI 본체에 외부 패키지 의존성 없음. 확보한 저장소의 package 버전은 0.12.1 | 기존 스킬 재사용, 프로젝트에 도구 소스 확보. 동봉 동전 예제의 CLI validate·render 통과 |
| [Sprite Sheet Diffusion](https://github.com/chenganhsieh/Sprite-Sheet-Diffusion) | 로컬 연구 모델 | 캐릭터와 자세 순서를 통한 동작 생성 연구 참고 | Python 3.10 별도 환경, CUDA, 모델 가중치. `ModelTraining/requirements.txt`에 Torch 2.0.1 등 구버전 고정 | **연구용 소스 보관. 상용 게임 제작 경로에서 제외.** 추론 실행·전체 의존성 설치·추가 가중치 다운로드는 하지 않음 |

상태의 의미: **스킬 설치**는 지침과 지원 파일이 준비되었다는 뜻이다. **CLI 실행 확인**은 도구가 시작됨을 확인한 것으로, 캐릭터 애니메이션의 품질 검증과는 별개다. 효과 산출물, 명령, commit과 검증 범위는 [로컬 실행 보고서](tool-runtime-report.md)에 기록했다. PixelFX 동전 효과의 숫자는 현재 데모 값이며 실제 골드 수치에 연결하기 전 조정이 필요하다.

## 추가로 선정한 스킬 2개

두 스킬 모두 [abagames/agentic-gamedev-skills](https://github.com/abagames/agentic-gamedev-skills)에서 가져왔다. 엔진에 종속되지 않은 지침이며 스킬과 참조 문서를 설치했다.

| 추가 스킬 | 제공하는 기능 | 이 게임에 적용하는 이유 | 사용 시점 |
| --- | --- | --- | --- |
| [directing-game-visuals](https://github.com/abagames/agentic-gamedev-skills/tree/main/.agents/skills/directing-game-visuals) | 색의 역할, 실루엣, 화면 구성과 이벤트 피드백 정의 | 사용자가 요청한 캐릭터 단순화를 명확한 디자인 기준으로 만들고, 도트와 일러스트의 외형을 맞춘다 | 캐릭터 기준 이미지와 첫 전투 화면 제작부터 |
| [evaluating-gameplay-balance](https://github.com/abagames/agentic-gamedev-skills/tree/main/.agents/skills/evaluating-gameplay-balance) | 플레이 로그와 전략 비교를 통한 밸런스 검증 | 전투·노동·훈련 배치 중 한 가지가 항상 유리해지는지, 골드가 없을 때 재시작할 수 있는지 실제 플레이 데이터로 확인한다 | 작동하는 원정·생산·훈련 루프와 로그가 생긴 뒤 |

선정 근거는 현재 게임의 두 과제인 **읽기 쉬운 단순한 외형**과 **의미 있는 경영 선택**이다. 범용 인기 순위나 이미지 생성 품질의 우열을 입증한 비교는 아니다. 밸런스 스킬 설치만으로 게임 밸런스 검증을 완료했다고 간주하지 않는다.

## 설치 위치

스킬 루트: `C:\Users\imtl\.codex\skills`

이번에 설치한 스킬 11개:

- `2dimg2motion`
- `sprite-gen`
- `pixelfx`
- `codixel`
- `generate2dsprite`
- `video2dsprite`
- `generate2dmap`
- `generate2dmedia`
- `codeart2d`
- `directing-game-visuals`
- `evaluating-gameplay-balance`

기존 스킬: `pixelbolt-pixel-art`.

프로젝트의 일반 도구 소스: `C:\Users\imtl\ilyoon_Git\SlaveGame\Tools\vendor` 아래 `pixelfx`, `Pixelbolt`, `PixelOE`, `Sprite-Sheet-Diffusion`.

프로젝트 Python 가상환경: `C:\Users\imtl\ilyoon_Git\SlaveGame\Tools\.venv`. 현재 sprite-gen 3.15.0, Pillow 12.3.0, NumPy 2.5.4, 검증용 PyYAML 6.0.3을 설치했다. 번들 Python의 패키지는 변경하지 않았다.

새 스킬은 다음 사용자 턴부터 스킬 목록에 반영될 수 있다. 이 턴에서의 검증은 설치 파일을 직접 읽어 수행했다.

## 설치 구성 검증 결과

- 11개 모두 `SKILL.md` 존재.
- 프로젝트 가상환경의 PyYAML 6.0.3으로 frontmatter 파싱 성공. `name`이 설치 디렉터리명과 일치하고 `description`은 비어 있지 않은 문자열.
- 각 주 스킬 문서의 상대 Markdown 링크 95개가 모두 실제 파일 또는 디렉터리로 연결됨.
- sprite-gen이 frontmatter에서 필수로 선언한 스크립트 23개가 모두 포함됨.
- 본문에 구체적으로 언급된 참조·스크립트 경로는 ASF의 형제 스킬 폴더, PixelFX의 프로젝트 체크아웃을 포함해 확인했으며 미해결 경로 없음.
- ASF description 줄바꿈은 실제 설치본에서 정상이다. 웹 텍스트 추출 결과만 보고 의심했던 YAML 문제는 로컬 검사에서 재현되지 않았다.
- PixelFX 스킬 폴더 자체는 지침 파일만 제공하며 `Tools/vendor/pixelfx`에서 실행하도록 설계되어 있다. 이 두 부분을 함께 사용한다.

이 검사는 설치 구조와 문서 참조에 대한 읽기전용 검사다. 전체 코드 감사나 모든 기능의 실행 테스트는 아니다.

## 라이선스와 사용 범위

저장소 코드의 라이선스와 외부 생성 서비스·참조 이미지·동봉 에셋의 조건은 별도로 확인한다. 아래 표는 확인한 원문을 기록한 것이며 모든 결과물의 상업적 이용을 일괄 보장하지 않는다.

| 프로젝트 | 확인한 조건과 근거 |
| --- | --- |
| 2dimg2motion | [LICENSE](https://github.com/WU-HAOTIAN34/2dimg2motion/blob/main/LICENSE): MIT |
| sprite-gen | [LICENSE](https://github.com/aldegad/sprite-gen/blob/main/LICENSE): Apache-2.0 |
| PixelFX | [LICENSE](https://github.com/patch-gg/pixelfx/blob/main/LICENSE): MIT. [NOTICE.md](https://github.com/patch-gg/pixelfx/blob/main/NOTICE.md)는 `gallery/fonts`의 Patch Pixel 폰트가 이 MIT 범위에 포함되지 않는다고 명시. 갤러리 폰트를 게임에 포함하지 않는다 |
| PixelOE | [LICENSE](https://github.com/KohakuBlueleaf/PixelOE/blob/main/LICENSE) 및 `pyproject.toml`: Apache-2.0 |
| Agent Sprite Forge | [LICENSE](https://github.com/0x0funky/agent-sprite-forge/blob/main/LICENSE): MIT. 생성 제공자의 이용 조건과 사용량은 별도 |
| Codixel | [LICENSE](https://github.com/mankidev/codixel/blob/main/LICENSE): MIT. 참조 이미지의 사용권은 별도 |
| Pixelbolt | [LICENSE](https://github.com/skulitom/Pixelbolt/blob/main/LICENSE): MIT |
| Sprite Sheet Diffusion | README는 MIT라고 적었지만, 포함된 [ModelTraining/openpose/LICENSE](https://github.com/chenganhsieh/Sprite-Sheet-Diffusion/blob/main/ModelTraining/openpose/LICENSE)와 [Dataprocessing/openpose/LICENSE](https://github.com/chenganhsieh/Sprite-Sheet-Diffusion/blob/main/Dataprocessing/openpose/LICENSE)에 비상업 연구용 제한이 있다. 전체 저장소를 일괄 MIT 도구로 취급하지 않는다. 현재 상용 제작 경로에서 제외 |
| 추가 스킬 2개 | 원 저장소 [LICENSE](https://github.com/abagames/agentic-gamedev-skills/blob/main/LICENSE): MIT |

## 이번 게임의 적용 순서

1. `directing-game-visuals`로 횡스크롤 화면과 단순한 캐릭터의 외형 규칙을 정한다.
2. 기존 시안의 머리·주요 복색·무기는 유지하면서 장식과 겹친 갑옷을 줄인 기준 캐릭터를 만든다.
3. `2dimg2motion`으로 한 캐릭터의 짧은 동작을 시험하고 `sprite-gen`으로 정리·검수한다. ASF의 영상 방식은 실제 영상 생성 수단이 준비될 때 별도로 비교한다.
4. PixelFX로 필요한 타격 효과를 내보내고 Pixelbolt로 작은 보조 리소스를 만든다. PixelOE는 후처리가 실제 품질을 개선하는 경우에 적용한다.
5. 같은 외형의 일러스트 초상화를 상세창에 사용하고, 도트 캐릭터는 횡스크롤 전투와 거점에 배치한다.
6. 플레이 가능한 원정 경영 루프가 생기면 `evaluating-gameplay-balance`로 노동 수입·훈련 비용·원정 보상의 관계를 확인한다.

한 캐릭터와 한 동작의 실제 결과를 먼저 확인하고, 쓸 수 있는 제작 경로를 정한 뒤 직업과 동작 수를 늘린다.
