// FinanZIA — Generador Oficial de Pantallas y Tokens para Figma
// Ejecutar directamente en Figma: Plugins -> Development -> Import plugin from manifest...

async function run() {
  // 1. Cargar fuentes del sistema
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // 2. Definición de Colores Semánticos en RGB (0-1)
  const c = {
    bgPrimary: { r: 11 / 255, g: 15 / 255, b: 25 / 255 },     // #0B0F19
    bgSurface: { r: 17 / 255, g: 24 / 255, b: 39 / 255 },     // #111827
    bgCard: { r: 30 / 255, g: 41 / 255, b: 59 / 255 },        // #1E293B
    brand: { r: 16 / 255, g: 185 / 255, b: 129 / 255 },       // #10B981
    brandDark: { r: 5 / 255, g: 150 / 255, b: 105 / 255 },    // #059669
    ai: { r: 139 / 255, g: 92 / 255, b: 246 / 255 },          // #8B5CF6
    expense: { r: 244 / 255, g: 63 / 255, b: 94 / 255 },      // #F43F5E
    transfer: { r: 59 / 255, g: 130 / 255, b: 246 / 255 },    // #3B82F6
    warning: { r: 245 / 255, g: 158 / 255, b: 11 / 255 },     // #F59E0B
    textPrimary: { r: 249 / 255, g: 250 / 255, b: 251 / 255 }, // #F9FAFB
    textSecondary: { r: 156 / 255, g: 163 / 255, b: 175 / 255 }, // #9CA3AF
    textMuted: { r: 107 / 255, g: 114 / 255, b: 128 / 255 },  // #6B7280
  };

  // Crear o actualizar Color Styles en el documento
  function createColorStyle(name, rgb, opacity = 1) {
    const existing = figma.getLocalPaintStyles().find(s => s.name === name);
    const style = existing || figma.createPaintStyle();
    style.name = name;
    style.paints = [{ type: "SOLID", color: rgb, opacity }];
    return style;
  }

  createColorStyle("FinanZIA/Background/Primary", c.bgPrimary);
  createColorStyle("FinanZIA/Background/Surface", c.bgSurface);
  createColorStyle("FinanZIA/Brand/Emerald", c.brand);
  createColorStyle("FinanZIA/Brand/AI-Violet", c.ai);
  createColorStyle("FinanZIA/Status/Expense-Rose", c.expense);
  createColorStyle("FinanZIA/Status/Transfer-Blue", c.transfer);
  createColorStyle("FinanZIA/Text/Primary", c.textPrimary);
  createColorStyle("FinanZIA/Text/Secondary", c.textSecondary);

  // Helper para texto rápido
  function addText(parent, text, x, y, size, weight = "Regular", color = c.textPrimary) {
    const node = figma.createText();
    node.fontName = { family: "Inter", style: weight };
    node.characters = text;
    node.fontSize = size;
    node.fills = [{ type: "SOLID", color }];
    node.x = x;
    node.y = y;
    parent.appendChild(node);
    return node;
  }

  // ==========================================
  // PANTALLA 1: DESKTOP DASHBOARD (1440x900)
  // ==========================================
  const desktop = figma.createFrame();
  desktop.name = "💻 FinanZIA — Desktop Dashboard (1440x900)";
  desktop.resize(1440, 900);
  desktop.fills = [{ type: "SOLID", color: c.bgPrimary }];
  desktop.x = 0;
  desktop.y = 0;

  // Sidebar (260px)
  const sidebar = figma.createFrame();
  sidebar.name = "Sidebar";
  sidebar.resize(260, 900);
  sidebar.fills = [{ type: "SOLID", color: c.bgSurface }];
  sidebar.strokes = [{ type: "SOLID", color: c.textMuted, opacity: 0.2 }];
  sidebar.strokeWeight = 1;
  desktop.appendChild(sidebar);

  // Logo
  addText(sidebar, "⚡ FinanZIA", 24, 32, 22, "Bold", c.brand);
  addText(sidebar, "IA DETERMINISTA", 24, 60, 10, "Medium", c.textMuted);

  // Menu Items
  const menu = [
    { title: "📊 Dashboard", active: true },
    { title: "💳 Cuentas y Tarjetas", active: false },
    { title: "↕️ Transacciones", active: false },
    { title: "🎯 Presupuestos", active: false },
    { title: "🏆 Metas de Ahorro", active: false },
    { title: "📄 Importar CSV", active: false },
    { title: "🤖 FinanZIA AI Advisor", active: false, isAI: true },
  ];

  menu.forEach((item, idx) => {
    const itemFrame = figma.createFrame();
    itemFrame.name = `Nav/${item.title}`;
    itemFrame.resize(220, 44);
    itemFrame.x = 20;
    itemFrame.y = 110 + idx * 52;
    itemFrame.cornerRadius = 8;
    if (item.active) {
      itemFrame.fills = [{ type: "SOLID", color: c.bgCard }];
      itemFrame.strokes = [{ type: "SOLID", color: c.brand, opacity: 0.4 }];
      itemFrame.strokeWeight = 1;
      addText(itemFrame, item.title, 16, 12, 14, "Semi Bold", c.brand);
    } else if (item.isAI) {
      itemFrame.fills = [{ type: "SOLID", color: c.ai, opacity: 0.1 }];
      addText(itemFrame, item.title, 16, 12, 14, "Semi Bold", c.ai);
    } else {
      itemFrame.fills = [];
      addText(itemFrame, item.title, 16, 12, 14, "Medium", c.textSecondary);
    }
    sidebar.appendChild(itemFrame);
  });

  // User footer in Sidebar
  addText(sidebar, "Miguel García", 24, 820, 14, "Semi Bold", c.textPrimary);
  addText(sidebar, "Cerrar Sesión", 24, 842, 12, "Regular", c.textMuted);

  // Main Container
  const main = figma.createFrame();
  main.name = "Main_Area";
  main.resize(1140, 900);
  main.x = 280;
  main.y = 32;
  main.fills = [];
  desktop.appendChild(main);

  addText(main, "Panel Financiero Consolidado", 0, 0, 26, "Bold", c.textPrimary);
  addText(main, "Supervisión de balances y transacciones en tiempo real con IA determinista", 0, 36, 14, "Regular", c.textSecondary);

  // KPI Row
  const kpis = [
    { label: "PATRIMONIO TOTAL LÍQUIDO", val: "12.450,50 €", sub: "2 cuentas bancarias conectadas", color: c.textPrimary, badge: "EN VIVO" },
    { label: "INGRESOS (ESTE MES)", val: "+2.340,00 €", sub: "↑ 12% vs mes anterior", color: c.brand },
    { label: "GASTOS (ESTE MES)", val: "-1.120,50 €", sub: "56% del presupuesto consumido", color: c.expense },
  ];

  kpis.forEach((kpi, idx) => {
    const card = figma.createFrame();
    card.name = `KPI/${kpi.label}`;
    card.resize(345, 120);
    card.x = idx * 365;
    card.y = 80;
    card.cornerRadius = 14;
    card.fills = [{ type: "SOLID", color: c.bgSurface }];
    card.strokes = [{ type: "SOLID", color: c.textMuted, opacity: 0.15 }];
    card.strokeWeight = 1;
    main.appendChild(card);

    addText(card, kpi.label, 20, 20, 11, "Semi Bold", c.textSecondary);
    addText(card, kpi.val, 20, 48, 26, "Bold", kpi.color);
    addText(card, kpi.sub, 20, 88, 12, "Regular", c.textMuted);
  });

  // Action Buttons
  const actions = ["+ Nuevo Movimiento", "↔ Transferencia", "↑ Importar CSV"];
  actions.forEach((act, idx) => {
    const btn = figma.createFrame();
    btn.name = `Btn/${act}`;
    btn.resize(150, 40);
    btn.x = 640 + idx * 160;
    btn.y = 10;
    btn.cornerRadius = 8;
    btn.fills = idx === 0 ? [{ type: "SOLID", color: c.brand }] : [{ type: "SOLID", color: c.bgSurface }];
    btn.strokes = idx === 0 ? [] : [{ type: "SOLID", color: c.textMuted, opacity: 0.2 }];
    main.appendChild(btn);
    addText(btn, act, 16, 12, 13, "Semi Bold", idx === 0 ? c.bgPrimary : c.textPrimary);
  });

  // Accounts Cards Row
  const accounts = [
    { name: "Cuenta Corriente N26", type: "CHECKING", balance: "4.890,15 €", iban: "ES91 **** **** 4821", color: c.transfer },
    { name: "Revolut Ahorro Meta", type: "SAVINGS", balance: "7.560,35 €", iban: "Rentabilidad: 3.10% TAE", color: c.brand },
    { name: "Propuesta de IA: Optimización", type: "AI ADVISOR", balance: "+350 € Excedente", iban: "Acción: Aportar a Emergencia", color: c.ai, isAI: true }
  ];

  accounts.forEach((acc, idx) => {
    const card = figma.createFrame();
    card.name = `Account/${acc.name}`;
    card.resize(345, 140);
    card.x = idx * 365;
    card.y = 224;
    card.cornerRadius = 14;
    card.fills = [{ type: "SOLID", color: c.bgSurface }];
    card.strokes = [{ type: "SOLID", color: acc.color, opacity: 0.3 }];
    card.strokeWeight = 1;
    main.appendChild(card);

    addText(card, acc.name, 20, 20, 15, "Semi Bold", c.textPrimary);
    addText(card, acc.type, 260, 20, 10, "Bold", acc.color);
    addText(card, acc.balance, 20, 60, 24, "Bold", acc.isAI ? c.ai : c.textPrimary);
    addText(card, acc.iban, 20, 100, 12, "Medium", c.textMuted);
  });

  // Transactions Table
  const table = figma.createFrame();
  table.name = "Table/RecentTransactions";
  table.resize(1075, 420);
  table.x = 0;
  table.y = 390;
  table.cornerRadius = 14;
  table.fills = [{ type: "SOLID", color: c.bgSurface }];
  table.strokes = [{ type: "SOLID", color: c.textMuted, opacity: 0.15 }];
  table.strokeWeight = 1;
  main.appendChild(table);

  addText(table, "Movimientos Bancarios Recientes", 24, 20, 16, "Semi Bold", c.textPrimary);

  const txs = [
    { date: "15/09/2026", desc: "Nómina Mensual Tecnológica", acc: "N26 Corriente", cat: "Nómina", amount: "+2.850,00 €", color: c.brand },
    { date: "14/09/2026", desc: "Pago Alquiler Vivienda", acc: "N26 Corriente", cat: "Hogar", amount: "-850,00 €", color: c.expense },
    { date: "13/09/2026", desc: "Mercadona Supermercado", acc: "N26 Corriente", cat: "Alimentación", amount: "-64,30 €", color: c.expense },
    { date: "12/09/2026", desc: "Aporte Programado Meta Ahorro", acc: "N26 → Revolut", cat: "Transferencia", amount: "300,00 €", color: c.transfer },
    { date: "10/09/2026", desc: "Suscripción Netflix Premium", acc: "N26 Corriente", cat: "Ocio", amount: "-17,99 €", color: c.expense },
  ];

  txs.forEach((tx, idx) => {
    const yPos = 70 + idx * 56;
    addText(table, tx.date, 24, yPos, 13, "Regular", c.textMuted);
    addText(table, tx.desc, 150, yPos, 14, "Semi Bold", c.textPrimary);
    addText(table, tx.acc, 500, yPos, 13, "Regular", c.textSecondary);
    addText(table, tx.cat, 740, yPos, 12, "Medium", c.textSecondary);
    addText(table, tx.amount, 940, yPos, 14, "Bold", tx.color);
  });

  // ==========================================
  // PANTALLA 2: MOBILE DASHBOARD (390x844)
  // ==========================================
  const mobile = figma.createFrame();
  mobile.name = "📱 FinanZIA — Mobile Dashboard (390x844)";
  mobile.resize(390, 844);
  mobile.fills = [{ type: "SOLID", color: c.bgPrimary }];
  mobile.x = 1500;
  mobile.y = 0;

  // Header Mobile
  addText(mobile, "⚡ FinanZIA", 20, 24, 20, "Bold", c.brand);
  addText(mobile, "🔔", 340, 24, 16, "Regular", c.textSecondary);

  // Hero Card Mobile
  const mHero = figma.createFrame();
  mHero.name = "Mobile_Hero_Card";
  mHero.resize(350, 140);
  mHero.x = 20;
  mHero.y = 64;
  mHero.cornerRadius = 14;
  mHero.fills = [{ type: "SOLID", color: c.bgSurface }];
  mHero.strokes = [{ type: "SOLID", color: c.textMuted, opacity: 0.15 }];
  mobile.appendChild(mHero);

  addText(mHero, "PATRIMONIO TOTAL", 20, 16, 11, "Semi Bold", c.textSecondary);
  addText(mHero, "12.450,50 €", 20, 42, 26, "Bold", c.textPrimary);
  addText(mHero, "Mes: +2.340 €", 20, 96, 14, "Semi Bold", c.brand);
  addText(mHero, "Gastos: -1.120 €", 190, 96, 14, "Semi Bold", c.expense);

  // Quick Action Pills
  const mActions = ["+ Gasto", "↔ Traspaso", "↑ Subir CSV", "⚡ AI"];
  mActions.forEach((act, idx) => {
    const pill = figma.createFrame();
    pill.resize(76, 36);
    pill.x = 20 + idx * 88;
    pill.y = 220;
    pill.cornerRadius = 8;
    pill.fills = idx === 0 ? [{ type: "SOLID", color: c.brand }] : [{ type: "SOLID", color: c.bgSurface }];
    mobile.appendChild(pill);
    addText(pill, act, 12, 10, 12, "Semi Bold", idx === 0 ? c.bgPrimary : c.textPrimary);
  });

  // Recent List Mobile
  addText(mobile, "Últimos Movimientos", 20, 280, 16, "Semi Bold", c.textPrimary);
  txs.slice(0, 4).forEach((tx, idx) => {
    const row = figma.createFrame();
    row.resize(350, 60);
    row.x = 20;
    row.y = 310 + idx * 70;
    row.cornerRadius = 10;
    row.fills = [{ type: "SOLID", color: c.bgSurface }];
    mobile.appendChild(row);

    addText(row, tx.desc, 14, 12, 13, "Semi Bold", c.textPrimary);
    addText(row, tx.date + " • " + tx.acc, 14, 34, 11, "Regular", c.textMuted);
    addText(row, tx.amount, 240, 20, 13, "Bold", tx.color);
  });

  // Bottom Nav Bar Mobile (64px)
  const bNav = figma.createFrame();
  bNav.name = "Bottom_Nav_Bar";
  bNav.resize(390, 64);
  bNav.x = 0;
  bNav.y = 780;
  bNav.fills = [{ type: "SOLID", color: c.bgSurface }];
  bNav.strokes = [{ type: "SOLID", color: c.textMuted, opacity: 0.15 }];
  mobile.appendChild(bNav);

  const tabs = ["📊 Inicio", "↕️ Movs", "🎯 Metas", "🤖 AI", "⚙️ Ajustes"];
  tabs.forEach((tab, idx) => {
    addText(bNav, tab, 20 + idx * 74, 24, 11, idx === 0 ? "Semi Bold" : "Regular", idx === 0 ? c.brand : c.textMuted);
  });

  // Zoom & Seleccionar
  figma.currentPage.selection = [desktop, mobile];
  figma.viewport.scrollAndZoomIntoView([desktop, mobile]);

  figma.notify("✅ ¡Diseño Desktop y Mobile de FinanZIA generado con éxito en el lienzo!");
}

run().catch(err => {
  figma.notify("❌ Error: " + err.message);
});
