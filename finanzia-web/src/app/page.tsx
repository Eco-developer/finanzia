import React from 'react';
import { MoneyDisplay } from '@/presentation/components/financial/MoneyDisplay';
import { Button } from '@/presentation/components/ui/Button';
import { Badge } from '@/presentation/components/ui/Badge';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.main}>
      {/* Header Superior */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>⚡</div>
          <div>
            <h1 className={styles.logoText}>Finan<span>ZIA</span></h1>
            <p className={styles.logoSubtitle}>Finanzas Personales con IA Verificable</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <a
            href="http://localhost:6006"
            target="_blank"
            rel="noreferrer"
            className={styles.headerLink}
          >
            📚 Storybook (UI)
          </a>
          <a
            href="http://localhost:3001/api/docs"
            target="_blank"
            rel="noreferrer"
            className={styles.headerLink}
          >
            📖 Swagger (API)
          </a>
          <Button variant="ai" size="sm">
            Asistente FinanZIA
          </Button>
        </div>
      </header>

      {/* Grid Principal de Resumen */}
      <section className={styles.dashboardGrid}>
        {/* Tarjeta: Patrimonio Total */}
        <div className={`glass-card ${styles.metricCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Patrimonio Líquido Total</span>
            <Badge variant="income">Activo</Badge>
          </div>
          <div className={styles.cardValue}>
            <MoneyDisplay cents={1485050} size="xl" colorCoded={false} />
          </div>
          <p className={styles.cardFooter}>Consolidado en 3 cuentas activas</p>
        </div>

        {/* Tarjeta: Ingresos del Mes */}
        <div className={`glass-card ${styles.metricCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Ingresos (Septiembre)</span>
            <Badge variant="income">+ Salario</Badge>
          </div>
          <div className={styles.cardValue}>
            <MoneyDisplay cents={280000} size="lg" showSign />
          </div>
          <p className={styles.cardFooter}>Nómina principal recibida</p>
        </div>

        {/* Tarjeta: Gastos del Mes */}
        <div className={`glass-card ${styles.metricCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Gastos Acumulados</span>
            <Badge variant="expense">Controlado</Badge>
          </div>
          <div className={styles.cardValue}>
            <MoneyDisplay cents={-115040} size="lg" showSign />
          </div>
          <p className={styles.cardFooter}>41% del límite presupuestado</p>
        </div>

        {/* Tarjeta: Ahorro Neto */}
        <div className={`glass-card ${styles.metricCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Tasa de Ahorro Real</span>
            <Badge variant="ai">58.9%</Badge>
          </div>
          <div className={styles.cardValue}>
            <MoneyDisplay cents={164960} size="lg" colorCoded />
          </div>
          <p className={styles.cardFooter}>Aportación directa a Fondo Emergencia</p>
        </div>
      </section>

      {/* Sección Inferior: Asistente Determinista + Transacciones */}
      <div className={styles.twoColumnSection}>
        {/* Columna Izquierda: Tarjeta Asistente IA */}
        <div className={`glass-card ${styles.aiCard}`}>
          <div className={styles.aiHeader}>
            <div className={styles.aiTitle}>
              <span className={styles.aiIcon}>🤖</span>
              <div>
                <h3>FinanZIA Advisor</h3>
                <span className={styles.aiTag}>Cero Alucinaciones · Cálculos Verificables</span>
              </div>
            </div>
            <Badge variant="ai">Gemini Tool Calling</Badge>
          </div>

          <div className={styles.aiDialogue}>
            <div className={styles.aiMessageUser}>
              "¿Cuánto he gastado este mes en ocio y cómo voy respecto al presupuesto?"
            </div>
            <div className={styles.aiMessageAssistant}>
              <div className={styles.toolProof}>
                ⚡ Invocó: <code>get_expenses_by_category("Ocio", 9, 2026)</code>
              </div>
              <p>
                En septiembre has gastado un total de{' '}
                <strong>
                  <MoneyDisplay cents={-14200} size="sm" />
                </strong>{' '}
                en la categoría de <strong>Ocio</strong> sobre un límite mensual de{' '}
                <strong>
                  <MoneyDisplay cents={15000} size="sm" colorCoded={false} />
                </strong>.
              </p>
              <p>
                Has consumido el <strong>94,6%</strong> del presupuesto. Te quedan{' '}
                <strong>
                  <MoneyDisplay cents={800} size="sm" colorCoded />
                </strong>{' '}
                para los próximos 17 días.
              </p>
            </div>
          </div>

          {/* Recomendación Human-in-the-Loop */}
          <div className={styles.recommendationBox}>
            <div className={styles.recHeader}>
              <span className={styles.recBadge}>Sugerencia Pendiente de Aprobación</span>
              <span className={styles.recStatus}>Status: PROPOSED</span>
            </div>
            <p className={styles.recText}>
              Aumentar el límite de Ocio en <strong>30,00 €</strong> reduciendo la misma cantidad del presupuesto de Suministros.
            </p>
            <div className={styles.recActions}>
              <Button variant="primary" size="sm">
                Aprobar y Aplicar
              </Button>
              <Button variant="ghost" size="sm">
                Descartar
              </Button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Movimientos Recientes */}
        <div className={`glass-card ${styles.transactionsCard}`}>
          <div className={styles.txHeader}>
            <h3>Transacciones Recientes</h3>
            <Button variant="secondary" size="sm">
              + Nueva Transacción
            </Button>
          </div>

          <div className={styles.txList}>
            <div className={styles.txRow}>
              <div className={styles.txInfo}>
                <div className={styles.txCategoryIcon}>🛒</div>
                <div>
                  <div className={styles.txDesc}>Compra Mercadona Gran Vía</div>
                  <div className={styles.txDate}>Ayer · Alimentación &gt; Supermercado</div>
                </div>
              </div>
              <MoneyDisplay cents={-4860} size="md" />
            </div>

            <div className={styles.txRow}>
              <div className={styles.txInfo}>
                <div className={styles.txCategoryIcon}>💼</div>
                <div>
                  <div className={styles.txDesc}>Nómina Empresa Tecnológica</div>
                  <div className={styles.txDate}>01 Sep · Trabajo Principal</div>
                </div>
              </div>
              <MoneyDisplay cents={280000} size="md" />
            </div>

            <div className={styles.txRow}>
              <div className={styles.txInfo}>
                <div className={styles.txCategoryIcon}>⛽</div>
                <div>
                  <div className={styles.txDesc}>Estación Repsol M-30</div>
                  <div className={styles.txDate}>28 Ago · Transporte &gt; Gasolina</div>
                </div>
              </div>
              <MoneyDisplay cents={-6500} size="md" />
            </div>

            <div className={styles.txRow}>
              <div className={styles.txInfo}>
                <div className={styles.txCategoryIcon}>🎬</div>
                <div>
                  <div className={styles.txDesc}>Suscripción Netflix</div>
                  <div className={styles.txDate}>24 Ago · Ocio &gt; Suscripciones</div>
                </div>
              </div>
              <MoneyDisplay cents={-1799} size="md" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
