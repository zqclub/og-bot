import { ethers } from "ethers";
import { logInfo } from "./logUtils";
import { setupProxyAgent } from "./proxyManager";
import { USDT_ABI, ETH_ABI, BTC_ABI, SWAP_ROUTER_ABI } from "./contractABIs";


const RPC_URLS = ["https://evmrpc-testnet.0g.ai"];

export class TradeBot {
  private key: string;
  private walletAddress: string;
  private rpcIndex: number;
  private provider: ethers.JsonRpcProvider;
  private swapRouterAddr = "0xD86b764618c6E3C078845BE3c3fCe50CE9535Da7";
  private usdtAddr = "0x9A87C2412d500343c073E5Ae5394E3bE3874F76b";
  private ethAddr = "0xce830D0905e0f7A9b300401729761579c5FB6bd6";
  private btcAddr = "0x1e0d871472973c562650e991ed8006549f8cbefc";
  private proxy: string | null;
  private accountNum: number;
  private totalAccounts: number;

  constructor(key: string, proxy: string | null, accountNum: number, totalAccounts: number) {
    this.key = key;
    this.walletAddress = new ethers.Wallet(key).address;
    this.rpcIndex = 0;
    this.proxy = proxy;
    this.accountNum = accountNum;
    this.totalAccounts = totalAccounts;
    this.provider = this.initProvider();
  }


  private initProvider(): ethers.JsonRpcProvider {
    const rpc = RPC_URLS[this.rpcIndex];
    if (this.proxy) {
      ethers.FetchRequest.registerGetUrl(setupProxyAgent(this.proxy, this.accountNum, this.totalAccounts));
    }
    return new ethers.JsonRpcProvider(rpc);
  }


  private changeRpc() {
    this.rpcIndex = (this.rpcIndex + 1) % RPC_URLS.length;
    logInfo(this.accountNum, this.totalAccounts, `切换 RPC: ${RPC_URLS[this.rpcIndex]}`, "success");
    this.provider = this.initProvider();
  }

 
  private handleError(err: any): boolean {
    const msg = err.message || err.toString();
    if (msg.toLowerCase().includes("mempool is full")) {
      logInfo(this.accountNum, this.totalAccounts, "内存池已满，重试中...", "warning");
      this.changeRpc();
      return true;
    }
    return false;
  }

 
  private async swapTokens(fromAddr: string, toAddr: string, amount: bigint, fromAbi: any) {
    const wallet = new ethers.Wallet(this.key, this.provider);
    const tokenContract = new ethers.Contract(fromAddr, fromAbi, wallet);
    const routerContract = new ethers.Contract(this.swapRouterAddr, SWAP_ROUTER_ABI, wallet);

    const balance = await tokenContract.balanceOf(this.walletAddress);
    if (balance < amount) throw new Error(`余额不足: ${ethers.formatUnits(balance, 18)}`);

    const nonce = await this.provider.getTransactionCount(this.walletAddress, "pending");
    logInfo(this.accountNum, this.totalAccounts, `批准 nonce: ${nonce}`, "debug");
    const approveTx = await tokenContract.approve(this.swapRouterAddr, amount, {
      nonce,
      gasLimit: 100000,
      gasPrice: await this.provider.getFeeData().then((fee) => fee.gasPrice),
    });
    await approveTx.wait();
    await new Promise((r) => setTimeout(r, 5000));

    const swapNonce = await this.provider.getTransactionCount(this.walletAddress, "pending");
    logInfo(this.accountNum, this.totalAccounts, `交换 nonce: ${swapNonce}`, "debug");
    const deadline = Math.floor(Date.now() / 1000) + 300;
    const gasEstimate = await routerContract.exactInputSingle.estimateGas(
      { tokenIn: fromAddr, tokenOut: toAddr, fee: 3000, recipient: this.walletAddress, deadline, amountIn: amount, amountOutMinimum: 0, sqrtPriceLimitX96: 0 },
      { from: this.walletAddress }
    );
    const swapTx = await routerContract.exactInputSingle(
      { tokenIn: fromAddr, tokenOut: toAddr, fee: 3000, recipient: this.walletAddress, deadline, amountIn: amount, amountOutMinimum: 0, sqrtPriceLimitX96: 0 },
      { nonce: swapNonce, gasLimit: gasEstimate * 12n / 10n, gasPrice: await this.provider.getFeeData().then((fee) => fee.gasPrice) }
    );
    const receipt = await swapTx.wait();
    return { success: true, txHash: receipt.hash, amount: ethers.formatUnits(amount, 18) };
  }


