import chalk from "chalk";
import fs from "fs";
import { TradeBot } from "./tradeBot";
import { fetchRandomProxy, initProxies } from "./proxyManager";
import { logInfo, askQuestion } from "./logUtils";

async function startBot(): Promise<void> {
  console.log(
    chalk.cyan(`
┌──────────────────────────────┐
│   0g 测试网交易助手          │
├──────────────────────────────┤
│   █████╗ ██████╗ ██████╗     │
│  ██╔══██╗██╔══██╗██╔════╝    │
│  ███████║██████╔╝██║  ███╗   │
│  ██╔══██║██╔══██╗██║   ██║   │
│  ██║  ██║██║  ██║╚██████╔╝   │
│  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝    │
├──────────────────────────────┤
│ X: https://x.com/qklxsqf     │
└──────────────────────────────┘
    `)
  );

  const dailyTxCount = parseInt(await askQuestion(chalk.yellow("请输入每日交易次数：")));
  if (isNaN(dailyTxCount) || dailyTxCount <= 0) {
    logInfo(null, null, "交易次数无效，请输入正整数", "error");
    return;
  }

  const keys = fs.readFileSync("privatekey.txt", "utf8").split("\n").filter(Boolean);
  const totalAccounts = keys.length;
  if (totalAccounts === 0) {
    logInfo(null, null, "未找到私钥，请检查 privatekey.txt", "error");
    return;
  }

  const proxiesAvailable = initProxies();
  if (!proxiesAvailable) {
    logInfo(null, null, "未加载代理，将使用本地 IP", "debug");
  }

  let successCount = 0;
  for (let i = 0; i < totalAccounts; i++) {
    console.log(chalk.white("═".repeat(80)));
    logInfo(i + 1, totalAccounts, "开始处理交易", "debug");
    const key = keys[i];
    const proxy = await fetchRandomProxy(i + 1, totalAccounts);
    const bot = new TradeBot(key, proxy, i + 1, totalAccounts);

    try {
      let txDone = 0;
      while (txDone < dailyTxCount) {
        const action = Math.floor(Math.random() * 3);
        logInfo(i + 1, totalAccounts, `交易进度: ${txDone + 1}/${dailyTxCount}`, "debug");
        if (action === 0) {
          await bot.executeUsdtToBtcSwap();
        } else if (action === 1) {
          await bot.executeUsdtToEthSwap();
        }
        txDone++;
      }
      successCount++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logInfo(i + 1, totalAccounts, `错误: ${errorMessage}`, "error");
    }
  }

  console.log(chalk.white("═".repeat(80)));
  logInfo(null, null, `完成: ${successCount}/${totalAccounts} 个账户成功`, "success");
  logInfo(null, null, "休眠 24 小时后重新开始...", "success");

  await new Promise((resolve) => setTimeout(resolve, 24 * 60 * 60 * 1000));
  startBot();
}

startBot().catch((err) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error(chalk.red("程序出错:"), errorMessage);
  process.exit(1);
});
