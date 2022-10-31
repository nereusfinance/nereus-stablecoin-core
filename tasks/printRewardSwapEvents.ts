import { task } from "hardhat/config"

task("print-reward-swap-events")
  .addParam("tx", "Transaction hash")
  .setAction(async ({ tx: txHash }, { ethers }) => {
    const swapInterface = new ethers.utils.Interface([
      "event Swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, address caller)",
    ])
    const swapTopic = swapInterface.getEventTopic("Swap")
    const txReceipt = await ethers.provider.getTransactionReceipt(txHash)
    const events = txReceipt.logs.filter((log) => log.topics[0] === swapTopic)

    const parsed = events.map((e) => {
      const parsedLog = swapInterface.parseLog(e).args

      return {
        tokenIn: parsedLog.tokenIn,
        tokenOut: parsedLog.tokenOut,
        amountIn: parsedLog.amountIn.toString(),
        amountOut: parsedLog.amountOut.toString(),
        caller: parsedLog.caller,
      }
    })

    console.log("swap events", parsed)
  })
