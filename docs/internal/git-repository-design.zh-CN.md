# 内部网关 Git 仓库设计方案

## 结论

建议继续使用单仓 monorepo，并基于当前仓库演进。

原因：

- 后端和前端耦合较紧
- relay 改动通常会联动管理后台改动
- 内部平台更适合统一发布节奏
- 当前代码结构本身就已经接近 monorepo 形态

第一阶段不建议将前后端拆成独立仓库。

---

## 仓库目标

这个仓库应支持：

- 快速做内部定制开发
- 按业务域清晰划分责任
- 稳定的发布管理
- 基于上游项目的渐进式演进

---

## 推荐仓库策略

### 上游管理方式

将当前仓库视为“内部定制 fork”。

推荐远端配置：

- `origin`：你们自己的内部仓库
- `upstream`：`https://github.com/Calcium-Ion/new-api.git`

目标：

- 内部改造始终维护在自己的主线上
- 定期吸收上游有价值的更新
- 避免继续在匿名本地 clone 上直接开发

### 分支模型

建议保留以下长期分支：

- `main`：面向生产的内部稳定分支
- `develop`：下一阶段开发集成分支
- `upstream-sync`：仅用于同步上游、处理冲突的临时长分支

建议短期分支命名：

- `feature/<domain>-<name>`
- `fix/<domain>-<name>`
- `hotfix/<name>`
- `chore/<name>`

示例：

- `feature/auth-oidc-only`
- `feature/model-alias-policy`
- `feature/service-account-admin`
- `fix/relay-gemini-routing`

### Tag 策略

建议使用内部发布标签，不直接照搬上游版本语义。

推荐格式：

- `internal-v0.1.0`
- `internal-v0.2.0`
- `internal-v0.2.1`

如果你希望和上游提交建立对应关系，可以使用：

- `internal-v0.2.0+upstream-f995a86`

---

## 目录设计建议

### 第一阶段：保留当前结构，在顶层增加内部扩展目录

这是最稳妥的短期方案，因为不需要立刻重构 Go import 路径。

建议增加的顶层目录：

- `docs/internal/`
- `deploy/`
- `configs/`
- `tests/`

推荐结构：

```text
.
├─ common/
├─ constant/
├─ controller/
├─ middleware/
├─ model/
├─ oauth/
├─ relay/
├─ router/
├─ service/
├─ setting/
├─ web/
├─ docs/
│  └─ internal/
├─ deploy/
│  ├─ docker/
│  ├─ compose/
│  └─ k8s/
├─ configs/
│  ├─ dev/
│  ├─ staging/
│  └─ prod/
├─ scripts/
└─ tests/
```

### 第二阶段：可选的结构升级

只有在内部版稳定之后，才建议考虑这一步。

潜在目标结构：

```text
.
├─ apps/
│  ├─ gateway-api/
│  └─ admin-web/
├─ packages/
│  ├─ relay-core/
│  ├─ auth-core/
│  └─ policy-core/
├─ deploy/
├─ docs/
└─ tests/
```

这一阶段是可选项，不应阻塞产品交付。

---

## 建议的模块归属方式

建议按业务域分配 ownership，而不是只按技术层拆分。

推荐归属切片：

- `auth-and-access`
  - `middleware/auth.go`
  - `oauth/*`
  - `controller/oauth.go`
  - `controller/user.go`
- `relay-and-routing`
  - `controller/relay.go`
  - `relay/*`
  - `service/channel*.go`
- `governance-and-billing`
  - `service/billing.go`
  - `service/quota.go`
  - `model/log.go`
  - `model/usedata.go`
- `admin-console`
  - `web/src/pages/*`
  - `web/src/components/*`
- `platform-and-deploy`
  - `Dockerfile`
  - `docker-compose.yml`
  - `deploy/*`
  - `.github/workflows/*`

---

## 内部文档目录建议

建议将 `docs/internal/` 作为内部定制与架构决策的统一入口。

推荐文档：

- `docs/internal/internal-gateway-refactor-checklist.md`
- `docs/internal/git-repository-design.md`
- `docs/internal/auth-design.md`
- `docs/internal/model-alias-design.md`
- `docs/internal/service-account-design.md`
- `docs/internal/deployment-profile.md`
- `docs/internal/upstream-sync-playbook.md`

---

## CI/CD 设计建议

第一阶段建议保持 CI 简洁。

推荐工作流：

1. `ci-backend`
   - Go build
   - Go tests
   - 如引入 lint，则执行 lint

2. `ci-frontend`
   - 前端依赖安装
   - 前端构建
   - 前端 lint

3. `ci-integration`
   - 前后端联合构建
   - 对 `/api/status` 做 smoke test

4. `release-internal`
   - 构建内部镜像
   - 打 tag
   - 发布到内部制品仓库

当前 `.github/workflows/` 下已经有现成工作流文件，所以可以先在旁边追加内部工作流，再逐步剥离掉不适合内部版的公网发布流程。

---

## Commit 规范

建议使用轻量级 conventional commit 风格。

推荐前缀：

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `chore:`
- `test:`

示例：

- `feat: add internal model alias management`
- `fix: restrict public signup in internal profile`
- `refactor: simplify auth flow for oidc-only mode`

---

## Upstream 同步策略

由于这个项目本质上是基于上游项目演进的内部 fork，建议提前定义稳定的同步流程。

推荐规则：

1. 不要直接在临时 upstream 同步分支上做日常开发。
2. 内部特性要通过清晰命名的提交和文档沉淀下来。
3. 先将 upstream 同步到 `upstream-sync`，在那里处理冲突，再合入 `develop`。
4. 通过 smoke test 后再从 `develop` 提升到 `main`。

推荐频率：

- 正常阶段按月同步
- 遇到安全修复或关键供应商兼容修复时立即同步

---

## 建议的初始分支集

当你把仓库迁到内部远端后，建议先建立：

1. `main`
   - 当前内部稳定基线
2. `develop`
   - 下一阶段集成分支
3. `feature/internal-gateway-foundation`
   - 去掉公网产品壳层，保留 relay 核心
4. `feature/auth-oidc-only`
   - 企业登录体系改造
5. `feature/model-alias-policy`
   - 内部模型抽象层
6. `feature/service-account-governance`
   - 机器身份与治理能力

---

## 建议的里程碑映射

### 里程碑 1：内部基础版

- 移除公网商业化功能
- 收紧认证路径
- 准备内部部署配置

### 里程碑 2：身份与策略

- OIDC-only 登录
- 角色 / 分组映射
- 内部模型别名

### 里程碑 3：治理能力

- 服务账号
- 额度与预算控制
- 更强的审计检索

### 里程碑 4：运维能力

- 内部看板
- 告警
- 自动化 upstream 同步流程

---

## 最终建议

对于当前项目，最适合的 Git 设计是：

- 一个内部 monorepo
- 一个生产主分支加一个开发集成分支
- 以业务域命名的 feature 分支
- 将内部文档集中在 `docs/internal/`
- 通过定期 upstream 同步持续吸收上游能力，而不是频繁做大规模结构重写

这样既能保证你现在改起来顺手，也给后续进一步架构升级留下空间。
