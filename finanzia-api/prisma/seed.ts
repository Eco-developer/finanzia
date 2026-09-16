import { PrismaClient, CategoryType } from "@prisma/client";

const prisma = new PrismaClient();

interface SubCategoryDef {
  name: string;
  icon?: string;
  colorHex?: string;
}

interface CategoryDef {
  name: string;
  type: CategoryType;
  icon: string;
  colorHex: string;
  subcategories: SubCategoryDef[];
}

const CATEGORIES_DATA: CategoryDef[] = [
  // ==========================================
  // CATEGORÍAS DE GASTO (EXPENSE)
  // ==========================================
  {
    name: "Alimentación",
    type: CategoryType.EXPENSE,
    icon: "🛒",
    colorHex: "#10B981",
    subcategories: [
      { name: "Supermercado", icon: "🛒", colorHex: "#10B981" },
      { name: "Restaurantes y Bares", icon: "🍽️", colorHex: "#10B981" },
      { name: "Cafetería y Snacks", icon: "☕", colorHex: "#10B981" },
    ],
  },
  {
    name: "Vivienda",
    type: CategoryType.EXPENSE,
    icon: "🏠",
    colorHex: "#3B82F6",
    subcategories: [
      { name: "Alquiler / Hipoteca", icon: "🏠", colorHex: "#3B82F6" },
      { name: "Suministros (Luz, Agua, Gas)", icon: "💡", colorHex: "#3B82F6" },
      { name: "Internet y Telefonía", icon: "📶", colorHex: "#3B82F6" },
      { name: "Mantenimiento y Hogar", icon: "🔧", colorHex: "#3B82F6" },
    ],
  },
  {
    name: "Transporte",
    type: CategoryType.EXPENSE,
    icon: "🚗",
    colorHex: "#F59E0B",
    subcategories: [
      { name: "Transporte Público", icon: "🚌", colorHex: "#F59E0B" },
      { name: "Combustible", icon: "⛽", colorHex: "#F59E0B" },
      { name: "Parking y Peajes", icon: "🅿️", colorHex: "#F59E0B" },
      { name: "Mantenimiento de Vehículo", icon: "🛠️", colorHex: "#F59E0B" },
    ],
  },
  {
    name: "Ocio y Estilo de Vida",
    type: CategoryType.EXPENSE,
    icon: "🎉",
    colorHex: "#8B5CF6",
    subcategories: [
      { name: "Cine, Eventos y Salidas", icon: "🎬", colorHex: "#8B5CF6" },
      { name: "Viajes y Vacaciones", icon: "✈️", colorHex: "#8B5CF6" },
      { name: "Suscripciones y Streaming", icon: "📺", colorHex: "#8B5CF6" },
      { name: "Hobbies y Deportes", icon: "🎨", colorHex: "#8B5CF6" },
    ],
  },
  {
    name: "Salud y Bienestar",
    type: CategoryType.EXPENSE,
    icon: "❤️",
    colorHex: "#EC4899",
    subcategories: [
      { name: "Farmacia y Medicamentos", icon: "💊", colorHex: "#EC4899" },
      { name: "Consultas Médicas", icon: "🩺", colorHex: "#EC4899" },
      { name: "Cuidado Personal y Belleza", icon: "💇", colorHex: "#EC4899" },
    ],
  },
  {
    name: "Compras y Personal",
    type: CategoryType.EXPENSE,
    icon: "🛍️",
    colorHex: "#F97316",
    subcategories: [
      { name: "Ropa y Calzado", icon: "👕", colorHex: "#F97316" },
      { name: "Electrónica y Tecnología", icon: "📱", colorHex: "#F97316" },
      { name: "Regalos y Donaciones", icon: "🎁", colorHex: "#F97316" },
    ],
  },
  {
    name: "Educación",
    type: CategoryType.EXPENSE,
    icon: "🎓",
    colorHex: "#06B6D4",
    subcategories: [
      { name: "Cursos y Formación", icon: "🎓", colorHex: "#06B6D4" },
      { name: "Libros y Material", icon: "📚", colorHex: "#06B6D4" },
    ],
  },
  {
    name: "Finanzas e Impuestos",
    type: CategoryType.EXPENSE,
    icon: "🏛️",
    colorHex: "#6B7280",
    subcategories: [
      { name: "Comisiones Bancarias", icon: "🏦", colorHex: "#6B7280" },
      { name: "Impuestos y Tasas", icon: "📋", colorHex: "#6B7280" },
      { name: "Seguros", icon: "🛡️", colorHex: "#6B7280" },
    ],
  },

  // ==========================================
  // CATEGORÍAS DE INGRESO (INCOME)
  // ==========================================
  {
    name: "Nómina y Salario",
    type: CategoryType.INCOME,
    icon: "💼",
    colorHex: "#059669",
    subcategories: [
      { name: "Salario Principal", icon: "💼", colorHex: "#059669" },
      { name: "Pagas Extra y Bonos", icon: "💰", colorHex: "#059669" },
    ],
  },
  {
    name: "Actividad Profesional",
    type: CategoryType.INCOME,
    icon: "💻",
    colorHex: "#14B8A6",
    subcategories: [
      { name: "Facturación Freelance", icon: "💻", colorHex: "#14B8A6" },
      { name: "Rendimientos de Negocio", icon: "📈", colorHex: "#14B8A6" },
    ],
  },
  {
    name: "Inversiones",
    type: CategoryType.INCOME,
    icon: "📊",
    colorHex: "#6366F1",
    subcategories: [
      { name: "Dividendos", icon: "💵", colorHex: "#6366F1" },
      { name: "Intereses y Rendimientos", icon: "📈", colorHex: "#6366F1" },
      { name: "Ganancias de Capital", icon: "🪙", colorHex: "#6366F1" },
    ],
  },
  {
    name: "Otros Ingresos",
    type: CategoryType.INCOME,
    icon: "🎁",
    colorHex: "#84CC16",
    subcategories: [
      { name: "Devoluciones y Reembolsos", icon: "🔄", colorHex: "#84CC16" },
      { name: "Venta de Segunda Mano", icon: "🏷️", colorHex: "#84CC16" },
      { name: "Transferencias y Regalos", icon: "🎁", colorHex: "#84CC16" },
    ],
  },
];

