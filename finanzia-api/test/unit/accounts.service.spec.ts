import { AccountsService } from '../../src/core/application/accounts/accounts.service';
import { AccountEntity } from '../../src/core/domain/entities/account.entity';
import { AccountType } from '@prisma/client';
import { AccountNotFoundException } from '../../src/core/domain/exceptions/account-not-found.exception';
import { UnauthorizedAccountAccessException } from '../../src/core/domain/exceptions/unauthorized-account-access.exception';

describe('AccountsService (Unit Tests)', () => {
  let accountsService: AccountsService;
  let mockAccountRepository: any;

  const mockAccount = new AccountEntity(
    'acc-uuid-1',
    'user-owner-id',
    'Cuenta Nómina BBVA',
    AccountType.CHECKING,
    BigInt(100000), // 1.000,00 €
    BigInt(100000),
    'EUR',
    false,
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    mockAccountRepository = {
      findAllByUserId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    accountsService = new AccountsService(mockAccountRepository);
  });

  describe('Creación de cuentas', () => {
    it('debe crear una cuenta con saldo inicial en céntimos enteros (BigInt)', async () => {
      mockAccountRepository.create.mockResolvedValue(mockAccount);

      const result = await accountsService.createAccount('user-owner-id', {
        name: 'Cuenta Nómina BBVA',
        type: AccountType.CHECKING,
        initialBalanceCents: 100000,
        currency: 'EUR',
      });

      expect(mockAccountRepository.create).toHaveBeenCalledWith({
        userId: 'user-owner-id',
        name: 'Cuenta Nómina BBVA',
        type: AccountType.CHECKING,
        initialBalanceCents: BigInt(100000),
        currency: 'EUR',
      });
      expect(result.id).toBe(mockAccount.id);
      expect(result.currentBalanceCents).toBe(100000);
    });
  });

  describe('Aislamiento Multi-Tenant de Cuentas', () => {
    it('debe listar solo las cuentas asociadas al usuario autenticado', async () => {
      mockAccountRepository.findAllByUserId.mockResolvedValue([mockAccount]);

      const accounts = await accountsService.getUserAccounts('user-owner-id', false);

      expect(mockAccountRepository.findAllByUserId).toHaveBeenCalledWith('user-owner-id', false);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Cuenta Nómina BBVA');
    });

    it('debe permitir ver una cuenta si pertenece al usuario', async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);

      const account = await accountsService.getAccountById('user-owner-id', 'acc-uuid-1');

      expect(account.id).toBe('acc-uuid-1');
      expect(account.userId).toBe('user-owner-id');
    });

    it('debe lanzar UnauthorizedAccountAccessException si un usuario intenta acceder a una cuenta ajena', async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);

      await expect(
        accountsService.getAccountById('another-malicious-user-id', 'acc-uuid-1'),
      ).rejects.toThrow(UnauthorizedAccountAccessException);
    });

    it('debe lanzar AccountNotFoundException si la cuenta no existe', async () => {
      mockAccountRepository.findById.mockResolvedValue(null);

      await expect(
        accountsService.getAccountById('user-owner-id', 'non-existent-acc'),
      ).rejects.toThrow(AccountNotFoundException);
    });
  });

  describe('Actualización y Archivado de cuentas', () => {
    it('debe actualizar los datos de la cuenta si el usuario es el propietario', async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);
      const updatedAccount = new AccountEntity(
        mockAccount.id,
        mockAccount.userId,
        'Nuevo Nombre BBVA',
        AccountType.CHECKING,
        mockAccount.initialBalanceCents,
        mockAccount.currentBalanceCents,
        mockAccount.currency,
        mockAccount.isArchived,
        mockAccount.createdAt,
        new Date(),
      );
      mockAccountRepository.update.mockResolvedValue(updatedAccount);

      const result = await accountsService.updateAccount('user-owner-id', 'acc-uuid-1', {
        name: 'Nuevo Nombre BBVA',
      });

      expect(mockAccountRepository.update).toHaveBeenCalledWith('acc-uuid-1', {
        name: 'Nuevo Nombre BBVA',
        type: undefined,
        isArchived: undefined,
      });
      expect(result.name).toBe('Nuevo Nombre BBVA');
    });

    it('debe archivar la cuenta marcándola como isArchived: true (Soft Delete)', async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);
      const archivedAccount = new AccountEntity(
        mockAccount.id,
        mockAccount.userId,
        mockAccount.name,
        mockAccount.type,
        mockAccount.initialBalanceCents,
        mockAccount.currentBalanceCents,
        mockAccount.currency,
        true,
        mockAccount.createdAt,
        new Date(),
      );
      mockAccountRepository.update.mockResolvedValue(archivedAccount);

      const result = await accountsService.archiveAccount('user-owner-id', 'acc-uuid-1');

      expect(mockAccountRepository.update).toHaveBeenCalledWith('acc-uuid-1', {
        isArchived: true,
      });
      expect(result.isArchived).toBe(true);
    });
  });
});
