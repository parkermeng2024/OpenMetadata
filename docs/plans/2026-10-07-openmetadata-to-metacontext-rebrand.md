# OpenMetadata → MetaContext 品牌替换 · P0 改动清单（逐文件 + 精确行号）

> 分支：`rebrand/openmetadata-to-metacontext` · 基线 `main` @ `288e0171f7`
> 范围：**仅 P0 = 用户可见品牌，零兼容风险**。
> 行号均为基线提交上的真实行号，可按文件定位。
>
> **状态**：本文件是审计结论 + 执行清单。
> B 类（对外技术契约：Java 包名 / Maven 坐标 / 环境变量 / DB 名 / CRD group / Schema `$id` …）与
> C 类（法律与上游引用：`Copyright … Collate`、`LICENSE`/`NOTICE`、`open-metadata.org`、
> `github.com/open-metadata`）明确**不在 P0 范围**——前者改了会破坏已发布 API/配置兼容性，
> 后者需法务确认。详见 §11 与 §12 的批次说明。

## 0. 一个决定性的发现（先把工作量打下来）

UI 里**已经存在完整的品牌注入机制**，不需要逐条改文案：

```ts
// vite.config.ts:390-392
'process.env.BRAND_NAME': JSON.stringify(env.BRAND_NAME || 'OpenMetadata')

// src/utils/i18next/i18nextUtil.ts:40
defaultVariables: { brandName: process.env.BRAND_NAME ?? 'OpenMetadata' }

// src/components/common/DocumentTitle/DocumentTitleProvider.tsx:44
<title>{[...segments, t('label.brand-name')].join(' | ')}</title>
```

也就是说：**浏览器标签页后缀、注册页欢迎语、文档面板文案**等已经全部走 `{{brandName}}`，只要设 `BRAND_NAME=MetaContext` 并改 3 处默认值即可。i18n 里已有 6 个品牌占位键：

`label.brand-name`(:358) · `label.brand-name-bot`(:359) · `label.brand-name-logo`(:360) · `label.brand-name-url`(:361) · `label.brand-updated`(:362) · `label.notification-from-brand-name`(:2127) — 均在 `src/locale/languages/en-us.json`

**P0 总计 ≈ 76 个文件**，其中真正含代码逻辑的只有 **6 个**，其余是配置默认值、文案与二进制资产。

---

## 组 1｜后端品牌抽象层（改产品名 / Logo）

| 文件 | 行号 | 现状 | 目标 |
|---|---|---|---|
| `openmetadata-service/src/main/java/org/openmetadata/service/util/branding/DefaultMessageBrandingProvider.java` | **17** | javadoc `returning OpenMetadata branding values` | MetaContext |
| 同上 | **25** | `return "OpenMetadata";` | `"MetaContext"` |
| 同上 | **30** | `return "https://cdn.getcollate.io/omd_logo192.png";` | 新 CDN/本地 Logo URL |
| `…/branding/MessageBrandingProvider.java` | **26** | javadoc `e.g. "OpenMetadata" or "Collate"` | 可选，文档同步 |
| `openmetadata-service/src/main/resources/META-INF/services/org.openmetadata.service.util.branding.MessageBrandingProvider` | **1** | `org.openmetadata.service.util.branding.DefaultMessageBrandingProvider` | 若新增 `MetaContextMessageBrandingProvider`，在此追加（其 `getPriority()` 需 > 0，见 `MessageBrandingResolver.java:38`） |

**消费端（无需改，自动生效）**
- `…/formatter/decorators/MessageDecorator.java:63`（连接测试消息）、`:68`（`getProductName()`）、`:72`（`getLogoUrl()`）
- `…/apps/bundles/changeEvent/generic/GenericPublisher.java:52`（Webhook 测试消息）

---

## 组 2｜前端 `BRAND_NAME` 机制（改默认值 + 传构建变量）

| 文件 | 行号 | 现状 | 目标 |
|---|---|---|---|
| `openmetadata-ui/src/main/resources/ui/vite.config.ts` | **40** | `const env = loadEnv(mode, process.cwd(), '')` | 无需改；确认 `BRAND_NAME` 从此处读取 |
| 同上 | **390-392** | `env.BRAND_NAME \|\| 'OpenMetadata'` | `env.BRAND_NAME \|\| 'MetaContext'` |
| `…/ui/src/utils/i18next/i18nextUtil.ts` | **40** | `brandName: process.env.BRAND_NAME ?? 'OpenMetadata'` | `?? 'MetaContext'` |
| `…/ui/src/components/common/ServiceDocPanel/ServiceDocPanel.tsx` | **532** | `brandName: process.env.BRAND_NAME ?? 'OpenMetadata'` | `?? 'MetaContext'` |
| 同上 | **693-694** | `replaceAll('OpenMetadata', process.env.BRAND_NAME ?? 'OpenMetadata')` | 兜底改为 `'MetaContext'` |

