'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Bot,
  Zap,
  Wallet,
  ArrowRight,
  Calculator,
  ChevronDown,
  FileSpreadsheet,
  PieChart,
  Flame,
  Check,
  X,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const monthlySliderId = useId();
  const yearsSliderId = useId();
  const rateSliderId = useId();

  // Estado del Showroom Interactivo
  const [activeTab, setActiveTab] = useState<'ai' | 'dashboard' | 'debts'>('ai');
  const [proposalStatus, setProposalStatus] = useState<'idle' | 'approved' | 'rejected'>('idle');

  // Estado del Simulador en Vivo
  const [monthlyCut, setMonthlyCut] = useState<number>(250);
  const [horizonYears, setHorizonYears] = useState<number>(3);
  const [interestRate, setInterestRate] = useState<number>(8);

  // Estado del FAQ Accordion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Cálculos del simulador (Interés compuesto mensual)
  const totalMonths = horizonYears * 12;
  const monthlyRate = interestRate / 100 / 12;
  const baseSaved = monthlyCut * totalMonths;
  
  // Fórmula de valor futuro de anualidades ordinarias: PMT * [((1 + r)^n - 1) / r]
  const futureValue =
    monthlyRate > 0
      ? monthlyCut * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate)
      : baseSaved;
  const interestEarned = Math.max(0, futureValue - baseSaved);

  const formatEuro = (val: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(Math.round(val));
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqItems = [
    {
      q: '¿Cómo garantiza FinanZIA que la IA no invente datos ni ejecute operaciones sin permiso?',
      a: 'FinanZIA implementa una arquitectura determinista con herramientas fuertemente tipadas y el principio "Human-in-the-loop". El agente nunca muta la base de datos de forma unilateral; en su lugar, formula una Propuesta de Acción transparente que requiere tu validación explícita mediante un botón de confirmación antes de impactar tus saldos.',
    },
    {
      q: '¿Por qué se calculan todos los saldos en céntimos enteros (Cero Floats)?',
      a: 'Los números en coma flotante estándar de JavaScript introducen imprecisiones matemáticas inevitables (ej. 0.1 + 0.2 = 0.30000000000000004). En FinanZIA, 10,50 € se representa internamente como 1.050 céntimos enteros auditados, garantizando cuadre contable exacto y congruencia patrimonial estricta.',
    },
    {
      q: '¿Puedo importar extractos bancarios de cualquier entidad (Santander, BBVA, Revolut)?',
      a: '¡Totalmente! Nuestro Asistente de Ingesta CSV Universal te permite subir cualquier extracto bancario, asociar interactivamente las columnas clave (Fecha, Concepto, Importe) y previsualizar las filas con detección automática de movimientos duplicados antes de guardar.',
    },
    {
      q: '¿Cómo me ayuda el Gestor de Deudas a pagar menos intereses?',
      a: 'Comparamos en tiempo real el método Avalancha (priorizar deudas con mayor TAE para ahorrar el máximo dinero en intereses) y el método Bola de Nieve (priorizar saldos menores para liberar flujo de caja rápido). FinanZIA proyecta el calendario exacto de amortización y los euros que ahorras en cada escenario.',
    },
    {
      q: '¿Es seguro el aislamiento de mis datos financieros?',
      a: 'Sí. FinanZIA opera bajo un estricto aislamiento multi-tenant a nivel de repositorio y base de datos con autenticación JWT robusta. Ningún usuario puede acceder, filtrar o consultar transacciones que no pertenezcan a su identidad encriptada.',
    },
  ];

  return (
    <div className={styles.landingContainer}>
      {/* Fondo con Orbes de Luz Ambiental */}
      <div className={styles.ambientGlowContainer} aria-hidden="true">
        <div className={styles.glowOrb1} />
        <div className={styles.glowOrb2} />
        <div className={styles.glowOrb3} />
      </div>

      {/* Header / Sticky Navbar */}
      <header className={styles.navbar}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.brandLink}>
            <div className={styles.brandIconWrapper}>⚡</div>
            <span className={styles.brandName}>
              Finan<span>ZIA</span>
            </span>
            <span className={styles.brandVersionBadge}>v2.4 AI Core</span>
          </Link>

          <nav className={styles.navLinks} aria-label="Navegación principal">
            <a href="#showroom" className={styles.navLinkItem}>
              Showroom
            </a>
            <a href="#features" className={styles.navLinkItem}>
              Características
            </a>
            <a href="#simulador" className={styles.navLinkItem}>
              Simulador
            </a>
            <a href="#comparativa" className={styles.navLinkItem}>
              Comparativa
            </a>
            <a href="#faq" className={styles.navLinkItem}>
              FAQ
            </a>
          </nav>

          <div className={styles.navActions}>
            <a
              href="http://localhost:3001/api/docs"
              target="_blank"
              rel="noreferrer"
              className={styles.navSwaggerBtn}
              title="Explorar documentación interactiva Swagger OpenAPI"
            >
              <span>Swagger API</span>
              <ExternalLink size={12} />
            </a>
            <Link href="/login" className={styles.navLoginBtn}>
              Iniciar Sesión
            </Link>
            <Link href="/register" className={styles.navRegisterCta}>
              <span>Comenzar Gratis</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroTagBadge}>
          <Sparkles size={14} />
          <span>Finanzas Personales con IA Verificable & Cero Alucinaciones</span>
        </div>

        <h1 className={styles.heroTitle}>
          Domina tu dinero con precisión matemática y el poder de una{' '}
          <span className={styles.gradientText}>IA Financiera Autónoma</span>
        </h1>

        <p className={styles.heroSubtitle}>
          Automatiza conciliaciones bancarias por CSV, simula estrategias de cancelación de pasivos
          (Avalancha y Bola de Nieve) y toma decisiones guiadas por un{' '}
          <strong>asistente financiero con herramientas reales bajo supervisión humana</strong>.
        </p>

        <div className={styles.heroCtasGroup}>
          <Link href="/register" className={styles.primaryHeroBtn}>
            <span>Crear Cuenta Gratis</span>
            <ArrowRight size={18} />
          </Link>
          <a href="#showroom" className={styles.secondaryHeroBtn}>
            <Cpu size={18} />
            <span>Ver Demostración en Vivo</span>
          </a>
        </div>

        {/* Micro-barra de confianza */}
        <div className={styles.trustPillsStrip}>
          <div className={styles.trustPill}>
            <span className={styles.trustPillDot} />
            <span>Sin suscripciones ocultas</span>
          </div>
          <div className={styles.trustPill}>
            <span className={styles.trustPillDot} />
            <span>Cero Floats: saldos en céntimos enteros</span>
          </div>
          <div className={styles.trustPill}>
            <span className={styles.trustPillDot} />
            <span>Aprobación Human-in-the-loop</span>
          </div>
          <div className={styles.trustPill}>
            <span className={styles.trustPillDot} />
            <span>Aislamiento estricto multi-tenant</span>
          </div>
        </div>
      </section>

      {/* Showroom Interactivo (Live Interactive Mockup) */}
      <section id="showroom" className={styles.showroomSection}>
        <div className={styles.showroomCard}>
          {/* Barra superior de la ventana */}
          <div className={styles.showroomWindowBar}>
            <div className={styles.windowDots}>
              <span className={`${styles.windowDot} ${styles.dotRed}`} />
              <span className={`${styles.windowDot} ${styles.dotYellow}`} />
              <span className={`${styles.windowDot} ${styles.dotGreen}`} />
            </div>

            <div className={styles.showroomTabs}>
              <button
                type="button"
                className={`${styles.showroomTabBtn} ${activeTab === 'ai' ? styles.showroomTabBtnActive : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                <Bot size={15} />
                <span>AI Advisor</span>
              </button>
              <button
                type="button"
                className={`${styles.showroomTabBtn} ${activeTab === 'dashboard' ? styles.showroomTabBtnActive : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <Wallet size={15} />
                <span>Panel & Cuentas</span>
              </button>
              <button
                type="button"
                className={`${styles.showroomTabBtn} ${activeTab === 'debts' ? styles.showroomTabBtnActive : ''}`}
                onClick={() => setActiveTab('debts')}
              >
                <Flame size={15} />
                <span>Estrategia Deudas</span>
              </button>
            </div>

            <div className={styles.windowLiveTag}>
              <span className={styles.pulseCircle} />
              <span>MODO EN VIVO</span>
            </div>
          </div>

          {/* Cuerpo del Showroom */}
          <div className={styles.showroomBody}>
            {/* VISTA 1: FINANZIA AI ADVISOR */}
            {activeTab === 'ai' && (
              <div className={styles.chatMockup}>
                <div className={styles.chatBubbleUser}>
                  He cobrado un bono extraordinario de <strong>1.200 €</strong> este mes. ¿Cómo puedo
                  optimizar la liquidación de mis deudas y mis presupuestos sin descapitalizarme?
                </div>

                <div className={styles.chatBubbleAi}>
                  <div className={styles.aiHeaderPill}>
                    <Sparkles size={12} />
                    <span>FinanZIA AI Copilot — Multi-Tool Agent</span>
                  </div>

                  <div className={styles.toolExecBadge}>
                    ⚡ calculate_debt_payoff(strategy: &apos;AVALANCHE&apos;, extra_payment: 120000)
                  </div>

                  <p>
                    He auditado tus pasivos activos y presupuestos del mes. Tu{' '}
                    <strong>Tarjeta Visa Oro</strong> devenga una <strong>TAE del 21.5%</strong> con
                    un saldo pendiente de 1.450 €.
                  </p>
                  <p style={{ marginTop: '0.5rem' }}>
                    Si aplicas <strong>850 €</strong> directamente a amortización extraordinaria y
                    destinas los <strong>350 €</strong> restantes a tu meta de Fondo de Emergencia:
                  </p>

                  <div className={styles.interactiveProposalBox}>
                    <div className={styles.proposalBoxHeader}>
                      <span className={styles.proposalTag}>Propuesta de Acción Determinista</span>
                      <span className={styles.proposalHumanTag}>Requiere Validación Humana</span>
                    </div>
                    <div className={styles.proposalTitle}>
                      Amortización Parcial Inmediata Tarjeta Visa Oro (-850,00 €)
                    </div>
                    <div className={styles.proposalDesc}>
                      Ahorro financiero proyectado: <strong>184,20 € en intereses TAE</strong> y
                      reducción de <strong>4 meses</strong> en la fecha de cancelación total.
                    </div>

                    {proposalStatus === 'idle' && (
                      <div className={styles.proposalActionsRow}>
                        <button
                          type="button"
                          className={styles.proposalApproveBtn}
                          onClick={() => setProposalStatus('approved')}
                        >
                          ✓ Aprobar y Ejecutar
                        </button>
                        <button
                          type="button"
                          className={styles.proposalRejectBtn}
                          onClick={() => setProposalStatus('rejected')}
                        >
                          Descartar
                        </button>
                      </div>
                    )}

                    {proposalStatus === 'approved' && (
                      <div className={styles.proposalAppliedBanner}>
                        ✓ ¡Acción confirmada! Operación validada con éxito. Saldos de cuenta
                        actualizados en tiempo real y plan de amortización recalculado.
                      </div>
                    )}

                    {proposalStatus === 'rejected' && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#9CA3AF' }}>
                        Acción descartada por el usuario. No se han alterado tus cuentas ni balances.
                        <button
                          type="button"
                          style={{
                            marginLeft: '0.5rem',
                            color: '#10B981',
                            textDecoration: 'underline',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          onClick={() => setProposalStatus('idle')}
                        >
                          Restablecer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: PANEL & CUENTAS */}
            {activeTab === 'dashboard' && (
              <div className={styles.dashboardMockup}>
                <div className={styles.mockupKpisGrid}>
                  <div className={styles.mockupKpiCard}>
                    <span className={styles.mockupKpiLabel}>Patrimonio Neto Total</span>
                    <div className={`${styles.mockupKpiValue} ${styles.mockupKpiValueGreen}`}>
                      24.850,00 €
                    </div>
                    <div className={styles.mockupKpiSub}>+12.4% vs mes anterior</div>
                  </div>
                  <div className={styles.mockupKpiCard}>
                    <span className={styles.mockupKpiLabel}>Ingresos del Mes</span>
                    <div className={styles.mockupKpiValue}>3.420,00 €</div>
                    <div className={styles.mockupKpiSub}>Nómina + Rendimiento Depósitos</div>
                  </div>
                  <div className={styles.mockupKpiCard}>
                    <span className={styles.mockupKpiLabel}>Gastos Acumulados</span>
                    <div className={`${styles.mockupKpiValue} ${styles.mockupKpiValueRose}`}>
                      1.830,50 €
                    </div>
                    <div className={styles.mockupKpiSub}>Tasa de Ahorro: 46.5%</div>
                  </div>
                </div>

                <div className={styles.mockupAccountsRow}>
                  <div className={styles.mockupAccountBox}>
                    <div>
                      <div className={styles.mockupAccName}>Santander Nómina</div>
                      <div className={styles.mockupAccType}>Cuenta Corriente Operativa</div>
                    </div>
                    <div className={styles.mockupAccBalance}>4.850,00 €</div>
                  </div>
                  <div className={styles.mockupAccountBox}>
                    <div>
                      <div className={styles.mockupAccName}>Trade Republic 3.75%</div>
                      <div className={styles.mockupAccType}>Depósito Líquido / Ahorro</div>
                    </div>
                    <div className={styles.mockupAccBalance}>15.200,00 €</div>
                  </div>
                  <div className={styles.mockupAccountBox}>
                    <div>
                      <div className={styles.mockupAccName}>Revolut Gastos Diarios</div>
                      <div className={styles.mockupAccType}>Tarjeta Prepago / Ocio</div>
                    </div>
                    <div className={styles.mockupAccBalance}>920,00 €</div>
                  </div>
                  <div className={styles.mockupAccountBox}>
                    <div>
                      <div className={styles.mockupAccName}>Tarjeta Crédito Visa</div>
                      <div className={styles.mockupAccType}>Línea Revolving (21.5% TAE)</div>
                    </div>
                    <div className={styles.mockupAccBalance} style={{ color: '#FB7185' }}>
                      -1.450,00 €
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 3: ESTRATEGIA DEUDAS */}
            {activeTab === 'debts' && (
              <div className={styles.debtMockup}>
                <div className={styles.debtComparisonHeader}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
                      Motor Matemático de Liquidación Acelerada
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
                      Comparativa algorítmica sobre tu pasivo total de 8.450 €
                    </p>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#34D399', fontWeight: 600 }}>
                    ⚡ Cálculo en tiempo real
                  </div>
                </div>

                <div className={styles.debtStatsComparison}>
                  <div className={styles.strategyBoxActive}>
                    <span className={styles.strategyBadgeBest}>MÁXIMO AHORRO</span>
                    <div className={styles.strategyTitle}>Estrategia Avalancha (Mayor TAE)</div>
                    <div className={styles.strategyMetricHighlight}>1.240 € Ahorrados</div>
                    <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.4rem' }}>
                      Liquidación total en <strong>11 meses</strong>. Ataca prioritariamente la
                      Tarjeta Revolving (21.5%) y ahorra 4 meses de cuotas e intereses.
                    </p>
                  </div>

                  <div className={styles.strategyBoxAlt}>
                    <div className={styles.strategyTitle}>Estrategia Bola de Nieve (Menor Saldo)</div>
                    <div className={styles.strategyMetricHighlight} style={{ color: '#A78BFA' }}>
                      980 € Ahorrados
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.4rem' }}>
                      Liquidación total en <strong>13 meses</strong>. Prioriza liquidar préstamos
                      pequeños primero para obtener victorias psicológicas rápidas.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Franja de Métricas de Alto Impacto (Stat Strip) */}
      <section className={styles.statsStripSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statNumber} ${styles.statNumberGreen}`}>100%</div>
            <div className={styles.statLabel}>Precisión Cero Floats</div>
            <div className={styles.statDesc}>
              Todos los saldos se operan en céntimos enteros auditables sin redondeos imprecisos.
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statNumber} ${styles.statNumberViolet}`}>0</div>
            <div className={styles.statLabel}>Alucinaciones Financieras</div>
            <div className={styles.statDesc}>
              El agente nunca inventa saldos; opera exclusivamente mediante herramientas deterministas.
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>3.8x</div>
            <div className={styles.statLabel}>Aceleración de Amortización</div>
            <div className={styles.statDesc}>
              Ahorro promedio en intereses al aplicar los métodos Avalancha y Bola de Nieve.
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statNumber} ${styles.statNumberGreen}`}>&lt; 30s</div>
            <div className={styles.statLabel}>Conciliación de Extractos</div>
            <div className={styles.statDesc}>
              Parseo e ingesta masiva de CSV bancarios con mapeo inteligente de columnas.
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid de Features (Showcase con Animaciones) */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeadingBlock}>
          <div className={styles.sectionBadge}>ARQUITECTURA DE VANGUARDIA</div>
          <h2 className={styles.sectionTitle}>
            Diseñado para darte el control total de tu economía
          </h2>
          <p className={styles.sectionSubtitle}>
            De la conciliación bancaria al asesoramiento predictivo: una suite integral construida con
            arquitectura hexagonal y garantías de nivel bancario.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          {/* Card 1: AI Advisor (Span 2) */}
          <div className={`${styles.bentoCard} ${styles.bentoSpan2}`}>
            <div className={styles.bentoCardGlowTop} />
            <div>
              <div className={`${styles.bentoIconWrapper} ${styles.iconBgViolet}`}>
                <Bot size={26} />
              </div>
              <h3 className={styles.bentoTitle}>
                Agente FinanZIA: Tu CFO Personal con Herramientas Reales
              </h3>
              <p className={styles.bentoDesc}>
                No es un simple generador de texto. FinanZIA AI consulta tus cuentas, audita tus
                categorías, proyecta calendarios de deudas y formula propuestas interactivas que tú
                validas con un solo clic. Filosofía <strong>Human-in-the-loop</strong> sin sorpresas.
              </p>
            </div>
            <div className={styles.bentoHighlightPill}>
              <Sparkles size={13} />
              <span>8 Herramientas Financieras Autónomas Fuertemente Tipadas</span>
            </div>
          </div>

          {/* Card 2: Cero Floats */}
          <div className={styles.bentoCard}>
            <div className={styles.bentoCardGlowTop} />
            <div>
              <div className={`${styles.bentoIconWrapper} ${styles.iconBgEmerald}`}>
                <ShieldCheck size={26} />
              </div>
              <h3 className={styles.bentoTitle}>Integridad Matemática Absoluta</h3>
              <p className={styles.bentoDesc}>
                Prohibido el uso de coma flotante de JavaScript para dinero. Almacenamiento y cálculo
                estricto en céntimos enteros con cuadre de balance contable garantizado.
              </p>
            </div>
            <div className={styles.bentoHighlightPill}>
              <Check size={13} />
              <span>Cero Floats & Safe Math</span>
            </div>
          </div>

          {/* Card 3: Ingesta CSV */}
          <div className={styles.bentoCard}>
            <div className={styles.bentoCardGlowTop} />
            <div>
              <div className={`${styles.bentoIconWrapper} ${styles.iconBgBlue}`}>
                <FileSpreadsheet size={26} />
              </div>
              <h3 className={styles.bentoTitle}>Asistente de Ingesta CSV Universal</h3>
              <p className={styles.bentoDesc}>
                Importa extractos de cualquier entidad bancaria. Mapeo visual de columnas (Fecha,
                Concepto, Importe) y previsualización con filtrado automático de duplicados.
              </p>
            </div>
            <div className={styles.bentoHighlightPill}>
              <Zap size={13} />
              <span>Ingesta masiva en segundos</span>
            </div>
          </div>

          {/* Card 4: Estrategias de Deuda */}
          <div className={styles.bentoCard}>
            <div className={styles.bentoCardGlowTop} />
            <div>
              <div className={`${styles.bentoIconWrapper} ${styles.iconBgAmber}`}>
                <Flame size={26} />
              </div>
              <h3 className={styles.bentoTitle}>Estrategias de Desendeudamiento</h3>
              <p className={styles.bentoDesc}>
                Calculadora interactiva con algoritmos Avalancha y Bola de Nieve. Visualiza
                exactamente cuánto te ahorrarás en intereses TAE y en qué fecha serás 100% libre de deudas.
              </p>
            </div>
            <div className={styles.bentoHighlightPill}>
              <TrendingUp size={13} />
              <span>Ahorro de miles de euros en TAE</span>
            </div>
          </div>

          {/* Card 5: Presupuestos & Metas (Span 2) */}
          <div className={`${styles.bentoCard} ${styles.bentoSpan2}`}>
            <div className={styles.bentoCardGlowTop} />
            <div>
              <div className={`${styles.bentoIconWrapper} ${styles.iconBgRose}`}>
                <PieChart size={26} />
              </div>
              <h3 className={styles.bentoTitle}>Presupuestos Dinámicos & Metas de Ahorro</h3>
              <p className={styles.bentoDesc}>
                Establece techos de gasto mensuales por categoría con alertas visuales preventivas.
                Define metas con plazo horizonte y seguimiento automático del progreso respecto a
                tus excedentes de ahorro reales, todo sincronizado con tus cuentas bancarias.
              </p>
            </div>
            <div className={styles.bentoHighlightPill}>
              <Check size={13} />
              <span>Alertas preventivas de sobregasto</span>
            </div>
          </div>
        </div>
      </section>

      {/* Simulador Interactivo de Ahorro y Deudas en Vivo */}
      <section id="simulador" className={styles.simulatorSection}>
        <div className={styles.sectionHeadingBlock}>
          <div className={styles.sectionBadge}>SIMULADOR EN TIEMPO REAL</div>
          <h2 className={styles.sectionTitle}>Descubre cuánto puedes rescatar hoy mismo</h2>
          <p className={styles.sectionSubtitle}>
            Ajusta tu capacidad de reasignación mensual y observa el impacto multiplicador del interés
            compuesto o la cancelación de deudas con tipos altos.
          </p>
        </div>

        <div className={styles.simulatorCard}>
          {/* Slider 1: Reasignación Mensual */}
          <div className={styles.sliderWrapper}>
            <div className={styles.sliderHeader}>
              <label htmlFor={monthlySliderId} className={styles.sliderLabel}>
                Ahorro / Amortización Adicional Mensual
              </label>
              <span className={styles.sliderCurrentVal}>{formatEuro(monthlyCut)} / mes</span>
            </div>
            <input
              id={monthlySliderId}
              type="range"
              min="50"
              max="1000"
              step="25"
              value={monthlyCut}
              onChange={(e) => setMonthlyCut(Number(e.target.value))}
              className={styles.rangeInput}
              aria-label="Ahorro o amortización mensual"
            />
          </div>

          {/* Slider 2: Horizonte Temporal */}
          <div className={styles.sliderWrapper}>
            <div className={styles.sliderHeader}>
              <label htmlFor={yearsSliderId} className={styles.sliderLabel}>
                Plazo Temporal de la Estrategia
              </label>
              <span className={styles.sliderCurrentVal}>
                {horizonYears} {horizonYears === 1 ? 'año' : 'años'} ({totalMonths} meses)
              </span>
            </div>
            <input
              id={yearsSliderId}
              type="range"
              min="1"
              max="10"
              step="1"
              value={horizonYears}
              onChange={(e) => setHorizonYears(Number(e.target.value))}
              className={styles.rangeInput}
              aria-label="Plazo en años"
            />
          </div>

          {/* Slider 3: Rendimiento Anual / TAE Evitada */}
          <div className={styles.sliderWrapper}>
            <div className={styles.sliderHeader}>
              <label htmlFor={rateSliderId} className={styles.sliderLabel}>
                Rentabilidad Estimada o Interés TAE Evitado
              </label>
              <span className={styles.sliderCurrentVal}>{interestRate}% TAE</span>
            </div>
            <input
              id={rateSliderId}
              type="range"
              min="3"
              max="20"
              step="1"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className={styles.rangeInput}
              aria-label="Tasa de interés o rendimiento anual"
            />
          </div>

          {/* Resultados Calculados en Tiempo Real */}
          <div className={styles.simResultGrid}>
            <div className={styles.simMetricBox}>
              <div className={styles.simMetricLabel}>Capital Principal Rescatado</div>
              <div className={styles.simMetricNumber}>{formatEuro(baseSaved)}</div>
            </div>
            <div className={styles.simMetricBox}>
              <div className={styles.simMetricLabel}>Intereses Generados / Evitados</div>
              <div className={styles.simMetricNumber} style={{ color: '#A78BFA' }}>
                +{formatEuro(interestEarned)}
              </div>
            </div>
            <div className={styles.simMetricBox}>
              <div className={styles.simMetricLabel}>Impacto Patrimonial Total</div>
              <div className={`${styles.simMetricNumber} ${styles.simMetricNumberGreen}`}>
                {formatEuro(futureValue)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabla Comparativa: FinanZIA vs Apps Tradicionales */}
      <section id="comparativa" className={styles.comparisonSection}>
        <div className={styles.sectionHeadingBlock}>
          <div className={styles.sectionBadge}>¿POR QUÉ FINANZIA?</div>
          <h2 className={styles.sectionTitle}>Una categoría totalmente diferente</h2>
          <p className={styles.sectionSubtitle}>
            Comprueba por qué FinanZIA supera radicalmente a las herramientas clásicas de finanzas
            personales.
          </p>
        </div>

        <div className={styles.comparisonTableWrapper}>
          <table className={styles.compTable}>
            <thead>
              <tr>
                <th>Capacidad Técnica</th>
                <th>FinanZIA AI Platform</th>
                <th>Aplicaciones Tradicionales</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Agente Financiero Autónomo con Multi-Tools</td>
                <td className={styles.checkGreen}>✓ Sí (Acciones reales deterministas)</td>
                <td className={styles.crossRed}>✗ Solo chats estáticos o sin IA</td>
              </tr>
              <tr>
                <td>Aprobación Humana (Human-in-the-loop)</td>
                <td className={styles.checkGreen}>✓ Validación previa en cada operación</td>
                <td className={styles.crossRed}>✗ Sin agentes ejecutores</td>
              </tr>
              <tr>
                <td>Precisión Matemática</td>
                <td className={styles.checkGreen}>✓ Cero Floats: Céntimos enteros estrictos</td>
                <td className={styles.crossRed}>⚠ Coma flotante con imprecisiones</td>
              </tr>
              <tr>
                <td>Estrategias de Desendeudamiento</td>
                <td className={styles.checkGreen}>✓ Algoritmos Avalancha y Bola de Nieve</td>
                <td className={styles.crossRed}>✗ Registro pasivo sin optimización</td>
              </tr>
              <tr>
                <td>Asistente CSV Universal</td>
                <td className={styles.checkGreen}>✓ Mapeo flexible sin depender de bancos</td>
                <td className={styles.crossRed}>⚠ Suscripciones caras o bancos cerrados</td>
              </tr>
              <tr>
                <td>Privacidad & Aislamiento Multi-tenant</td>
                <td className={styles.checkGreen}>✓ Datos 100% aislados y encriptados</td>
                <td className={styles.crossRed}>⚠ Venta de datos para publicidad bancaria</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Preguntas Frecuentes (FAQ Accordion) */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeadingBlock}>
          <div className={styles.sectionBadge}>RESOLVEMOS TUS DUDAS</div>
          <h2 className={styles.sectionTitle}>Preguntas Frecuentes</h2>
        </div>

        <div className={styles.faqList}>
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={item.q}
                className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
              >
                <button
                  type="button"
                  className={styles.faqQuestionBtn}
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {isOpen && <div className={styles.faqAnswer}>{item.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Call to Action Final */}
      <section className={styles.finalCtaSection}>
        <div className={styles.finalCtaCard}>
          <h2 className={styles.finalCtaTitle}>¿Listo para tomar el control de tus finanzas?</h2>
          <p className={styles.finalCtaSubtitle}>
            Regístrate en FinanZIA en menos de un minuto. Comienza a registrar tus cuentas, salda tus
            deudas más rápido y deja que la IA trabaje para ti con rigor matemático.
          </p>
          <Link href="/register" className={styles.finalCtaBtn}>
            <span>Crear Cuenta Gratis Ahora</span>
            <ArrowRight size={20} />
          </Link>
          <div style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: '#9CA3AF' }}>
            Sin tarjeta de crédito requerida • Configuración inmediata • 100% Gratuito
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrandCol}>
            <Link href="/" className={styles.brandLink}>
              <div className={styles.brandIconWrapper}>⚡</div>
              <span className={styles.brandName}>
                Finan<span>ZIA</span>
              </span>
            </Link>
            <p className={styles.footerBrandDesc}>
              Plataforma inteligente de gestión de finanzas personales con IA verificable,
              arquitectura hexagonal y precisión matemática en céntimos enteros.
            </p>
          </div>

          <div className={styles.footerLinksCols}>
            <div>
              <div className={styles.footerColTitle}>Módulos</div>
              <ul className={styles.footerLinksList}>
                <li>
                  <a href="#showroom" className={styles.footerLinkItem}>
                    FinanZIA Advisor
                  </a>
                </li>
                <li>
                  <a href="#features" className={styles.footerLinkItem}>
                    Gestor de Deudas
                  </a>
                </li>
                <li>
                  <a href="#simulador" className={styles.footerLinkItem}>
                    Simulador en Vivo
                  </a>
                </li>
                <li>
                  <a href="#features" className={styles.footerLinkItem}>
                    Conciliación CSV
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className={styles.footerColTitle}>Seguridad</div>
              <ul className={styles.footerLinksList}>
                <li>
                  <span className={styles.footerLinkItem}>Cero Floats (Céntimos)</span>
                </li>
                <li>
                  <span className={styles.footerLinkItem}>Aislamiento Multi-Tenant</span>
                </li>
                <li>
                  <span className={styles.footerLinkItem}>Human-in-the-loop</span>
                </li>
                <li>
                  <span className={styles.footerLinkItem}>Cifrado JWT</span>
                </li>
              </ul>
            </div>

            <div>
              <div className={styles.footerColTitle}>Desarrollador</div>
              <ul className={styles.footerLinksList}>
                <li>
                  <a
                    href="http://localhost:3001/api/docs"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.footerLinkItem}
                  >
                    Documentación Swagger
                  </a>
                </li>
                <li>
                  <Link href="/login" className={styles.footerLinkItem}>
                    Iniciar Sesión
                  </Link>
                </li>
                <li>
                  <Link href="/register" className={styles.footerLinkItem}>
                    Crear Cuenta
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div>© {new Date().getFullYear()} FinanZIA. Todos los derechos reservados.</div>
          <div>Diseñado con rigor financiero y estética Dark Glassmorphism.</div>
        </div>
      </footer>
    </div>
  );
}
