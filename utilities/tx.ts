export const txWait = async (txPromise): Promise<any> => {
  return await (await txPromise).wait()
}
