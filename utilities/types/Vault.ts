export enum ActionType {
  JoeSwap = 1,
  AaveV3Supply = 2,
  cTokenMint = 3,
}

export type SwapAction = {
  actionType: ActionType
  tokenIn: string
  tokenOut: string
}
