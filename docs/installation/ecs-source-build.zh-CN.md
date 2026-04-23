# 阿里云 ECS 源码构建部署指南

本文档面向一台全新的阿里云 ECS，使用仓库源码直接构建当前代码版本，不依赖官方预构建镜像。

## 适用场景

- 你希望部署自己的 fork 或某个特定 commit。
- 你希望把仓库里的本地改动一起上线。
- 你当前先走单机部署，数据库使用 SQLite。

本文档默认示例：

- ECS 公网 IP：`8.160.190.198`
- 仓库地址：`https://github.com/liangyucai47-creator/new-api.git`
- 首次上线方式：HTTP + Nginx + SQLite
- 后续升级方式：域名 + Let's Encrypt HTTPS

## 仓库内置部署资产

- Compose 文件：[docker-compose.ecs.yml](/D:/project/new-api/docker-compose.ecs.yml)
- ECS 环境模板：[deploy/ecs/.env.ecs.example](/D:/project/new-api/deploy/ecs/.env.ecs.example)
- HTTP Nginx 模板：[deploy/ecs/nginx/http.conf.template](/D:/project/new-api/deploy/ecs/nginx/http.conf.template)
- HTTPS Nginx 模板：[deploy/ecs/nginx/https.conf.template](/D:/project/new-api/deploy/ecs/nginx/https.conf.template)
- 一键启动脚本：[deploy/ecs/scripts/bootstrap-ecs.sh](/D:/project/new-api/deploy/ecs/scripts/bootstrap-ecs.sh)
- 证书申请脚本：[deploy/ecs/scripts/request-cert.sh](/D:/project/new-api/deploy/ecs/scripts/request-cert.sh)

## 1. 本地先推送当前代码

在你的开发机上：

```bash
cd /path/to/new-api
git push fork main
```

如果你希望部署某个固定 commit，也可以在 ECS 上 `git checkout <commit>`。

## 2. 配置阿里云安全组

至少放行：

- `22/tcp`：SSH
- `80/tcp`：Nginx HTTP
- `443/tcp`：Nginx HTTPS
- `5041/tcp`：直连应用端口，便于排障和灰度验证

## 3. 登录 ECS 并拉取代码

```bash
ssh root@8.160.190.198

mkdir -p /opt/new-api
cd /opt/new-api
git clone https://github.com/liangyucai47-creator/new-api.git .
git checkout main
```

## 4. 复制并编辑 ECS 环境文件

```bash
cp deploy/ecs/.env.ecs.example deploy/ecs/.env.ecs
```

首次用公网 IP 启动时，推荐保留这些值：

```dotenv
PUBLIC_HOST=8.160.190.198
SERVER_ADDRESS=http://8.160.190.198
NGINX_TEMPLATE=http.conf.template
APP_PUBLIC_PORT=5041
```

然后把 `SESSION_SECRET` 改成随机长字符串。

## 5. 启动当前代码

最省事的方式：

```bash
chmod +x deploy/ecs/scripts/bootstrap-ecs.sh
sudo deploy/ecs/scripts/bootstrap-ecs.sh
```

脚本会做这些事：

- 如未安装则安装 Docker
- 创建 `data`、`logs` 和证书目录
- 如无 `deploy/ecs/.env.ecs` 则从模板复制
- 如 `SESSION_SECRET` 仍是占位值则自动生成随机值
- 基于当前源码执行 `docker compose up -d --build`

你也可以手动执行：

```bash
docker compose --env-file deploy/ecs/.env.ecs -f docker-compose.ecs.yml up -d --build
```

## 6. 验证

```bash
docker compose --env-file deploy/ecs/.env.ecs -f docker-compose.ecs.yml ps
docker compose --env-file deploy/ecs/.env.ecs -f docker-compose.ecs.yml logs -f new-api
curl http://127.0.0.1:5041/api/status
curl -I http://127.0.0.1
```

外部访问：

- Nginx 入口：`http://8.160.190.198`
- 直连应用：`http://8.160.190.198:5041`

## 7. 首次登录

默认 root 账户由应用自动创建：

- 用户名：`root`
- 密码：`123456`

首次进入后台后请立即修改密码。

## 8. 切换到域名和 HTTPS

前提：

- 域名 A 记录已经指向 `8.160.190.198`
- `80` 和 `443` 已在安全组放行

先编辑 `deploy/ecs/.env.ecs`：

```dotenv
PUBLIC_HOST=api.example.com
LETSENCRYPT_EMAIL=you@example.com
```

然后申请证书并自动切换到 HTTPS 模板：

```bash
chmod +x deploy/ecs/scripts/request-cert.sh
deploy/ecs/scripts/request-cert.sh
```

脚本会做这些事：

- 使用 ACME webroot 方式申请证书
- 把 `NGINX_TEMPLATE` 切换到 `https.conf.template`
- 把 `SERVER_ADDRESS` 切换到 `https://<你的域名>`
- 启动证书自动续期容器

切换完成后访问：

- `https://api.example.com`

## 9. 更新到新的代码版本

```bash
cd /opt/new-api
git fetch --all
git checkout main
git pull --ff-only fork main
docker compose --env-file deploy/ecs/.env.ecs -f docker-compose.ecs.yml up -d --build
```

## 10. 常用排障命令

```bash
docker compose --env-file deploy/ecs/.env.ecs -f docker-compose.ecs.yml logs -f new-api
docker compose --env-file deploy/ecs/.env.ecs -f docker-compose.ecs.yml logs -f nginx
docker compose --env-file deploy/ecs/.env.ecs -f docker-compose.ecs.yml restart new-api
docker compose --env-file deploy/ecs/.env.ecs -f docker-compose.ecs.yml restart nginx
curl http://127.0.0.1:5041/api/status
curl -I http://127.0.0.1
```

## 11. 什么时候再上 PostgreSQL / Redis

当你出现这些需求时再拆出来：

- 多实例部署
- 高并发写入
- 更稳的持久化和备份策略
- 渠道路由、缓存和任务量明显上升

对第一版来说，单机 ECS + SQLite 是最简单也最容易维护的起点。
