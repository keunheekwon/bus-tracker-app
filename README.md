# Bus Tracker Android

Expo SDK 57, React Native, Expo Router로 만든 버스 실시간 위치 앱입니다. 일반 사용자는 로그인 없이 지도를 보고, 기사는 운행 중 위치를 전송하며, 관리자는 버스·기사·운행 기록을 관리합니다. 서버 계약은 `../backend/src/modules`와 `../backend/src/openapi.ts`를 따릅니다.

## 준비

- Node.js 22.13 이상, Android Studio, Android SDK 36, Java 17, Android Emulator 또는 실제 기기. `JAVA_HOME`은 Java 17, `ANDROID_HOME`은 Android SDK 디렉터리로 설정
- `npm install` 후 `.env.example`을 `.env`로 복사해 API, Socket.IO, Google Maps 키 설정
- `EXPO_PUBLIC_API_URL`: REST 서버 주소. 에뮬레이터에서 PC의 로컬 서버는 `http://10.0.2.2:3000`
- `EXPO_PUBLIC_SOCKET_URL`: Socket.IO 서버 주소. 같은 서버면 API URL과 동일
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Maps SDK for Android 키. 앱 package `com.kkeunhee09.bustrackerapp`와 APK 서명 SHA-1로 제한. 키 설정 후 `npx expo prebuild --platform android`로 네이티브 설정을 다시 생성
- `EXPO_PUBLIC_*` 값은 APK에 포함되는 공개 설정입니다. JWT 비밀키와 GitHub 토큰은 백엔드에만 둡니다.

## 실행

```bash
cd bus-tracker-app
npm install
npx tsc --noEmit
npx expo run:android
```

Native 위치 서비스와 APK 설치 Intent를 사용하므로 Expo Go 대신 Development Build를 실행합니다. 실제 Android 기기에서는 PC와 기기가 접근 가능한 HTTPS 서버 주소를 사용합니다. 첫 지도 화면에서 내 위치 표시를 위해 전경 위치 권한을 요청합니다. 기사 운행 시에만 백그라운드 위치 권한을 추가로 요청합니다.

## 운행 테스트

1. 백엔드 PostgreSQL·Redis를 실행하고 `../backend/README.md`에 따라 마이그레이션과 `npm run prisma:seed`를 실행한 뒤 서버를 시작합니다. 초기 관리자 아이디·비밀번호는 백엔드 `.env`의 `INITIAL_ADMIN_USERNAME`·`INITIAL_ADMIN_PASSWORD`이며, 시드는 ADMIN이 없을 때만 생성합니다.
2. 관리자 계정으로 로그인하여 버스를 만들고 기사 계정을 생성한 뒤 배정합니다.
3. 기사 계정으로 로그인해 운행을 시작하고 정확한 위치와 항상 허용 권한을 부여합니다.
4. Android Emulator **Extended Controls → Location**에서 좌표를 변경합니다.
5. `POST /api/v1/driver/location` 응답, 공개 지도 Marker 이동, 관리자 지도와 기록 재생을 확인합니다.
6. 화면을 끄거나 앱을 백그라운드로 옮겨 지속 알림과 위치 갱신을 확인합니다. Android가 앱을 강제 종료하거나 제조사 절전 정책이 서비스를 중지하면 지속 전송을 보장할 수 없으며, 재실행 시 서버의 current-session을 조회해 복구합니다.

서버는 GPS 기록 시각이 현재보다 2분 이상 오래되면 거부합니다. 앱은 실패한 최신 위치 한 건만 임시 저장하고 지수 백오프 후 다시 보냅니다. 오래된 위치는 폐기합니다.

## APK와 업데이트

앱 버전은 `package.json`의 `version`에서 가져옵니다. 새 버전 배포 시 Android `versionCode`도 `app.config.ts`에서 증가시킵니다. APK는 기존 설치본과 같은 서명 키로 빌드해야 합니다.

```bash
cd bus-tracker-app
npx eas-cli@latest build --platform android --profile production
```

EAS를 사용한다면 production 프로필에서 `android.buildType: "apk"`를 설정하세요. 로컬 빌드는 `npx expo prebuild` 후 Android Gradle의 release 서명 구성이 필요합니다. 빌드한 파일 이름을 `bus-tracker-v<version>.apk`로 만들고 GitHub Release tag `v<version>`에 첨부합니다. 백엔드의 `GITHUB_OWNER`, `GITHUB_REPO`, `ANDROID_MINIMUM_VERSION`을 설정하면 앱은 `/api/v1/public/app-update`만 조회합니다. 사용자가 업데이트를 선택하면 APK를 다운로드하고 Android 설치 화면을 엽니다. 기기에서 '이 출처의 앱 설치 허용'을 요구할 수 있습니다.
