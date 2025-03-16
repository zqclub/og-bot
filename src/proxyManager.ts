import axios from "axios";
import chalk from "chalk";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { logInfo } from "./logUtils";


let proxies: string[] = [];


export function initProxies(): boolean {
  try {
    const data = fs.readFileSync("proxy.txt", "utf8");
    proxies = data.split("\n").filter((line) => line.trim()).map((p) => p.trim());
    if (proxies.length === 0) throw new Error("代理列表为空");
    console.log(chalk.green(`✓ 已加载 ${proxies.length} 个代理`));
    return true;
  } catch (err) {
    console.error(chalk.red(`[!] 加载代理失败: ${err.message}`));
    return false;
  }
}


export function setupProxyAgent(proxy: string, index: number, total: number) {
  try {
    return proxy.startsWith("socks") ? new SocksProxyAgent(proxy) : new HttpsProxyAgent(proxy);
  } catch (err) {
    logInfo(index, total, `代理创建失败: ${err.message}`, "error");
    return null;
  }
}


export async function fetchRandomProxy(index: number, total: number): Promise<string | null> {
  if (proxies.length === 0) {
    const res = await axios.get("https://api.ipify.org?format=json", { timeout: 5000 });
    logInfo(index, total, `无代理，使用默认 IP: ${res.data.ip}`, "debug");
    return null;
  }

  let attempts = 0;
  while (attempts < proxies.length) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = setupProxyAgent(proxy, index, total);
    if (!agent) continue;

    try {
      const res = await axios.get("https://api.ipify.org?format=json", { httpsAgent: agent, timeout: 5000 });
      logInfo(index, total, `使用代理 IP: ${res.data.ip}`, "success");
      return proxy;
    } catch (err) {
      logInfo(index, total, `代理 ${proxy} 无效: ${err.message}`, "error");
      attempts++;
    }
  }
  logInfo(index, total, "所有代理无效，使用默认 IP", "warning");
  return null;
}
