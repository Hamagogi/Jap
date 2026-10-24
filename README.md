# KBO 토토 확률 계산기

한국프로야구(KBO) 실시간 매치업 예측 + 배당률·확률·기대값(EV)·켈리 비율 계산기.

## 기능
- **🎰 다중 베팅(파레이) 계산기** — 다리 추가/편집, 조합 확률·배당·EV·켈리, "+EV 픽 자동 추가" 한 방 버튼
- **타선-선발 손잡이 매치업 (5번째 팩터)** — 팀별 vs 좌투/우투 OPS 스플릿 사용. 선발 손잡이가 알려져 있으면 모델에 자동 반영
- **베팅 기록 + 백테스트** — 베팅 입력 시 모델 P / EV / 예상 수익 자동 계산. 결과 입력하면 누적 ROI · 적중률 · Brier 점수 · 캘리브레이션 표 자동 생성. JSON 내보내기/가져오기 지원
- **🎯 추천 픽 분석기** — 날짜 선택 → 그날 매치업 EV 순위, 시장 마진 시뮬, 1클릭 베팅 추가
- **오늘의 KBO 매치업 + 전문 분석** — 5-팩터 모델로 승률 예측 + 분석 근거 분해 카드
  - 팩터: ① Elo + 홈 어드밴티지  ② 선발 매치업(FIP 차)  ③ 최근 10경기 폼  ④ 구장 보정 + 휴식일
- **팀 분석 패널** — 5선발 로테이션 (ERA/FIP/K9/BB9) + 최근 10경기 시각화
- **매치업 시뮬레이터** — 임의 팀·선발·휴식일을 골라 즉석 시뮬레이션. 모델 가중치는 실시간 조정 가능
- **시즌 순위표** — 승/패/승률/Elo/팀 OPS/팀 ERA/최근 10
- **배당률 → 내재 확률 변환** (2-way / 3-way), 마진(vig) 자동 제거
- **EV · 분수 Kelly** 계산

## 모델 (간단)
```
승률 = 1 / (1 + 10^(-ΔElo / 400))
ΔElo = (Elo_home − Elo_away)
       + 홈어드밴티지(24)
       + (FIP_away − FIP_home) × 12        # 선발이 좋을수록 +
       + (Wins_home − Wins_away in 10) × 3 # 폼
       + ParkFactor 효과
       + (Rest_home − Rest_away) × 5
```
모든 가중치는 `data/kbo-2026.json` 의 `model` 블록에서 조정 가능 (UI에서도 실시간 변경).

## 데이터 자동 갱신
- `.github/workflows/update-kbo.yml` 가 매일 KST 08:00에 실행
- `scripts/fetch-kbo.mjs` 가 mykbostats.com 의 표준화 표기를 스크래핑
- 결과를 `data/kbo-2026.json` 으로 커밋 → 정적 사이트가 fetch
- 스크래핑 실패 시 기존 데이터 유지 (안전 fallback)
- 수동 실행: Actions 탭 → "Update KBO data" → Run workflow

## 실행
빌드 없음.

```bash
# 로컬에서 (정적 서버 필수 - file:// 에선 fetch 가 막힘)
python3 -m http.server 8000
# → http://localhost:8000
```

## 배포 (GitHub Pages)
1. Repo → Settings → Pages → Source: `Deploy from a branch` → `main` / `(root)` → Save
2. ~1분 후 `https://hamagogi.github.io/Jap/` 에서 라이브

## 면책
계산 도구이며 베팅 결과를 보장하지 않습니다. 도박문제 24시간 상담: **1336**.
