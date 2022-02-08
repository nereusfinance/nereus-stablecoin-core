module.exports = async function (hre) {
    const signers = await hre.ethers.getSigners()
    const deployer = signers[0]
    const funder = signers[1]

    const chainId = await hre.getChainId()

    console.log("Chain:", chainId)
    console.log("Balance:", (await funder.getBalance()).div("1000000000000000000").toString())

    const deployerBalance = await deployer.getBalance()

    let gasPrice = await funder.provider.getGasPrice()
    const gasLimit = 5000000

    console.log("Gasprice:", gasPrice.toString())
    console.log("Deployer balance", deployerBalance.toString(), deployer.address)
    console.log("Needed", gasPrice.mul(gasLimit).toString(), gasPrice.toString(), gasLimit.toString(), deployerBalance.lt(gasPrice.mul(gasLimit)))

    let tx;

    console.log("Deploying NUSD contract")
    tx = await hre.deployments.deploy("NereusStableCoin", {
        from: deployer.address,
        args: [],
        log: true,
        deterministicDeployment: false,
        gasLimit: 2500000,
        gasPrice: gasPrice,
    })
}
