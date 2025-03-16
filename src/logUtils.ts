import chalk from "chalk";
import * as readline from "readline";


const input = readline.createInterface({ input: process.stdin, output: process.stdout });


export const askQuestion = (query: string): Promise<string> =>
  new Promise((resolve) => input.question(query, (ans) => resolve(ans)));

export type LogType = "success" | "error" | "warning" | "debug" | "info";


export function logInfo(account: number | null, total: number | null, msg: string, type: LogType = "info") {
  const time = new Date().toLocaleString("zh-CN", { hour12: false });
  const accountPrefix = account && total ? chalk.gray(`[${account}/${total}]`) : "";
  const timePrefix = chalk.dim(`[${time}]`);
  let styledMsg: string;

  switch (type) {
    case "success":
      styledMsg = `${chalk.green("✔")} ${chalk.greenBright(msg)}`;
      break;
    case "error":
      styledMsg = `${chalk.red("✘")} ${chalk.redBright(msg)}`;
      break;
    case "warning":
      styledMsg = `${chalk.yellow("⚠")} ${chalk.yellowBright(msg)}`;
      break;
    case "debug":
      styledMsg = `${chalk.blue("➤")} ${chalk.blueBright(msg)}`;
      break;
    default:
      styledMsg = `${chalk.cyan("ℹ")} ${chalk.cyanBright(msg)}`;
  }

  console.log(`${timePrefix} ${accountPrefix} ${styledMsg}`);
}

process.on("exit", () => input.close());
