# 内部 API 网关改造清单

## 目标

将本项目改造成一个仅供员工和内部系统使用的 AI 网关，优先级如下：

1. 默认安全
2. 统一模型接入
3. 可审计、可控成本
4. 易于运维、易于扩展

本文档基于当前仓库结构编写，重点是渐进式定制改造，而不是整体推倒重写。

---

## 产品定位

内部版应定位为：

- 统一的大模型网关
- 内部模型路由与策略控制层
- 成本与审计平台

不应定位为：

- 面向公网的充值平台
- 面向外部用户的通用 SaaS 控制台
- 向所有人暴露全部上游供应商能力的“模型市场”

---

## 改造原则

1. 保留 relay 核心，简化外围产品壳层。
2. 优先采用内部身份体系和内部权限体系，而不是公网注册登录。
3. 对外暴露内部模型别名，而不是直接暴露真实上游模型名。
4. 审计要保留足够元数据，但默认不要落敏感原始内容。
5. 优先通过配置和策略控制行为，再考虑新增 UI。

---

## 必须保留

这些是项目的核心资产，应继续作为内部版主干保留：

- `router/relay-router.go`、`controller/relay.go`、`relay/` 中的中转路由与多供应商兼容能力
- `controller/channel*.go`、`service/channel*.go`、`model/channel*.go` 中的渠道管理与渠道选择
- `controller/token.go`、`service/quota.go`、`model/token.go` 中的 token 和额度机制
- `controller/log.go`、`model/log.go`、`model/usedata.go` 中的日志与用量统计
- `controller/option.go`、`model/option.go`、`setting/` 中的配置系统
- `web/src/pages/*` 中的管理后台外壳

---

## 必须禁用或移除

这些模块对内部专用网关通常价值不高，甚至会带来额外风险：

### 公网增长与站点运营功能

- 公开注册与开放式自助登录流程
- 将首页营销内容作为主入口
- 面向公网的充值、公告等站点运营流程

相关文件：

- `controller/user.go`
- `controller/misc.go`
- `web/src/pages/Home`
- `web/src/components/auth/*`

### 对外商业化计费流程

- 充值
- 订阅购买
- 兑换码
- Stripe / EPay / Creem / Waffo 回调

相关文件：

- `controller/topup*.go`
- `controller/subscription*.go`
- `controller/redemption.go`
- `service/epay.go`
- `service/webhook.go`
- `web/src/pages/TopUp`
- `web/src/pages/Subscription`
- `web/src/pages/Redemption`

### 不必要的第三方登录方式

如果目标是企业单点登录，应只保留公司自己的 SSO 路径，其余默认移除：

- GitHub
- Discord
- Telegram
- WeChat
- LinuxDO
- 其他非必要的公开自定义 OAuth

相关文件：

- `oauth/*`
- `controller/oauth.go`
- `controller/custom_oauth.go`
- `controller/telegram.go`
- `controller/wechat.go`

---

## 必须加强

### 1. 企业认证体系

推荐目标：

- 以 OIDC / 企业 IdP 作为主登录方式
- 可选支持内部系统间调用所用的服务 token 认证

建议工作：

- 将 OIDC 设为默认认证入口
- 默认关闭自注册
- 将 IdP 用户组映射到内部角色和分组
- 支持首次登录自动建号

关键文件：

- `middleware/auth.go`
- `oauth/oidc.go`
- `controller/oauth.go`
- `model/user.go`

### 2. 内部权限模型

推荐角色模型：

- 平台 root 管理员
- 平台管理员
- 部门管理员
- 普通内部用户
- 服务账号

推荐控制维度：

- 用户角色
- 部门或项目分组
- Token 作用域
- 模型访问策略

关键文件：

- `middleware/auth.go`
- `controller/user.go`
- `controller/group.go`
- `model/user.go`
- `model/token.go`

### 3. 模型别名与策略层

不要将真实上游模型直接暴露给大多数用户。建议增加一层稳定的内部模型抽象，例如：

- `chat-default`
- `chat-fast`
- `reasoning-pro`
- `embedding-default`
- `image-default`

每个别名应映射到：

- 一个或多个上游渠道
- 允许访问的分组
- 价格 / 权重 / 优先级策略
- 可选的安全策略

关键文件：

- `controller/model.go`
- `controller/model_meta.go`
- `service/channel_select.go`
- `model/model.go`
- `model/ability.go`
- `relay/channel/*`

