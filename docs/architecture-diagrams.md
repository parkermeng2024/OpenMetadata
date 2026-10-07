# OpenMetadata 架构图

基于代码库实际结构（`ARCHITECTURE.md`、Maven 模块依赖、`openmetadata-service` 包结构、UI/ingestion 目录）整理，包含**技术架构图**与**业务架构图**两张 Mermaid 图。

---

## 技术架构图

```mermaid
flowchart TB
    subgraph Clients["客户端层"]
        UI["React SPA<br/>openmetadata-ui<br/>(Vite + TS, 4725 ts/tsx)"]
        UICore["组件库<br/>openmetadata-ui-core-components<br/>(react-aria + Tailwind tw:)"]
        SDK["Java SDK<br/>openmetadata-sdk"]
        MCPClient["AI Agent / MCP 客户端"]
        UI --> UICore
    end

    subgraph Server["服务端 (Java 25 + Dropwizard/Jersey) — openmetadata-service"]
        direction TB
        subgraph API["API 入口层"]
            RES["resources/ (233 文件)<br/>JAX-RS Resources<br/>REST /v1/*"]
            AUTH["security/ (98)<br/>JWT / OAuth2 / SAML<br/>RBAC 授权"]
            SSE["socket/ sse/<br/>WebSocket + SSE 实时推送"]
        end
        subgraph Core["核心领域层"]
            REPO["jdbi3/ (147)<br/>EntityRepository + CollectionDAO<br/>(129 个子 DAO, JDBI)"]
            GOV["governance/<br/>审批工作流引擎"]
            LINEAGE["lineage/ openlineage/<br/>血缘"]
            EVT["events/ (27)<br/>变更事件"]
        end
        subgraph Async["异步与应用层"]
            SEARCH["search/ (294)<br/>索引构建 + 查询"]
            APPS["apps/ (160)<br/>可插拔应用/调度器<br/>searchIndex · insights ·<br/>dataContracts · autoPilot · rdf"]
            MIG["migration/ (157)<br/>MigrationWorkflow<br/>(append-only 迁移)"]
            NOTIF["notifications/<br/>告警通知"]
        end
        RES --> REPO
        REPO --> EVT
        EVT --> SEARCH
        EVT --> APPS
        EVT --> NOTIF
    end

    subgraph MCP["MCP 服务"]
        MCPServer["openmetadata-mcp<br/>MCP Server"]
    end

    subgraph Storage["存储层"]
        DB[("MySQL / PostgreSQL<br/>元数据目录")]
        ES[("Elasticsearch 7.17+ /<br/>OpenSearch 2.6+<br/>搜索索引")]
        S3[("S3 / MinIO<br/>ingestion 日志")]
        RDF[("Apache Jena Fuseki<br/>RDF 知识图谱 (可选)")]
    end

    subgraph Ingestion["Python 摄取框架 (ingestion/)"]
        direction TB
        CLI["metadata CLI<br/>__main__.py"]
        CONN["连接器 (~97 个)<br/>source/{database,dashboard,pipeline,<br/>messaging,mlmodel,storage,search,api}<br/>ServiceSpec 插件契约"]
        SINK["sink/metadata_rest.py<br/>POST 实体到 REST API"]
        PROFILER["Profiler / Data Quality<br/>采样与测试"]
        CLI --> CONN --> SINK
        CONN --> PROFILER --> SINK
    end

    subgraph Orchestration["编排与部署"]
        AF["Apache Airflow<br/>摄取作业编排"]
        K8S["openmetadata-k8s-operator<br/>K8s Operator"]
        DIST["openmetadata-dist<br/>打包分发"]
    end

    subgraph Spec["Schema 单一事实源 — openmetadata-spec"]
        SCHEMA["904 个 JSON Schema<br/>json/schema/**"]
        GEN1["jsonschema2pojo → Java POJO"]
        GEN2["datamodel-codegen → Python Pydantic"]
        GEN3["quicktype → TypeScript 类型"]
        SCHEMA --> GEN1
        SCHEMA --> GEN2
        SCHEMA --> GEN3
    end

    subgraph Shaded["搜索客户端隔离 — openmetadata-shaded-deps"]
        SHADE["ES/OS Java 客户端<br/>重定位到 es.* / os.*<br/>两套客户端可共存"]
    end

    UI -->|"REST /v1/* (rest/ 层)"| RES
    SDK -->|HTTP| RES
    MCPClient --> MCPServer --> RES
    AUTH -.->|鉴权拦截| RES
    SINK -->|"POST /v1/*"| RES
    AF -->|触发| CLI
    REPO --> DB
    MIG --> DB
    SEARCH --> SHADE --> ES
    APPS --> S3
    APPS --> RDF
    GEN1 -.->|类型| Server
    GEN2 -.->|类型| Ingestion
    GEN3 -.->|类型| UI
    K8S -->|运行 OM 作业| Server
    DIST --> Server
```

**三条关键请求路径**（详见 `ARCHITECTURE.md`）：

