import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { IHashingService } from "../../core/application/ports/hashing.port";

@Injectable()
export class HashingService implements IHashingService {
  /**
   * Hashes a plain password using Argon2id with secure memory and time cost settings.
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies a plain password against an Argon2id hash.
   */
  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