**消费端（无需改）**：`DocumentTitleProvider.tsx:44`（标签页后缀）、`SignInPage.tsx:67`+`:254`（登录页 "Welcome to …"）、`BasicSignup.component.tsx:60`+`:200`（注册页）、`EmailConfigUtils.ts:18`（`openMetadataUrl → label.brand-name-url`）、`SettingsCache`/`TestDefinitionForm` 等 14 个测试用例已覆盖该行为。

**⚠️ 交付链路缺口**：仓库内**不存在任何 `.env*` 文件**，`docker/` 与 `docker/development/Dockerfile` **均未传 `BRAND_NAME`**。要让构建产物真的叫 MetaContext，必须在 `.env`（或 CI/Docker build args）中提供 `BRAND_NAME=MetaContext`，否则第 390-392 行的新默认值才生效。

---

## 组 3｜静态页面元信息

| 文件 | 行号 | 现状 |
|---|---|---|
| `…/ui/index.html` | **23** | `<meta name="description" content="OpenMetadata Application" />` |
| 同上 | **24** | `<meta property="og:title" content="OpenMetadata" />` |
| 同上 | **25** | `<meta property="og:description" content="OpenMetadata Application" />` |
| 同上 | **168** | `<title>OpenMetadata</title>` |

> `index.html` 里 favicon 的 `<link>` 引用（21/28/82/86-138 行）指向 `${basePath}favicons/*`，**只要文件名与路径不变，就无需改动**——替换资产文件即可。

---

## 组 4｜前端品牌类与品牌外链

| 文件 | 行号 | 现状 | 目标 |
|---|---|---|---|
| `…/ui/src/utils/BrandData/BrandClassBase.ts` | **14-17** | import `logo-monogram.svg` / `logo.svg` | 指向新 Logo（或保持文件名、只换内容） |
| 同上 | **20-22** | `getMonogram()` | 新 monogram |
| 同上 | **24-26** | `getLogo()` | 新 wordmark |
| 同上 | **34-36** | `getSidebarLogo()` | 默认回落 `getLogo()`，无需改 |
| 同上 | **43-45** | `getSidebarMonogram()` | 默认回落 `getMonogram()`，无需改 |
| 同上 | **47-51**（URL 在 **50**） | `https://open-metadata.org/product-updates#v…` | MetaContext 官网/更新日志地址 |
| 同上 | **53-56**（URL 在 **55**） | `https://blog.open-metadata.org/announcing-openmetadata-1-13-…` | MetaContext 博客地址 |

**消费端（无需改）**：`WhatsNewAlert.component.tsx:48-49`、`platform/ai-shell/Sidebar/SidebarBrand.tsx:42-43`、`MyData/WelcomeScreen/WelcomeScreen.component.tsx:42`

---

## 组 5｜邮件 / 通知品牌

| 文件 | 行号 | 现状 | 说明 |
|---|---|---|---|
| `conf/operations.yaml` | **2** | `emailingEntity: ${OM_EMAIL_ENTITY:-"OpenMetadata"}` | 改默认值即可，**已有 `OM_EMAIL_ENTITY` 环境变量覆盖**（最省事的换法） |
| `openmetadata-service/src/main/java/org/openmetadata/DefaultOperationalConfigProvider.java` | **39** | `.withEmailingEntity("OpenMetadata")` | 默认 SMTP 设置 |
| `…/service/resources/settings/SettingsCache.java` | **633** | `.withEmailingEntity("OpenMetadata")` | 默认设置缓存 |
| `…/resources/json/data/document/emailTemplates/openmetadata/testMail.json` | **8** | 模板内品牌文案 | 目录名 `openmetadata/` 也是品牌 |
| `…/document/emailTemplates/openmetadata/dataInsightReport.json` | **8** | 模板内品牌文案 | |
| `…/json/data/notifications/envelopes/system-email-change-event-notification-envelope.json` | **5, 8** | 通知信封品牌文案 | |

**无需改**：`openmetadata-service/src/main/resources/json/data/notifications/templates/*`（不含品牌）

---

## 组 6｜OpenAPI / Swagger 元信息（开发者可见）

| 文件 | 行号 | 现状 |
|---|---|---|
| `…/service/OpenMetadataApplication.java` | **218** | `title = "OpenMetadata APIs"` |
| 同上 | **220** | `description = "Common types and API definition for OpenMetadata"` |
| 同上 | **223** | `name = "OpenMetadata"`（contact） |
| 同上 | **224** | `url = "https://open-metadata.org"` |
| 同上 | **225** | `email = "openmetadata-dev@googlegroups.com"` |

