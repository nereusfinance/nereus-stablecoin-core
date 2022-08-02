const ganache = require("ganache");

const options = {
  fork: {
    url: `https://api.avax.network/ext/bc/C/rpc`,
    blockNumber: 16580532,
  },
};
const server = ganache.server(options);
const PORT = 8080;
server.listen(PORT, async (err) => {
  if (err) throw err;

  console.log(`ganache listening on port ${PORT}...`);
  const provider = server.provider;
  const accounts = await provider.request({
    method: "eth_accounts",
    params: [],
  });
});
