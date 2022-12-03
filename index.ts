import "dotenv/config";
import { CronJob } from "cron";
import { GasPrice } from "@cosmjs/stargate";
import { coin, DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

const run = async () => {
  const contractAddr = process.env.CONTRACT_ADDR as string;
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(process.env.MNEMONIC as string, {
    prefix: process.env.BECH32_PREFIX,
  });
  const [{ address }] = await wallet.getAccounts();

  const client = await SigningCosmWasmClient.connectWithSigner(process.env.RPC_URL as string, wallet, {
    prefix: process.env.BECH32_PREFIX,
    gasPrice: GasPrice.fromString(`${process.env.GAS_PRICE}${process.env.DENOM}`),
  });

  new CronJob(
    "* * * * *",
    async () => {
      try {
        const currentDraw = await client.queryContractSmart(contractAddr, {
          get_current_draw: {},
        });
        const isExpired = Date.now() >= +new Date(Number(currentDraw.end_time.at_time) / 1e6);
        if (currentDraw.status === "pending" || !isExpired) return;
        console.log("Executing draw: ", currentDraw);
        const result = await client.execute(address, contractAddr, { execute_draw: { id: currentDraw.id } }, "auto", undefined, [
          coin(process.env.NOIS_FEE as string, process.env.DENOM as string),
        ]);
        console.log("tx_hash: ", result.transactionHash);
      } catch (err) {
        console.error("Error: ", err);
      }
    },
    null,
    true,
    "Europe/Madrid"
  );
};

run().then(() => console.log("CronStar is running!"));