---

## 组 7｜i18n 文案（20 语言 × 4 行 = 80 行）

路径前缀：`…/ui/src/locale/languages/`

| 语种 | 文件 | 行号（4 行固定相同） |
|---|---|---|
| 英 | `en-us.json` | **4010, 4011, 5123, 5362** |
| 中简 | `zh-cn.json` | 同上 |
| 中繁 | `zh-tw.json` | 同上 |
| 日 | `ja-jp.json` | 同上 |
| 韩 | `ko-kr.json` | 同上 |
| 德 | `de-de.json` | 同上 |
| 法 | `fr-fr.json` | 同上 |
| 西 | `es-es.json` | 同上 |
| 葡(巴) | `pt-br.json` | 同上 |
| 葡(葡) | `pt-pt.json` | 同上 |
| 荷 | `nl-nl.json` | 同上 |
| 土 | `tr-tr.json` | 同上 |
| 俄 | `ru-ru.json` | 同上 |
| 泰 | `th-th.json` | 同上 |
| 西语(加利西亚) | `gl-es.json` | 同上 |
| 希伯来 | `he-he.json` | 同上 |
| 阿拉伯 | `ar-sa.json` | 同上 |
| 瑞典 | `sv-se.json` | 同上 |
| 马拉地 | `mr-in.json` | 同上 |
| 波斯 | `pr-pr.json` | 同上 |

4 个 key 与语义：
- `4010` `doc-field-test-definition-supported-data-types`（"For **OpenMetadata**-native tests…"）
- `4011` `doc-field-test-definition-test-platforms`（"…e.g. **OpenMetadata**, dbt, Great Expectations"）
- `5123` `sparql-playground-subtitle`（"…against the **OpenMetadata** knowledge graph…"）
- `5362` `workflow-empty-description`（"…and **OpenMetadata** handles the rest."）

> 两个额外动作：① 这 4 条建议改为使用 `{{brandName}}` 占位，从根上避免以后再改；② `zh-cn.json` / `zh-tw.json` 这 4 条目前是**英文原文未翻译**，顺手补齐中文。

---

## 组 8｜UI 服务文档（10 个文件，16 行；目录名本身是品牌）

目录：`…/ui/public/locales/en-US/OpenMetadata/`（仅 `en-US` 有此目录，`fr-FR` / `sv-SE` 没有）

| 文件 | 含品牌行号 |
|---|---|
| `TestDefinitionForm.md` | **26, 50, 68** |
| `EmailConfiguration.md` | **3, 5, 53, 55** |
| `OpenMetadataUrlConfiguration.md` | **1, 5, 7** |
| `TestCaseForm.md` | **3, 99, 234** |
| `CustomLoginConfiguration.md` | **9** |
| `CustomLogoConfiguration.md` | **9** |
| `CustomProperty.md` | **3** |
| `LineageConfiguration.md` | — |
| `MetricEntity.md` | — |
| `ObservabilityAlertForm.md` | — |

> 目录名 `OpenMetadata/` 的改名需同步 `src/constants/service-guide.constant.ts:153`（`'OpenMetadataUrlConfiguration'` 等条目）与该目录的 `$(id=...)` 引用。

---

## 组 9｜品牌资产（31 个文件，仅替换文件内容）

**Logo（4 个 SVG）**
| 文件 | 说明 |
|---|---|
| `…/ui/src/assets/svg/logo.svg` | wordmark，viewBox `0 0 157 64`，12.5KB，**纯 path 无 `<text>` → 必须重绘** |
| `…/ui/src/assets/svg/logo-monogram.svg` | 1.7KB，同上 |
| `…/ui/src/assets/svg/ic-custom-logo.svg` | 自定义 Logo 占位图标 |
| `…/ui/src/assets/svg/ic-custom-dashboard-logo.svg` | 同上 |

**站点图标（26 个 PNG）**
- `…/ui/public/favicon.png`（64×64）
- `…/ui/public/logo192.png`（600×600）
- `…/ui/public/favicons/` 全部 **24 个**：`favicon-16x16`、`favicon-32x32`、`favicon-96x96`、`android-icon-{36,48,72,96,144,192}x*`、`apple-icon-{57,60,72,76,114,120,144,152,180}x*`、`apple-icon-precomposed`、`apple-icon`、`ms-icon-{70,144,150,310}x*`

**视频（1 个）**
- `…/ui/src/assets/videos/omd.mp4`（15.8MB，登录页背景视频；`OpenMetadata` 字样与英文营销文案**烘焙在画面内**，只能重制）