1. **API 请求**（如 `POST /v1/tables`）：`resources/*Resource` → `jdbi3/*Repository` → `CollectionDAO/EntityDAO` → SQL；非 GET 响应同时扇出到 `events/`（变更事件）与 `search/`（索引更新）。
2. **摄取运行**：Airflow / `metadata` CLI 触发 → 连接器经 `service_spec.py` 动态加载（`DefaultSourceLoader`）→ 拓扑 yield 实体 → sink POST 回 REST API（即路径 1）。
3. **搜索查询**：UI `src/rest/` → `SearchResource` → `search/` → 经 shaded `es.*/os.*` 客户端访问 ES/OS。

---

## 业务架构图

```mermaid
flowchart TB
    subgraph Persons["用户角色"]
        DE["数据工程师"]
        DA["数据分析师 / 科学家"]
        DS["数据治理官 / Steward"]
        OPS["平台管理员"]
        AGENT["AI Agent (MCP)"]
    end

    subgraph Portal["统一门户 (openmetadata-ui)"]
        EXPLORE["探索/搜索<br/>Explore · MyData"]
        DETAIL["资产详情页<br/>Table/Dashboard/Pipeline/<br/>MlModel/Topic/Container..."]
        SETTINGS["设置中心<br/>服务/团队/策略/通知/应用"]
        MARKET["Data Marketplace<br/>数据产品 · 域"]
    end

    subgraph Discovery["① 数据发现 Data Discovery"]
        CATALOG["元数据目录<br/>数据库/看板/管道/模型/消息/存储/API"]
        SEARCHCAP["全文搜索 + 筛选<br/>(ES/OS)"]
        RANK["使用度/热度排名<br/>usage · entityProfiles"]
        DOMAIN["域 Domains +<br/>数据产品 Data Products"]
    end

    subgraph Governance["② 数据治理 Data Governance"]
        GLOSSARY["业务术语表<br/>Glossary"]
        TAGS["标签/分类<br/>Tags · Classification<br/>自动 PII 识别"]
        RBAC["RBAC 策略<br/>Teams · Roles · Policies"]
        CONTRACT["数据契约<br/>Data Contracts"]
        WF["治理审批工作流<br/>governance/workflows"]
        AUDIT["审计日志<br/>Audit Logs"]
    end

    subgraph Observability["③ 数据可观测性 Data Observability"]
        DQ["数据质量测试<br/>dqtests"]
        PROFILER2["数据剖析 Profiler<br/>表/列级统计"]
        INCIDENT["事故管理<br/>Incident Manager"]
        LIN["血缘 Lineage<br/>端到端 + 列级"]
        ALERT["告警/通知<br/>Observability Alerts"]
    end

    subgraph Insight["④ 数据洞察 Data Insights"]
        DI["数据资产分析<br/>Data Insights / Analytics"]
        KPI["KPI 目标追踪"]
        REPORT["报表 Reports"]
    end

    subgraph Collab["⑤ 协作 Collaboration"]
        FEED["活动流/讨论<br/>Feeds · Tasks"]
        ANNOUNCE["公告 Announcements"]
        KNOW["知识中心<br/>Knowledge Center"]
    end

    subgraph Integration["⑥ 集成与自动化 Integration & Automation"]
        CONNECTORS["75+ 源连接器<br/>(Python ingestion)"]
        OPENAPI["开放 REST API + SDK"]
        MCPCAP["MCP Server<br/>(AI Agent 接入)"]
        WEBHOOK["Webhook / 变更事件订阅"]
        APPS2["应用市场<br/>MarketPlace 可插拔应用"]
        AUTOMATION["Automations · Bots"]
    end

    Persons --> Portal
    Portal --> Discovery
    Portal --> Governance
    Portal --> Observability
    Portal --> Insight
    Portal --> Collab
    AGENT --> MCPCAP

    CONNECTORS -->|写入元数据| CATALOG
    CATALOG --> SEARCHCAP
    CATALOG --> GLOSSARY
    CATALOG --> DQ
    DQ --> INCIDENT --> ALERT
    PROFILER2 --> DQ
    LIN --> INCIDENT
    CATALOG --> DI --> KPI
    GLOSSARY --> CONTRACT
    RBAC -.->|访问控制| Portal
    CATALOG --> FEED
    CATALOG -.->|变更事件| WEBHOOK
    APPS2 --> AUTOMATION
    WF --> CONTRACT
    WF --> GLOSSARY
    AUDIT -.-> RBAC
```

**业务能力说明**（与代码的对应关系）：

| 能力域 | 主要代码位置 |
|---|---|
| 数据发现 | `resources/search/`、`resources/domains/`、`resources/usage/`、UI `ExplorePage` / `DataMarketplacePage` |
| 数据治理 | `resources/glossary/`、`resources/tags/`、`resources/policies/`、`resources/datacontract`（+ `apps/bundles/dataContracts`）、`governance/workflows`、`resources/audit` |
| 可观测性 | `resources/dqtests/`、`ingestion` profiler、`resources/events/`（告警）、`resources/lineage/`、UI `IncidentManager` |
| 数据洞察 | `dataInsight/`、`resources/kpi/`、`resources/reports/`、UI `DataInsightPage` |
| 协作 | `resources/feeds/`、`resources/tasks/`、`resources/knowledge/` |
| 集成自动化 | `ingestion/` 连接器、`openmetadata-mcp`、`resources/automations/`、`resources/bots/`、`resources/apps/`（应用市场） |
