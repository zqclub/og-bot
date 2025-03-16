# 0g 测试网自动交易工具

一个专为 0g 测试网设计的自动化代币交换脚本。

## 功能

- 支持多账户交易
- 支持代理配置
- USDT 与 ETH 双向交换
- USDT 与 BTC 双向交换

## 前提条件

- Node.js [下载](https://nodejs.org/en/download)
- 0g 测试网 RPC: `https://evmrpc-testnet.0g.ai`（默认）
- 0g 测试网代币 [获取](https://hub.0g.ai/portfolio/token)
- 0g 水龙头 [领取](https://hub.0g.ai/faucet)
- 代理（可选）

## 安装步骤

1. 克隆仓库：
   ```sh
   git clone https://github.com/zqclub/og-bot.git
   cd og-bot
   ```
安装依赖并编译：

```sh
npm install
npm run build
```
可选）创建 proxy.txt 文件，添加代理地址（每行一个）：
```sh
http://user:pass@host:port
http://host:port
socks://user:pass@host:port
```
创建 privatekey.txt 文件，添加私钥（每行一个）：
```sh
0x私钥1
0x私钥2
```
## 使用方法
运行脚本：
```sh
npm run start
```
（可选）开发模式（支持热重载）：
```sh
npm run dev:watch
```
## 注意事项
请确保账户有足够的测试网代币和 Gas。

代理配置可选，若无代理将使用本地 IP。

## 免责声明

本工具仅用于教育目的，使用风险自担。


