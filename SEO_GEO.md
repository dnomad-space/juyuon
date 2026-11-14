# 주유ON 검색 노출·측정 운영 메모

## 대상과 공개 주소

이 저장소는 주유 타이밍과 유가를 제공하는 주유ON의 공개 웹이다. 개별 주유소 검색 서비스가 아니므로 `GasStation` 스키마나 존재하지 않는 주유소 상세 페이지를 만들지 않는다.

기존 서비스와 Google Play의 웹사이트 링크가 사용하는 공개 주소는 `https://dnomad-space.github.io/juyuon/`이다. 2026-11-14 수정 전 홈에서 HTTP 200을 확인했다. 별도 도메인을 연결할 경우 canonical, Open Graph URL, 구조화 데이터, sitemap, 404 페이지의 경로를 함께 변경해야 한다.

## 이번 구현

- `guide/`: 데이터 출처, 발행·원천 시각의 차이, 전국 보통 휘발유 예측의 범위, 금액 차이 계산, 검증 방법을 초기 HTML 본문으로 제공한다. JSON-LD의 FAQ와 실제 표시 문구가 일치한다. 전국 평균과 지역별 저가 주유소 수집 표본을 구별한다.
- `download/`: 실제 App Store·Google Play 링크를 표시한다. 사용자 동작 없는 자동 이동을 제거했다. 스토어 링크 클릭은 설치 완료가 아니다.
- `privacy/`: 원문 정책은 보존하고 검색 메타데이터와 사이트 공통 분석 스크립트만 연결한다.
- `sitemap.xml`: 실제 생성한 canonical 페이지 네 개만 포함한다. 필터나 유종·지역 쿼리 조합은 추가하지 않는다. 생성되지 않은 지역 페이지, 404 페이지, 데이터 JSON은 넣지 않는다.
- `404.html`: GitHub Pages의 사용자 정의 오류 문서다. `noindex,follow`이며 임의 URL에 대한 서버의 실제 404 응답을 배포 후 확인한다.
- `support.css`: 안내·다운로드·404 페이지용 공통 스타일. 홈 스타일과 독립적이다.

## robots.txt의 프로젝트 경로 제약

검색 로봇은 **호스트 루트**인 `https://dnomad-space.github.io/robots.txt`를 읽는다. 이 프로젝트의 `https://dnomad-space.github.io/juyuon/robots.txt`는 호스트의 크롤링 허용·차단을 설정하지 않는다. 저장소의 파일에는 이 제약을 주석으로 명시했고 참고 규칙만 제공했다.

이 저장소를 고치는 것만으로 호스트 루트 robots가 설정됐다고 보고하지 않는다. 호스트 루트를 관리하는 저장소에 접근할 수 있으면 기존 전체 정책을 보존하면서 sitemap 위치를 추가할 수 있다. 그렇지 않으면 확인된 Search Console / 네이버 서치어드바이저 속성에서 sitemap URL을 직접 제출한다. 검증 토큰이나 소유권 확인을 임의로 생성하지 않는다.

`OAI-SearchBot`은 ChatGPT 검색용, `GPTBot`은 모델 훈련용이다. 검색 노출을 위해 훈련 허용 정책까지 바꿀 필요가 없다. 현재 호스트 전체의 크롤러 정책을 이 프로젝트 파일로 변경했다고 주장하지 않는다.

## 구조화 데이터·GEO의 의미

`Article`, `BreadcrumbList`, 실제 모바일 앱의 `SoftwareApplication`, 표시 내용과 일치하는 `FAQPage`를 사용한다. 없는 평점, 다운로드 수, 가격, 적중률, 개별 주유소, 영업시간을 만들지 않는다. FAQ 마크업은 일반 유틸리티 사이트에 Google FAQ 리치결과를 보장하지 않는다.

GEO는 검색 로봇이 접근 가능한 본문과 출처·시각·계산 방법을 명확히 하는 방향으로 구현한다. `llms.txt`나 별도 AI 파일은 Google AI 검색의 필수 요건이 아니며, 검색·AI 답변 노출을 보장할 수 없다.

## Google Analytics

기존 웹의 측정 ID는 `G-DS93VNJFRN`이다. 이전 다운로드 페이지는 로더의 ID가 `G-9WDXDZ6TBZ`, config의 ID가 `G-DS93VNJFRN`으로 달랐다. 이제 각 페이지는 `js/analytics.js` 하나를 참조하며 이 공통 파일에서 `G-DS93VNJFRN`을 설정한다.

스토어 링크에는 `data-analytics-event="store_link_click"`, `data-platform="iOS|Android"`, `data-source="download"`가 있다. 공통 추적기가 이를 처리한다. `store_link_click`은 스토어를 열려는 클릭이지 다운로드·설치 완료가 아니다. 자동 이동을 이벤트로 기록하지 않는다.

GA 속성 접근·리포트 조회·사용자 정의 측정기준 등록과 사이트 코드 수정은 별개다. 실제 권한과 결과를 확인하지 않고 GA 데이터 점검이나 등록을 마쳤다고 보고하지 않는다. 사용자 좌표·주소·개인정보가 URL이나 이벤트에 담기지 않게 한다.

## 배포 후 확인

1. 홈·guide·download·privacy와 각 CSS·JS·아이콘이 실제 공개 URL에서 HTTP 200인지 확인한다.
2. 없는 경로가 404이며 본문에 홈으로 돌아갈 링크가 있는지 확인한다.
3. 각 정상 페이지의 title, description, canonical이 서로 다르고 canonical URL과 sitemap이 일치하는지 확인한다.
4. JavaScript 없이도 안내·출처·가격 정보의 의미가 읽히는지 확인한다. 가격 스냅샷의 발행 시각을 표시하고, 48시간이 지난 경우 예상 금액 비교가 중단되는지 확인한다. 원천별 관측 시각 미제공을 실시간 가격으로 과장하지 않는다.
5. 모바일에서 가로 넘침, 버튼 가림, 문구·스키마 불일치가 없는지 확인한다.
6. 공통 분석 스크립트의 로드 ID와 config ID가 같고 이벤트가 클릭당 한 번 발생하는지 확인한다.
7. 실제 연결된 Search Console / 서치어드바이저 권한이 있으면 sitemap 제출과 URL 검사를 수행한다. 이 저장소에는 가짜 검증 토큰을 넣지 않는다.

## 공식 참고 문서

- Google AI 검색: https://developers.google.com/search/docs/appearance/ai-features
- Google JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google FAQ 구조화 데이터: https://developers.google.com/search/docs/appearance/structured-data/faqpage
- 네이버 robots: https://searchadvisor.naver.com/guide/seo-basic-robots
- 네이버 canonical·robots meta: https://searchadvisor.naver.com/guide/markup-structure
- OpenAI 크롤러: https://developers.openai.com/api/docs/bots
- GA4 SPA 측정: https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications

이 문서는 구현·운영 담당자용이다. 고객에게 검색 엔진이나 분석 도구의 내부 설정을 서비스 기능으로 제시하지 않는다.
