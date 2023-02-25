import "dotenv";
import {
  coin,
  DirectSecp256k1HdWallet,
  GasPrice,
  SigningCosmWasmClient,
} from "$";

const contractAddr = Deno.env.get("CONTRACT_ADDR") as string;
const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
  Deno.env.get("MNEMONIC") as string,
  {
    prefix: Deno.env.get("BECH32_PREFIX"),
  },
);
const [{ address }] = await wallet.getAccounts();

const client = await SigningCosmWasmClient.connectWithSigner(
  Deno.env.get("RPC_URL") as string,
  wallet,
  {
    prefix: Deno.env.get("BECH32_PREFIX"),
    gasPrice: GasPrice.fromString(
      `${Deno.env.get("GAS_PRICE")}${Deno.env.get("DENOM")}`,
    ),
  },
);

setInterval(async () => {
  try {
    const draw = await client.queryContractSmart(contractAddr, {
      get_current_draw: {},
    });
    const isExpired =
      Date.now() >= +new Date(Number(draw.end_time.at_time) / 1e6);
    if (draw.status === "open" && isExpired) {
      console.log("Request draw: ", draw);
      const result = await client.execute(
        address,
        contractAddr,
        { request_randomness: { draw_id: draw.id } },
        "auto",
        undefined,
        [
          coin(
            Deno.env.get("NOIS_FEE") as string,
            Deno.env.get("DENOM") as string,
          ),
        ],
      );
      console.log("tx_hash: ", result.transactionHash);
    }
  } catch (err) {
    console.error("Error: ", err);
  }
}, 1000 * 15);

setInterval(async () => {
  try {
    const draw = await client.queryContractSmart(contractAddr, {
      get_current_draw: {},
    });
    if (draw.status === "raffling") {
      console.log("Raffling draw: ", draw);
      const result = await client.execute(
        address,
        contractAddr,
        { raffle: { draw_id: draw.id } },
        "auto",
        undefined,
        [
          coin(
            Deno.env.get("NOIS_FEE") as string,
            Deno.env.get("DENOM") as string,
          ),
        ],
      );
      console.log("tx_hash: ", result.transactionHash);
    }
  } catch (err) {
    console.error("Error: ", err);
  }
}, 1000 * 15);
