import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase/firebaseConfig";
import { IFunctionsRepository } from "../../domain/repositories/IFunctionsRepository";

export class FirebaseFunctionsRepository implements IFunctionsRepository {
  async callFunction<TRequest, TResponse>(functionName: string, data?: TRequest): Promise<TResponse> {
    const callableFn = httpsCallable<TRequest, TResponse>(functions, functionName);
    const result = await callableFn(data);
    return result.data;
  }
}

export const functionsRepository = new FirebaseFunctionsRepository();