**已核查"无需改动"的图片（OCR 验证）**
| 文件 | 结论 |
|---|---|
| `src/assets/img/welcome-screen.png` | 541×408，**画面无可识别文字** → 无需替换 |
| `src/assets/img/login-screen/data-collaboration.png` 等 4 张 | 产品截图，无品牌词；且 `LoginClassBase.getLoginCarouselContent()` **已无任何调用方**（登录页走视频分支，见 `CarouselLayout.tsx:62-88`）→ 实为死资产，可不动 |

---

## 组 10｜低优先级 / 内部标识（可并入 P0，也可延后）

| 文件 | 行号 | 现状 | 性质 |
|---|---|---|---|
| `…/ui/src/utils/WebAnalyticsUtils.ts` | **61** | `app: 'OpenMetadata'` | 前端埋点 app 名（分析后台可见） |
| `…/service/jdbi3/HikariCPDataSourceFactory.java` | **390** | `props.putIfAbsent("ApplicationName", "OpenMetadata")` | DB 连接应用名（DBA 可见） |
| `…/service/apps/AbstractNativeApplication.java` | **68** | `private static final String SERVICE_NAME = "OpenMetadata"` | 内部应用名 |
| `conf/openmetadata.yaml` | **373** | `ApplicationName: ${DB_PG_APPLICATION_NAME:-OpenMetadata}` | 已有环境变量覆盖 |
| `conf/openmetadata-h2-test.yaml` | **385** | 同上 | 测试配置 |

---

## ⚠️ 组 11｜"用户可见，但属数据契约"——请勿放进 P0 自动改

这些串在界面上确实显示为 `OpenMetadata`，但它们同时是**已落库的服务类型标识**，改名会破坏既有实例与 API：

| 文件 | 行号 | 内容 |
|---|---|---|
| `…/service/resources/services/metadata/MetadataServiceResource.java` | **79** | `public static final String OPENMETADATA_SERVICE = "OpenMetadata";` |
| `…/service/src/main/resources/json/data/metadataService/OpenmetadataService.json` | **2, 3, 4, 5** | `"name"` / `"displayName"` / `"description"` / `"serviceType"` |
| `…/ui/src/constants/ServiceType.constant.ts` | **32** | `export const OPEN_METADATA = 'OpenMetadata';` |
| `…/ui/src/constants/service-guide.constant.ts` | **155** | 同上 |
| `…/ui/src/utils/EntityUtils.interface.ts` | **41** | `OpenMetadata = 'OpenMetadata'` |

> 若确实要改，必须走"新增 + 迁移 + 别名兼容"，不能只改常量。

---

## 12. 建议的提交批次（4 个 commit）

| 批次 | 内容 | 文件数 | 独立验证方式 |
|---|---|---|---|
| ① 前端品牌注入 | 组 2（3 处默认值）+ 组 3（index.html） | 4 | `yarn test src/components/common/DocumentTitle` + 浏览器标题/注册页文案 |
| ② 后端品牌 | 组 1 + 组 5 + 组 6 | 9 | `mvn -pl openmetadata-service test -Dtest='MessageBranding*'`；重启后看 Webhook/告警测试消息与邮件 |
| ③ 资产替换 | 组 9 | 31 | 目视：登录页 Logo、导航栏、favicon、登录视频 |
| ④ 文案与文档 | 组 7 + 组 8 | 30 | `yarn i18n`（i18n 同步校验）+ `yarn lint` |

**总计：76 个文件 / 其中 6 个含逻辑代码。**

> 提醒：`.github/workflows/**` 属供应链面，本仓库规则要求**显式授权**才能改动——本清单未包含任何 workflow 改动。

---

## 13. 复核用命令（可复现本清单）

```bash
# 组1-2：品牌注入点
rg -n "BRAND_NAME" openmetadata-ui/src/main/resources/ui/vite.config.ts \
  openmetadata-ui/src/main/resources/ui/src/utils/i18next/i18nextUtil.ts \
  openmetadata-ui/src/main/resources/ui/src/components/common/ServiceDocPanel/ServiceDocPanel.tsx

# 组1：后端
rg -n '"OpenMetadata"' openmetadata-service/src/main/java/org/openmetadata/service/util/branding/

# 组5：邮件
rg -n 'withEmailingEntity' openmetadata-service/src/main
rg -n -F 'OpenMetadata' openmetadata-service/src/main/resources/json/data/document/emailTemplates/

# 组7：i18n
rg -n -F 'OpenMetadata' openmetadata-ui/src/main/resources/ui/src/locale/languages/*.json | cut -d: -f1,2

# 组8：服务文档
rg -n -F 'OpenMetadata' openmetadata-ui/src/main/resources/ui/public/locales/en-US/OpenMetadata/

# 组9：资产
git ls-files openmetadata-ui/src/main/resources/ui/public/favicons/
ls openmetadata-ui/src/main/resources/ui/src/assets/svg/logo*.svg
```

