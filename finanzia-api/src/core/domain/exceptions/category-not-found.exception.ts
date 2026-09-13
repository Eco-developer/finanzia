export class CategoryNotFoundException extends Error {
  constructor(categoryId: string) {
    super(`No se encontró la categoría con identificador: ${categoryId}`);
    this.name = "CategoryNotFoundException";
  }
}