  async executeUsdtToEthSwap() {
    const amount = ethers.parseUnits((Math.random() * (2 - 0.5) + 0.5).toFixed(2), 18);
    const startTime = new Date().toLocaleString("zh-CN");
    logInfo(this.accountNum, this.totalAccounts, `USDT -> ETH 开始于 ${startTime}`, "success");
    try {
      const result = await this.swapTokens(this.usdtAddr, this.ethAddr, amount, USDT_ABI);
      logInfo(this.accountNum, this.totalAccounts, `状态: 成功`, "success");
      logInfo(this.accountNum, this.totalAccounts, `交易哈希: ${result.txHash}`, "success");
      logInfo(this.accountNum, this.totalAccounts, `金额: ${result.amount} USDT`, "success");
      logInfo(this.accountNum, this.totalAccounts, `查看: https://chainscan-newton.0g.ai/tx/${result.txHash}`, "success");

      await new Promise((r) => setTimeout(r, 5000));
      const backAmount = ethers.parseUnits((Math.random() * (0.0005 - 0.0002) + 0.0002).toFixed(6), 18);
      const backResult = await this.swapTokens(this.ethAddr, this.usdtAddr, backAmount, ETH_ABI);
      logInfo(this.accountNum, this.totalAccounts, `ETH -> USDT 状态: 成功`, "success");
      logInfo(this.accountNum, this.totalAccounts, `交易哈希: ${backResult.txHash}`, "success");
      logInfo(this.accountNum, this.totalAccounts, `金额: ${backResult.amount} ETH`, "success");
      logInfo(this.accountNum, this.totalAccounts, `查看: https://chainscan-newton.0g.ai/tx/${backResult.txHash}`, "success");
    } catch (err) {
      if (this.handleError(err)) {
        await this.executeUsdtToEthSwap();
      } else {
        logInfo(this.accountNum, this.totalAccounts, `交易失败: ${err.message}`, "error");
      }
    }
  }


  async executeUsdtToBtcSwap() {
    const amount = ethers.parseUnits((Math.random() * (2 - 0.5) + 0.5).toFixed(2), 18);
    const startTime = new Date().toLocaleString("zh-CN");
    logInfo(this.accountNum, this.totalAccounts, `USDT -> BTC 开始于 ${startTime}`, "success");
    try {
      const result = await this.swapTokens(this.usdtAddr, this.btcAddr, amount, USDT_ABI);
      logInfo(this.accountNum, this.totalAccounts, `状态: 成功`, "success");
      logInfo(this.accountNum, this.totalAccounts, `交易哈希: ${result.txHash}`, "success");
      logInfo(this.accountNum, this.totalAccounts, `金额: ${result.amount} USDT`, "success");
      logInfo(this.accountNum, this.totalAccounts, `查看: https://chainscan-newton.0g.ai/tx/${result.txHash}`, "success");

      await new Promise((r) => setTimeout(r, 5000));
      const backAmount = ethers.parseUnits((Math.random() * (0.0005 - 0.0002) + 0.0002).toFixed(6), 18);
      const backResult = await this.swapTokens(this.btcAddr, this.usdtAddr, backAmount, BTC_ABI);
      logInfo(this.accountNum, this.totalAccounts, `BTC -> USDT 状态: 成功`, "success");
      logInfo(this.accountNum, this.totalAccounts, `交易哈希: ${backResult.txHash}`, "success");
      logInfo(this.accountNum, this.totalAccounts, `金额: ${backResult.amount} BTC`, "success");
      logInfo(this.accountNum, this.totalAccounts, `查看: https://chainscan-newton.0g.ai/tx/${backResult.txHash}`, "success");
    } catch (err) {
      if (this.handleError(err)) {
        await this.executeUsdtToBtcSwap();
      } else {
        logInfo(this.accountNum, this.totalAccounts, `交易失败: ${err.message}`, "error");
      }
    }
  }
}