---

## 14. 执行结果（2026-10-07）

### 14.1 已完成

| 批次 | 内容 | 状态 |
|---|---|---|
| ① 前端品牌注入 | `vite.config.ts` / `i18nextUtil.ts` / `ServiceDocPanel.tsx` 默认值改为 `MetaContext`；`index.html` 标题与 meta | ✅ |
| ② 后端品牌 | `DefaultMessageBrandingProvider` 产品名；邮件 `emailingEntity`（`conf/operations.yaml` + 2 处 Java 默认值）；`testMail.json` 与变更通知信封文案；OpenAPI `@Info`；DB `ApplicationName` 默认值 | ✅ |
| ③ 品牌资产 | 由工作区根目录的 `metaContext.svg`（品牌素材，尚未纳入版本控制）生成 `logo.svg`（mark+wordmark）、`logo-monogram.svg`、`public/favicon.png`、`public/logo192.png`、`public/favicons/*`（24 个） | ✅ |
| ③′ 品牌资产（最终版） | 上述草稿素材由品牌方提供的最终母版替换（`metaContext-logo-final.svg`），同一批 28 个文件全部重生成，见 §14.7 | ✅ |
| ④ 文案 | 20 个语言文件 × 4 条：`OpenMetadata` → `MetaContext`（共 80 处） | ✅ |

**组 8（UI 服务文档 md）经核实无需改动**：`ServiceDocPanel.tsx:693` 在渲染时执行
`markdownContent.replaceAll('OpenMetadata', process.env.BRAND_NAME ?? 'MetaContext')`，
文档正文的品牌词在运行时被替换；而 `/OpenMetadata/` 目录名由服务类型 `serviceType='OpenMetadata'` 决定
（见 `ServiceDocPanel.tsx:662`），属 §11 的数据契约，不在 P0。

### 14.2 本次顺带修复的强耦合点（不改会坏）

| 文件 | 原因 |
|---|---|
| `openmetadata-service/pom.xml`（swagger 插件 `<openAPI><info>`） | 与 `@Info` 注解描述同一个 OpenAPI 信息块，必须与注解一致 |
| `openmetadata-service/src/main/resources/openapi.yml` | SwaggerBundle 运行时配置桩，其 `title` 即 API 文档页标题 |
| `scripts/update_version.py:98` | 版本号更新正则硬编码 `title = "OpenMetadata APIs"`，不改则发布脚本静默失效 |
| `MessageBrandingResolverTest.testDefaultProductName` | 断言默认产品名，随默认值同步 |
| `ServiceDocPanel.test.tsx`「BRAND_NAME 未设置」用例 | 断言回退值，随默认值同步 |

### 14.3 验证证据

```bash
mvn -pl openmetadata-service spotless:apply                      # exit 0，仅格式化
mvn -pl openmetadata-service test -Dtest='MessageBrandingResolverTest,DefaultOperationalConfigProviderTest'
                                                                 # Tests run: 15, Failures: 0, Errors: 0
yarn test --testPathPattern 'ServiceDocPanel|BrandImage|NavBar|DocumentTitle|TourEndModal|LoginCarousel'
                                                                 # 6 suites, 96 tests passed
yarn i18n                                                        # 无额外 diff（i18n 同步门禁通过）
yarn generate:app-docs                                           # 无 diff（app-docs 门禁通过）
```

浏览器实测（`:3000`，dev server 热更新后）：
标签页 `登入 | MetaContext` / `我的数据 | MetaContext`、`<meta name="description">` = "MetaContext Application"、
登录页品牌图 alt = "MetaContext Logo"（新 monogram，113×150 正常渲染）、
`欢迎来到 MetaContext`、AI 侧栏 wordmark SVG 文本 = "MetaContext"（viewBox `5 66 181 86`，未裁切）。

### 14.4 遗留（代码内已留 `TODO(rebrand)`）

| 位置 | 待定项 |
|---|---|
| `DefaultMessageBrandingProvider.getLogoUrl()` | 聊天告警缩略图用的绝对 URL，需 MetaContext 自己的 CDN 地址 |
| `BrandClassBase.getReleaseLink()` / `getBlogLink()` | "What's New" 弹窗指向的更新日志 / 博客地址 |
| 邮件信封 / OpenAPI contact | `open-metadata.org`、`slack.open-metadata.org`、`openmetadata-dev@googlegroups.com`、YouTube 频道等外部链接——无法凭空构造，需产品决定换成自有地址还是保留上游 |
| `src/assets/videos/omd.mp4` | 登录页视频画面内烘焙有品牌文字，必须重制（唯一无法自动化的资产） |

