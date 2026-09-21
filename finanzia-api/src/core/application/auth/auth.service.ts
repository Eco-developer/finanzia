import { Injectable, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../domain/repositories/user.repository.interface";
import { IHashingService, HASHING_SERVICE } from "../ports/hashing.port";
import { RegisterDto } from "../../../presentation/dtos/auth/register.dto";
import { LoginDto } from "../../../presentation/dtos/auth/login.dto";
import {
  UserResponseDto,
  AuthResponseDto,
} from "../../../presentation/dtos/auth/user-response.dto";
import { UserAlreadyExistsException } from "../../domain/exceptions/user-already-exists.exception";
import { InvalidCredentialsException } from "../../domain/exceptions/invalid-credentials.exception";
import { UserNotFoundException } from "../../domain/exceptions/user-not-found.exception";
import { UserEntity } from "../../domain/entities/user.entity";

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(HASHING_SERVICE)
    private readonly hashingService: IHashingService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new UserAlreadyExistsException(dto.email);
    }

    const passwordHash = await this.hashingService.hash(dto.password);

    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      defaultCurrency: dto.defaultCurrency || "EUR",
    });

    const token = this.generateToken(user);

    return {
      user: this.toResponseDto(user),
      token,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isMatch = await this.hashingService.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isMatch) {
      throw new InvalidCredentialsException();
    }

    const token = this.generateToken(user);

    return {
      user: this.toResponseDto(user),
      token,
    };
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }
    return this.toResponseDto(user);
  }

  private generateToken(user: UserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
  }

  private toResponseDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      defaultCurrency: user.defaultCurrency,
      createdAt: user.createdAt,
    };
  }
}
