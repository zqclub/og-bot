import chalk from "chalk";
import fs from "fs";
import { TradeBot } from "./tradeBot";
import { fetchRandomProxy, initProxies } from "./proxyManager";
import { logInfo, askQuestion } from "./logUtils";

/**
 * 主程序启动函数，初始化并运行交易机器人
 */
async function startBot(): Promise<void> {
  // 显示欢迎横幅
  console.log(
    chalk.cyan(`
┌──────────────────────────────┐
│   0g 测试网交易助手          │
├──────────────────────────────┤
│   █████╗ ██████╗ ██████╗    │
│  ██╔══██╗██╔══██╗██╔════╝   │
│  ███████║██████╔╝██║  ███╗  │
│  ██╔══██║██╔══██╗██║   ██║  │
│  ██║  ██║██║  ██║╚██████╔╝  │
│  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝   │
├──────────────────────────────┤
│  X:https://x.com/qklxsqf     │
└──────────────────────────────┘
    `)
  );

  // 获取用户输入的每日交易次数
  const dailyTxCount = parseInt(await askQuestion(chalk.yellow("请输入每日交易次数：")));
  if (isNaN(dailyTxCount) || dailyTxCount <= 0) {
    logInfo(null, null, "交易次数无效，请输入正整数", "error");
    return;
  }

  // 读取私钥文件
  const keys = fs.readFileSync("privatekey.txt", "utf8").split("\n").filter(Boolean);
  const totalAccounts = keys.length;
  if (totalAccounts === 0) {
    logInfo(null, null, "未找到私钥，请检查 privatekey.txt", "error");
    return;
  }

  // 初始化代理
  const proxiesAvailable = initProxies();
  if (!proxiesAvailable) {
    logInfo(null, null, "未加载代理，将使用本地 IP", "debug");
  }

  let successCount = 0;
  for (let i = 0; i < totalAccounts; i++) {
    console.log(chalk.white("═".repeat(80))); // 分隔线
    logInfo(i + 1, totalAccounts, "开始处理交易", "debug");
    const key = keys[i];
    const proxy = await fetchRandomProxy(i + 1, totalAccounts);
    const bot = new TradeBot(key, proxy, i + 1, totalAccounts);

    try {
      let txDone = 0;
      while (txDone < dailyTxCount) {
        const action = Math.floor(Math.random() * 3); // 随机选择 0, 1, 2
        logInfo(i + 1, totalAccounts, `交易进度: ${txDone + 1}/${dailyTxCount}`, "debug");
        if (action === 0) {
          await bot.executeUsdtToBtcSwap();
        } else if (action === 1) {
          await bot.executeUsdtToEthSwap();
        } // 2 为默认，无操作
        txDone++;
      }
      successCount++;
    } catch (err) {
      logInfo(i + 1, totalAccounts, `错误: ${err.message}`, "error");
    }
  }

  console.log(chalk.white("═".repeat(80))); // 分隔线
  logInfo(null, null, `完成: ${successCount}/${totalAccounts} 个账户成功`, "success");
  logInfo(null, null, "休眠 24 小时后重新开始...", "success");

  // 休眠 24 小时后重启
  await new Promise((resolve) => setTimeout(resolve, 24 * 60 * 60 * 1000));
  startBot();
}

// 启动程序并处理全局错误
startBot().catch((err) => {
  console.error(chalk.red("程序出错:"), err);
  process.exit(1);
});
