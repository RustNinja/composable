import { ApiPromise } from "@polkadot/api";
import BigNumber from "bignumber.js";
import { fromChainIdUnit } from "../../unit";
import { unwrapNumberOrHex } from "../../../hexStrings";

export type PicassoRpcAsset = {
  name: string;
  id: BigNumber;
  decimals?: number;
  existentialDeposit: BigNumber | null;
  ratio: AssetRatio | null;
};

export type AssetRatio = {
  n: number;
  d: number;
};

export async function picassoAssetsList(
  api: ApiPromise
): Promise<PicassoRpcAsset[]> {
  try {
    const assetsList = await api.rpc.assets.listAssets();
    return assetsList.map((asset) => {
      return {
        name: asset.name.toUtf8(),
        id: new BigNumber(asset.id.toString()),
        decimals: asset.decimals.toNumber(),
        foreignId: asset.foreignId.toJSON(),
        existentialDeposit: fromChainIdUnit(
          unwrapNumberOrHex(asset.existentialDeposit.toString()),
          asset.decimals.toNumber()
        ),
        ratio: (asset.ratio.toJSON() as AssetRatio) ?? null,
      };
    });
  } catch (err) {
    console.log("[picassoAssetsList] ", err);
    return [];
  }
}
