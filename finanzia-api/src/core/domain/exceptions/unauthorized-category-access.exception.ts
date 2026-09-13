export class UnauthorizedCategoryAccessException extends Error {
  constructor(categoryId: string) {
    super(
      `No tienes permisos para modificar o acceder a la categoría con ID: ${categoryId}`,
    );
    this.name = "UnauthorizedCategoryAccessException";
  }
}
