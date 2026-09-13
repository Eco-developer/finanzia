import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CategoryType } from "@prisma/client";

export class CategoryResponseDto {
  @ApiProperty({
    example: "a0b1c2d3-e4f5-4a5b-8c9d-0e1f2a3b4c5d",
    description: "Identificador único UUID de la categoría",
  })
  id: string;

  @ApiPropertyOptional({
    example: "user-uuid-123",
    description:
      "UUID del usuario propietario (null si es categoría base del sistema)",
    nullable: true,
  })
  userId: string | null;

  @ApiPropertyOptional({
    example: "parent-cat-uuid",
    description: "UUID de la categoría padre para jerarquías",
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({
    example: "Supermercado",
    description: "Nombre de la categoría",
  })
  name: string;

  @ApiPropertyOptional({
    example: "shopping-cart",
    description: "Clave del icono representativo",
    nullable: true,
  })
  icon: string | null;

  @ApiPropertyOptional({
    example: "#10B981",
    description: "Código de color hexadecimal",
    nullable: true,
  })
  colorHex: string | null;

  @ApiProperty({
    enum: CategoryType,
    example: CategoryType.EXPENSE,
    description: "Tipo de categoría: INCOME o EXPENSE",
  })
  type: CategoryType;

  @ApiProperty({
    example: false,
    description: "Indica si es una categoría de solo lectura del sistema",
  })
  isSystem: boolean;

  @ApiProperty({
    example: false,
    description: "Indica si la categoría está archivada",
  })
  isArchived: boolean;

  @ApiProperty({
    example: "2026-09-13T10:00:00.000Z",
    description: "Fecha de creación del registro",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2026-09-13T10:00:00.000Z",
    description: "Fecha de última actualización",
  })
  updatedAt: Date;
}
