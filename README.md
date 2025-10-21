# 🧩 DRM Runner

**DRM Runner**는 NCP Multi-DRM API를 이용해 콘텐츠별 DRM 소스를 생성하고 토큰을 발급하는 **독립형 Node.js 유틸리티**입니다.  
NestJS 서비스 외부에서 실행되며, `execFile`로 호출되어 HLS/DASH용 DRM 라이선스 정보를 JSON으로 반환합니다.

---

## 🧭 프로젝트 생성 계기

기존 NestJS 서비스 내부에서 DRM 토큰을 생성하던 로직이 지나치게 복잡해지고,  
`vpe-drm-helper` 라이브러리의 버그(잘못된 URL 인코딩, drmType 무시 등)로 인해  
서비스 안정성이 떨어지는 문제가 발생했습니다.

특히 다음과 같은 문제가 계기가 되었습니다:

- **`drmSourceHelper()` 내부 버그**
    - DASH URL이 잘못 인코딩되어 Widevine/PlayReady 라이선스 요청 실패
    - DRM 타입 구분이 불가능해 항상 `WIDEVINE`으로 고정됨
- **NestJS와의 의존성 문제**
    - DRM 로직이 서비스 계층에 섞여 테스트 및 배포 분리가 어려움
- **Docker 환경에서 실행 위치 불일치**
    - 절대 경로(`/root/drm-runner/...`) 문제로 `MODULE_NOT_FOUND` 빈번 발생

이를 해결하기 위해 DRM 로직을 완전히 독립시켜,  
**Node 단일 모듈 형태의 “drm-runner” 프로젝트**로 분리하였습니다.

이렇게 함으로써 다음을 달성했습니다:

- Nest 서비스와 분리된 **독립 실행형 CLI 유틸리티**
- DRM 생성 로직 단일화 및 테스트 용이성 확보
- 환경별(`prod/dev/docker`) 경로 충돌 방지
- NCP DRM API 서명 및 토큰 로직 개선

결과적으로 `drm-runner`는 서비스 로직의 복잡도를 낮추고,  
DRM 관련 유지보수를 훨씬 단순화하기 위해 탄생한 프로젝트입니다.

---

## 📁 폴더 구조

```
drm-runner/
├── drm-worker.mjs          # Node 실행용 DRM worker (CLI entry)
├── my-drm-helper.js        # VPE DRM Helper (NCP API 서명/토큰 생성)
├── package.json
├── package-lock.json
└── node_modules/
```

---

## ⚙️ 설치 및 환경 설정

```bash
pnpm install
# 또는
npm install
```

### 환경 변수 (`.env` or process.env)
| 변수명 | 설명 |
|--------|------|
| `NCP_DRM_SITEID` | NCP DRM 사이트 ID |
| `NCP_API_GW_ACCESSKEY` | NCP API Gateway Access Key |
| `NCP_API_GW_SECRETKEY` | NCP API Gateway Secret Key |

---

## 🚀 실행 방법

### 1. CLI로 직접 실행
```bash
node drm-worker.mjs <hlsUrl> <dashUrl> <contentId> [drmType]
```

**예시:**
```bash
node drm-worker.mjs \
"https://cdn.example.com/hls/content_3563/master.m3u8" \
"https://cdn.example.com/dash/content_3563/manifest.mpd" \
3563 \
WIDEVINE
```

**출력 예시:**
```json
{
  "com.widevine.alpha": {
    "src": "https://cdn.example.com/dash/content_3563/manifest.mpd",
    "licenseUri": "https://multi-drm.apigw.ntruss.com/api/v1/license",
    "licenseRequestHeader": {
      "x-ncp-iam-access-key": "...",
      "x-drm-token": "eyJzaXRlSWQiOi..."
    }
  },
  "com.apple.fps": {
    "src": "https://cdn.example.com/hls/content_3563/master.m3u8",
    "certificateUri": "https://multi-drm.apigw.ntruss.com/api/v1/license/fairPlay",
    "licenseUri": "https://multi-drm.apigw.ntruss.com/api/v1/license"
  }
}
```

---

## 🧠 NestJS 연동 예시

```ts
import { promisify } from 'util';
import { execFile } from 'child_process';
import path from 'path';

const execFileAsync = promisify(execFile);

@Injectable()
export class DrmService {
  async getDrmSource(contentId: number, hlsUrl: string, dashUrl: string, drmType = 'WIDEVINE') {
    const scriptPath = path.resolve(__dirname, '../../drm-runner/drm-worker.mjs');

    const args = [
      scriptPath,
      encodeURIComponent(hlsUrl),
      encodeURIComponent(dashUrl),
      String(contentId),
      drmType
    ];

    const { stdout } = await execFileAsync('node', args, {
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    return JSON.parse(stdout.trim());
  }
}
```

---

## 🧾 의존성

- **moment** – Timestamp 생성
- **crypto-js** – HMAC-SHA256 서명
- (내장) Node 18+ `btoa`, `URL`, `process.env` 사용

---

## 🧱 Docker 포함 시 주의

`drm-runner` 폴더를 `.dockerignore`에서 제외해야 합니다.

```bash
# .dockerignore
node_modules
dist
.git
# drm-runner ← 주석 처리
```

**Dockerfile**
```dockerfile
COPY drm-runner ./drm-runner
```

---

## 🛠️ 개발 시 편의 명령어

```bash
pnpm start  # drm-worker.mjs 실행
pnpm lint   # 코드 스타일 검사
```

---

## 🪪 작성자 및 라이선스
안재현 작성

Studio Freewillusion Inc.
