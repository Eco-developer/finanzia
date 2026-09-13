export class ParentCategoryNotFoundException extends Error {
  constructor(parentId: string) {
    super(`No se encontró la categoría padre con identificador: ${parentId}`);
    this.name = "ParentCategoryNotFoundException";
  }
}