### 14.5 明确不改（见 §11 与 B/C 类清单）

Java 包名 `org.openmetadata`、Maven/npm/PyPI 坐标、57 个 `OPENMETADATA_*` 环境变量、`openmetadata.yaml`
等配置文件名、`openmetadata_db` 等数据库标识、`docker.getcollate.io/openmetadata/*` 镜像、
CRD group `openmetadata.org`、Schema `$id`、`MetadataServiceResource.OPENMETADATA_SERVICE` /
`AbstractNativeApplication.SERVICE_NAME` / `ServiceType.constant.ts` 的 `OpenMetadata` 服务类型、
`WebAnalyticsUtils.ts:61` 埋点 `app` 标识，以及全部 `Copyright … Collate` 版权头与 `LICENSE`/`NOTICE`。

### 14.6 追加：YouTube 外链清理（2026-10-07 后续）

清掉了两类 YouTube 外链：

| 位置 | 处理 |
|---|---|
| `json/data/document/emailTemplates/openmetadata/dataInsightReport.json` | 删除邮件页脚 3 个社交图标中的 YouTube 单元格（`youtube.com/c/OpenMetadataChannel`），并归一化被破坏的缩进；JSON 已校验 |
| `json/data/learningResource/` | 删除 **14 个** `source.url` 指向 `youtube.com` 的种子资源（12 个 `CollateClues_*` + `Video_BigQueryIntegration` + `Video_SnowflakeIntegration`） |

**保留未动**：同目录下 **12 个** 非 YouTube 资源（`DataProducts_Storylane`、`Demo_*`、`Profiling`、`UserManagement`、
`WorkingWithRolesAndPolicies`、`UsingTheWorkflowBuilder`、`CustomMetricsAndAlerts`、
`DataGovernanceBasics_Automations`），它们的 `source.url` 指向 `collate.storylane.io`——同样指向上一家厂商，
但不属于"YouTube"。去掉它们会让种子目录为空（git 无法跟踪空目录，且会影响 `SeedDataGate` 的分类扫描），
如需清理应改为保留一个占位资源或调整加载逻辑，请单独决策。

**同步修复的测试耦合**（这两个测试原本要求 `CollateClues_GettingStarted` 存在，删除后会失败）：

| 文件 | 改动 |
|---|---|
| `openmetadata-service/src/test/java/org/openmetadata/service/seeding/SeedDataGateTest.java` | 断言的种子身份改为仍然存在的 `Demo_GettingStarted` |
| `openmetadata-integration-tests/src/test/java/org/openmetadata/it/tests/SeedDataPresenceIT.java` | 同上 |

邮件页脚另外两个社交图标（`twitter.com/open_metadata`、`linkedin.com/company/collateinc`）**仍在**
——它们同样指向旧厂牌账号，但不在"YouTube"范围内，未动。

**验证证据（14.6）**

```bash
# 单元：SeedDataGate 扫描真实 classpath 种子（重建后为 12 个文件、0 处 youtube）
mvn -o -pl openmetadata-service test -Dtest=SeedDataGateTest
#   Tests run: 8, Failures: 0, Errors: 0

# 集成：真实启动服务 + 数据库，断言种子行存在
mvn -o -pl openmetadata-integration-tests verify -Dit.test=SeedDataPresenceIT -Dsurefire.skip=true
#   Tests run: 1, Failures: 0, Errors: 0   BUILD SUCCESS
```

### 14.7 追加：改用最终版品牌素材（2026-10-07 后续）

批次 ③ 当时用的是工作区根目录的草稿 `metaContext.svg`；品牌方随后提供了最终母版
（`metaContext-logo-final.svg`，`viewBox="0 0 3462.7 405.0"`，4 个顶层 `<g>`、共 27 条 `<path>`，
配色 `#1d1d4a` + `#496ce0`）。同一批 28 个文件全部按最终母版重生成。

**母版结构（决定了如何切分素材）**：主体由 4 个顶层分组组成，每组外层
`translate(x,y) scale(0.159392|0.166667)` + 内层 `translate(0,6000|2039) scale(0.1,-0.1)`：

