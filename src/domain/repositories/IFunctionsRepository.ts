export interface IFunctionsRepository {
  callFunction<TRequest, TResponse>(functionName: string, data?: TRequest): Promise<TResponse>;
}
