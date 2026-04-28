# KBO 토토 확률 계산기

한국프로야구(KBO) 실시간 매치업 예측 + 배당률·확률·기대값(EV)·켈리 비율 계산기.

## 기능
- **오늘의 KBO 매치업 + 승률 예측** — Elo 기반, 홈 어드밴티지 반영, 공정 배당 표시
- **시즌 순위표** — 승/패/승률/Elo
- **배당률 → 내재 확률 변환** (2-way / 3-way), 마진(vig) 자동 제거
- **EV · 분수 Kelly** 계산
- **Elo 직접 편집** (localStorage 저장, 시즌 데이터로 복원 가능)

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
