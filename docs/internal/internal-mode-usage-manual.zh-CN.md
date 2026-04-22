# 内部模式使用手册

## 适用范围

本文档适用于当前仓库的“内部模式基础版”部署方式。

当前版本特点：

- 使用统一环境变量 `INTERNAL_MODE=true`
- 保留模型中转、渠道管理、Token 管理、日志与后台管理能力
- 关闭公网自助注册、找回密码、充值、订阅、兑换码等入口

---

## 一、启动前准备

确保以下条件已经满足：

- 仓库路径：`D:\project\new-api`
- Go 运行时存在：`D:\project\tools\go\bin\go.exe`
- 前端依赖已经安装在 `D:\project\new-api\web\node_modules`
- 根目录 `.env` 已包含：

```env
PORT=3001
TZ=Asia/Shanghai
INTERNAL_MODE=true
```

---

## 二、启动方式

### 方式 1：前台启动

适合本地开发、看实时日志。

```powershell
cd D:\project\new-api
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

说明：

- 会先构建前端 `web/dist`
- 再构建后端 `new-api.exe`
- 最后以前台方式启动服务

### 方式 2：后台启动

适合本机长期运行。

```powershell
cd D:\project\new-api
D:\project\tools\go\bin\go.exe build -o .\new-api.exe .
Start-Process -FilePath .\new-api.exe -WorkingDirectory D:\project\new-api -ArgumentList '--log-dir','D:\project\new-api\logs'
```

---

## 三、访问地址

默认访问地址：

- 首页：`http://127.0.0.1:3001/`
- 控制台：`http://127.0.0.1:3001/console`
- 状态接口：`http://127.0.0.1:3001/api/status`

内部模式开启后，首页会自动跳转到控制台。

---

## 四、内部模式下的行为变化

开启 `INTERNAL_MODE=true` 后：

- 首页营销入口隐藏
- 定价页隐藏
- 注册入口隐藏
- 找回密码入口隐藏
- 充值入口隐藏
- 订阅入口隐藏
- 兑换码入口隐藏

同时后端接口也会被硬性禁用：

- `/api/verification`
- `/api/reset_password`
- `/api/user/reset`
- `/api/user/register`
- 支付回调接口
- 用户充值与支付接口
- 订阅接口
- 兑换码管理接口

这些接口会返回 `403`。

---

## 五、日常使用说明

### 1. 管理员登录

当前阶段仍沿用现有登录体系：

- 已有管理员账号可直接登录
- 密码登录仍可用
- 自助注册已关闭

建议后续第二阶段升级为企业 SSO / OIDC-only。

### 2. 主要保留功能

建议优先使用这些模块：

- 渠道管理
- Token 管理
- 用户管理
- 日志查询
- 系统设置
- Playground

### 3. 典型使用流程

1. 管理员登录控制台
2. 配置上游渠道
3. 创建内部 Token
4. 将 Token 发给内部系统或内部开发者
5. 通过 OpenAI 兼容接口访问中转服务
6. 在日志中查看调用情况和消耗情况

---

## 六、验证内部模式是否生效

### 检查状态接口

访问：

```text
http://127.0.0.1:3001/api/status
```

确认返回的 `data.internal_mode_enabled` 为 `true`。

### 检查受限接口

例如访问：

```text
http://127.0.0.1:3001/api/reset_password
```

应返回 `403`。

---

## 七、常见问题

### 1. 为什么首页进不去？

这是正常行为。内部模式下首页会自动导向 `/console`，不再作为公网站点首页使用。

### 2. 为什么没有注册按钮？

这是正常行为。内部模式默认关闭自助注册。

### 3. 为什么 `bun run build` 报错？

如果本机 `web/node_modules` 的 Bun remap 损坏，可能会出现 Bun 无法启动脚本的问题。此时可以：

- 先执行 `bun install --force`
- 或直接用 Node 运行 `vite build`

### 4. 如何关闭内部模式？

将 `.env` 中的：

```env
INTERNAL_MODE=true
```

改为：

```env
INTERNAL_MODE=false
```

然后重启服务。

---

## 八、建议的下一步

当前这版已经适合做“内部使用的 API 中转站基础版”。建议后续按下面顺序继续演进：

1. 接入企业 SSO / OIDC-only
2. 增加内部模型别名层
3. 增加服务账号
4. 增加按组/按模型的权限和预算策略
5. 增加审计与告警看板