async function seedCategories() {
  console.log("🌱 Iniciando seed de categorías genéricas del sistema...");
  let parentCount = 0;
  let subCount = 0;

  for (const catDef of CATEGORIES_DATA) {
    // Buscar si la categoría padre ya existe como categoría de sistema
    let parent = await prisma.category.findFirst({
      where: {
        userId: null,
        name: catDef.name,
        parentId: null,
      },
    });

    if (parent) {
      // Actualizar por si cambiaron icono o colorHex
      parent = await prisma.category.update({
        where: { id: parent.id },
        data: {
          icon: catDef.icon,
          colorHex: catDef.colorHex,
          type: catDef.type,
          isArchived: false,
        },
      });
    } else {
      parent = await prisma.category.create({
        data: {
          userId: null,
          parentId: null,
          name: catDef.name,
          icon: catDef.icon,
          colorHex: catDef.colorHex,
          type: catDef.type,
          isArchived: false,
        },
      });
      parentCount++;
    }

    // Procesar subcategorías
    for (const subDef of catDef.subcategories) {
      const existingSub = await prisma.category.findFirst({
        where: {
          userId: null,
          parentId: parent.id,
          name: subDef.name,
        },
      });

      if (existingSub) {
        await prisma.category.update({
          where: { id: existingSub.id },
          data: {
            icon: subDef.icon ?? catDef.icon,
            colorHex: subDef.colorHex ?? catDef.colorHex,
            type: catDef.type,
            isArchived: false,
          },
        });
      } else {
        await prisma.category.create({
          data: {
            userId: null,
            parentId: parent.id,
            name: subDef.name,
            icon: subDef.icon ?? catDef.icon,
            colorHex: subDef.colorHex ?? catDef.colorHex,
            type: catDef.type,
            isArchived: false,
          },
        });
        subCount++;
      }
    }
  }

  const totalSystemCategories = await prisma.category.count({
    where: { userId: null },
  });

  console.log(
    `✅ Seed completado: ${parentCount} categorías principales creadas, ${subCount} subcategorías creadas. Total en sistema: ${totalSystemCategories}`,
  );
}

async function main() {
  try {
    await seedCategories();
  } catch (e) {
    console.error("❌ Error ejecutando seed de categorías:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
