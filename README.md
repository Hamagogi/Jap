# KBO 토토 확률 계산기

한국프로야구(KBO) 배당률·확률·기대값(EV)·켈리 비율 계산기 및 Elo 기반 승률 예측기.

## 기능
- **배당률 → 내재 확률 변환** (2-way / 3-way), 마진(vig) 자동 제거
- **EV · Kelly 비율** 계산 (분수 켈리 지원)
- **KBO 10개 구단 Elo 승률 예측** (홈 어드밴티지 반영, Elo 점수 직접 편집·로컬 저장)

## 실행
정적 파일이라 별도 빌드가 없습니다.

```bash
# 로컬에서 열기
open index.html         # macOS
xdg-open index.html     # Linux
# 혹은 간단한 정적 서버
python3 -m http.server 8000
```

## 배포 (GitHub Pages)
1. PR을 main에 머지
2. Repo → Settings → Pages → "Deploy from a branch" → `main` / `/ (root)` 선택
3. 약 1분 후 `https://hamagogi.github.io/Jap/` 에서 접속

## 면책
계산 도구이며 베팅 결과를 보장하지 않습니다. 도박문제 24시간 상담: **1336**.
