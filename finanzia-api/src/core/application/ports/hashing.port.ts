export interface IHashingService {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

export const HASHING_SERVICE = Symbol("IHashingService");