| 分组 | 外层 transform | path 数 | 内容 |
|---|---|---|---|
| 1 | `translate(2,-300) scale(0.166667)` | 4 | mark 上半 |
| 2 | `translate(2,-300) scale(0.166667)` | 12 | mark 下半 |
| 3 | `translate(371,40) scale(0.159392)` | 4 | 字标 "Meta" |
| 4 | `translate(1533.76,40) scale(0.159392)` | 7 | 字标 "Context" |

即 **mark = 第 1、2 组（共 16 条 path）**，字标 = 第 3、4 组（共 11 条）。

**落库结果**

| 文件 | 内容 | viewBox |
|---|---|---|
| `src/assets/svg/logo.svg` | 母版原样（27 条 path，`d` 序列与母版逐条一致） | `0 0 3462.7 405.0` |
| `src/assets/svg/logo-monogram.svg` | 仅 mark（母版第 1、2 组，16 条 path） | `41.3 44.3 297.5 317.4` |
| `public/favicon.png`(64)、`public/logo192.png`(600)、`public/favicons/*`(24) | 由 mark 居中放入 400×400 画布（填充率 84%）后按原尺寸栅格化 | — |

母版根节点自带的 `width="3463" height="405"` **已去掉**：仓库里原有的 `logo.svg` / `logo-monogram.svg`
都只有 `viewBox`，尺寸一律交给 CSS；保留固有宽高会在无 CSS 约束的场景（如 React 组件形式）按 3463px 渲染。

**布局安全性（已实测，非推断）**

| 位置 | 容器 | 渲染结果 |
|---|---|---|
| AI 侧栏展开态字标 | `.ask-main-panel__logo-btn svg { height:24px; width:auto; max-width:100% }` | **205.19 × 24 px**，不溢出（8.6:1 的宽字标按高度约束、宽度跟随 viewBox 比例） |
| AI 侧栏折叠态 mark | rail 32×32，`<Monogram height={28} width={23} />` | 盒子 23×28，实际着色 **23 × 24.54 px**——内联 SVG 有 `viewBox` 时默认 `preserveAspectRatio`，只会在盒内留白，**不会拉伸变形** |

**验证证据（14.7）**

```bash
# 1) SVG 结构与素材保真：母版 27 条 path 的 d 属性序列与仓库 logo.svg 完全一致；
#    logo-monogram.svg == 母版前 16 条。三份 SVG 均 XML well-formed。
./env/bin/python  # xml.etree 解析 + d 属性逐条比对 → identical sequence: True

# 2) 真实浏览器（Chromium）量测：字标 205.19x24、mark 23x24.54，均不溢出
node  # playwright-core：panelOverflows=false / railOverflows=false

# 3) PNG 解码后统计非透明像素：内容居中、四边留白对称、非空白
#    favicon.png 64 -> bbox [6,5,57,58]  ink 38.3%
#    logo192.png 600 -> bbox [63,48,536,551]  ink 32.9%
#    ms-icon-310x310 -> bbox [33,24,276,285]  ink 33.3%

# 4) 组件级回归（品牌相关 13 个 suite）
yarn test --testPathPattern '(BrandImage|SidebarBrand|NavBar|SignUpPage|DocumentTitle|TourEndModal|ServiceDocPanel|LoginCarousel|ServiceIconUtils|UserProfileCard)'
#   Test Suites: 13 passed, 13 total / Tests: 132 passed, 132 total / Snapshots: 0
```

**未落库的素材（已决策）**：品牌方另给了两张 4000×468 的成品图
`metaContext-logo-final-white.png`（白底）与 `metaContext-logo-final-transparent.png`（透明底）。
仓库现有的 5 个 logo 位（`logo.svg`、`logo-monogram.svg`、`favicon.png`、`logo192.png`、`favicons/*`）
都是"标记/方图"用途，没有横向成品图的位置（`logo192.png` 甚至未被任何代码引用）。
**决策（2026-10-07）：本次不纳入**，保持改动仅替换既有 logo 位；素材留在工作区外。
若后续要用，可选：① 作为站点 `og:image`（`index.html` 现无 og:image，社交分享卡片为空白）；
② 放进 `docs/` 作为文档头图；③ 作为 README 顶部横幅。

**已知视觉风险（已修复）**：最终 mark 为深藏青 `#1d1d4a` + 亮蓝 `#496ce0` 双色，深色主题下藏青那半几乎不可见。
实测确认后已补深浅两套油墨与按主题切换，见 §14.8。


### 14.8 追加：深色主题品牌油墨（2026-10-07 后续）

§14.7 结尾标记的"深色主题风险"经实测确认成立，本次修复。

**实测缺陷（深色模式下逐处量测对比度）**