### 4. 成本控制与用量治理

推荐控制项：

- 按用户额度
- 按分组额度
- 按模型限流
- 每日 / 每月预算上限
- 异常流量告警

关键文件：

- `service/quota.go`
- `service/billing.go`
- `middleware/model-rate-limit.go`
- `controller/log.go`
- `model/usedata.go`

### 5. 审计与合规

推荐行为：

- 默认存储请求元数据
- 默认不存储原始 prompt / response
- 支持对敏感字段做脱敏或哈希
- 记录“谁”通过“哪个 token”调用了“哪个模型”，消耗了多少额度，走了哪个渠道

关键文件：

- `controller/log.go`
- `model/log.go`
- `middleware/logger.go`
- `controller/relay.go`

---

## 建议新增模块

以下模块对内部版的价值最高：

### 1. 服务账号管理

目的：

- 给内部系统分配独立凭证
- 将“机器调用者”和“人类用户”清晰分离

建议新增：

- 服务账号实体
- 带作用域的 token 签发机制
- 过期与轮换策略

### 2. 内部模型目录

目的：

- 发布企业批准可用的模型
- 隐藏实验性或不安全的上游模型

建议新增：

- 模型别名表
- 别名管理 UI
- 分组到模型的授权矩阵

### 3. 策略引擎

目的：

- 集中化管理路由与权限规则

建议支持的策略维度：

- 用户组
- 请求类型
- 模型别名
- 数据分级
- 区域或部署要求

### 4. 告警与运维看板

目的：

- 让一个小型平台团队也能稳定运营这套网关

建议监控指标：

- QPS
- 成功率
- 平均延迟
- 按供应商统计的错误率
- 按分组统计的成本
- Top 调用方

---

## UI 改造建议

当前控制台功能很多，但内部使用场景建议做减法。

### 建议保留

- 渠道管理
- Token 管理
- 用户管理
- 日志与用量看板
- 设置
- Playground

### 建议隐藏或移除

- 充值
- 订阅购买
- 公网营销首页模块
- 面向公网的兑换码流程

### 建议新增

- 内部模型目录页面
- 服务账号页面
- 预算与额度策略页面
- 审计检索页面

前端主要改动点：

- `web/src/App.jsx`
- `web/src/pages/Channel`
- `web/src/pages/Token`
- `web/src/pages/User`
- `web/src/pages/Log`
- `web/src/pages/Setting`

---

## 当前代码改造任务地图

可以将这一节直接作为任务拆分参考。

### 第一阶段：内部化访问入口

- 关闭公开注册和公网站点流程
- 启用 OIDC 优先登录
- 删除或隐藏充值 / 订阅 / 兑换相关 UI 与 API
- 将部署限制在内网环境

### 第二阶段：构建内部治理能力

- 增加内部模型别名
- 增加基于分组的模型访问权限
- 增加服务账号
- 增强审计友好的日志信息

### 第三阶段：提升运维能力

- 增加看板和告警
- 增加渠道健康检查与故障切换策略
- 增加成本控制与日 / 月预算

### 第四阶段：长期演进

- 增加 prompt 策略
- 增加 response 审核策略
- 增加数据驻留路由
- 增加适合内部高频读取场景的请求缓存

---

## 首批建议实施的 10 个工程任务

1. 从前端路由中隐藏 `TopUp`、`Subscription`、`Redemption` 页面。
2. 在 `/api/user/*` 中关闭公开注册和非 SSO 登录路径。
3. 登录入口和 provider registry 中只保留 OIDC。
4. 新增 `service_account` 模型和后台 CRUD 页面。
5. 新增 `internal_model_alias` 存储和后台 CRUD 页面。
6. 在 relay 主链路中增加“别名 -> 上游模型 / 渠道”的映射。
7. 在请求分发前增加基于分组的 allowlist 检查。
8. 增加 prompt 元数据的脱敏审计日志。
9. 增加按用户和分组查看预算 / 额度的页面。
10. 增加仅适用于内网部署的运行配置模板。

---

## 推荐交付策略

不要一次性大改到底。

建议顺序：

1. 移除外部 / 公网功能
2. 稳定内部认证体系
3. 增加别名与策略层
4. 增加服务账号与治理能力
5. 最后补运维看板与细节打磨

这个顺序可以让你尽快获得一个“可用的内部网关”，同时保住当前项目最有价值的 relay 核心能力。