| 位置 | 形态 | 承载色 | 藏青 `#1d1d4a` | 蓝 `#496ce0` |
|---|---|---|---|---|
| AI 侧栏（展开字标 + 折叠 mark） | 内联 SVG | `rgb(34,38,47)` | **1.04 : 1** ❌ | 3.25 : 1 |
| 登录页 | `<img>`（白卡片） | `rgb(255,255,255)` | 15.83 : 1 ✓ | 4.66 : 1 ✓ |

即只有 AI 侧栏真的坏：1.04:1 等于与背景同亮度（WCAG 对图形要求 ≥3:1），藏青半部消失。登录页由白卡片承载，
深浅主题下都正确，不动。

**方案**：新增深色变体资产，由 `BrandClassBase` 按主题返回（可选参数 + 默认值，向后兼容）。

| 文件 | 油墨 |
|---|---|
| `src/assets/svg/logo.svg` / `logo-monogram.svg` | 浅底用：`#1d1d4a` + `#496ce0`（未改） |
| `src/assets/svg/logo-dark.svg` / `logo-monogram-dark.svg` | 深底用：`#ffffff` + `#84caff`（新增） |

深色的蓝取 `#84caff`，与设计系统自身的深色品牌色一致（`--om-color-brand-300`，`tailwind.css` 里已有
`.dark-mode` 把品牌文字翻到它）；实测对深色侧栏为白 15.08:1 / `#84caff` 8.53:1。

API：`getLogo/getMonogram/getSidebarLogo/getSidebarMonogram(theme: Theme = 'light')` —— 默认值让现有调用点与
下游覆写（Collate 子类）零改动；`ServiceIconUtils` 在模块顶层解析 `getMonogram()`，靠默认值保持可用。

**接线范围（读代码后确定，非按直觉）**

| 表面 | 处理 | 依据 |
|---|---|---|
| AI 侧栏 panel + rail | 传主题 | 背景主题驱动，实测 1.04:1 不可见 |
| `TourEndModal` | 传主题 | 内联 SVG；AntD 弹窗背景用 `--om-color-bg-overlay-surface`，深色下为深色（`modal.less` 的注释亦确认"dark overlay surface"） |
| 登录 / 注册 / 忘记密码 | **不传** | 不在 `ThemeProvider` 作用域内（`useTheme()` 无 Provider 会抛异常），且实测为白卡片、对比度 15.83:1 |
| `NavBar` | **不传** | 读代码后发现其 `Logo` 是**浏览器通知图标**（`new Notification(..., { icon: Logo })`），由操作系统绘制而非应用主题 —— 跟随应用主题反而会在浅色系统通知上不可见。最初按"经典 NavBar 品牌图"接了主题，读代码后**已回退**，仅留一行注释说明 |
| `ServiceIconUtils` | 不传 | 模块顶层常量，非组件，无主题上下文 |

**验证证据（14.8）**

```bash
# 1) 资产：几何与浅色版逐条相同，仅油墨不同（避免深色版重画 mark）
yarn test --testPathPattern BrandClassBase
#   BrandClassBase.test.ts：27/16 条 path 的 d 序列相等、fill 集合正确、深色版无藏青

# 2) 组件：主题是否真的传到侧栏资产
yarn test --testPathPattern SidebarBrand         # 3 passed（此前该组件没有任何测试）
yarn test --testPathPattern '(BrandClassBase|SidebarBrand|NavBar|TourEndModal|BrandImage|SignUpPage)'
#   Test Suites: 8 passed / Tests: 57 passed / Snapshots: 0

# 3) 真实浏览器（Chromium，经 localStorage 'ui-theme' 走应用自身主题状态，非手工改 class）
#   dark  : html.dark-mode，panel 27 条 path fill=['#84caff','#ffffff']，rail 16 条 path 同油墨，rail 盒 23×28
#   light : html 无 dark-mode，panel 27 条 path fill=['#1d1d4a','#496ce0']
```

**为什么侧栏资产切换只在浏览器里验证**：jest 的 `moduleNameMapper` 把**所有** `*.svg` 映射到同一个 mock，
四个资产在测试里是同一个模块标识（`getLogo('light') === getLogo('dark')`），因此 ink 选择无法在 jsdom 断言——
已在 `BrandClassBase.test.ts` 顶部注明，改由"调用点组件测试 + 资产文件断言 + 浏览器实测"三层覆盖。

**顺带发现（环境，非仓库问题）**：本机 `localhost:3000` 被 `genbi-wren-ui-1` 容器占用 IPv4，vite 只占 IPv6，
导致浏览器把部分请求（含 `/api/v1/...` 启动鉴权）打到那个容器、返回 404，页面永久停在 full-screen loader。
用 `http://[::1]:3000` 可绕开；彻底解决需停掉该容器或给 UI 换端口。
