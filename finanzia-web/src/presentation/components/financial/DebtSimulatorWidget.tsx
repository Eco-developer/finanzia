'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './DebtSimulatorWidget.module.css';
import {
  useDebts,
  type DebtPayoffPlanResult,
  type DebtPayoffStrategy,
} from '@/presentation/hooks/useDebts';

interface DebtSimulatorWidgetProps {
  hasActiveDebts: boolean;
}

export const DebtSimulatorWidget: React.FC<DebtSimulatorWidgetProps> = ({ hasActiveDebts }) => {
  const { simulatePayoff } = useDebts();
  const [extraMonthlyEuros, setExtraMonthlyEuros] = useState<number>(100);
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>('AVALANCHE');
  const [planResult, setPlanResult] = useState<DebtPayoffPlanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulation = useCallback(async (extraEuros: number, strat: DebtPayoffStrategy) => {
    if (!hasActiveDebts) return;
    setIsLoading(true);
    setError(null);
    try {
      const extraMonthlyCents = Math.round(extraEuros * 100);
      const result = await simulatePayoff({
        extraMonthlyCents,
        strategy: strat,
      });
      setPlanResult(result);
    } catch (err: any) {
      console.error('Error simulating payoff:', err);
      setError('No se pudo calcular la simulación de amortización.');
    } finally {
      setIsLoading(false);
    }
  }, [hasActiveDebts, simulatePayoff]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSimulation(extraMonthlyEuros, strategy);
    }, 250);
    return () => clearTimeout(timer);
  }, [extraMonthlyEuros, strategy, fetchSimulation]);

  const formatMoney = (centsStr: string | number) => {
    const num = typeof centsStr === 'string' ? parseInt(centsStr, 10) / 100 : centsStr / 100;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (!hasActiveDebts) {
    return (
      <div className={styles.container}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Simulador de Aceleración y Amortización</h3>
          <p className={styles.subtitle}>
            Añade deudas activas a tu cartera para calcular proyecciones de liquidación anticipada y ahorro de intereses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Simulador de Aceleración y Amortización
          </h3>
          <p className={styles.subtitle}>
            Proyecta cómo recortar años de deuda inyectando un esfuerzo mensual extra y compara estrategias.
          </p>
        </div>

        <div className={styles.strategySwitch}>
          <button
            type="button"
            className={`${styles.strategyBtn} ${strategy === 'AVALANCHE' ? styles.strategyBtnActive : ''}`}
            onClick={() => setStrategy('AVALANCHE')}
            title="Prioriza deudas con mayor tipo de interés TAE para minimizar el coste financiero total"
          >
            Avalancha (Mayor TAE)
          </button>
          <button
            type="button"
            className={`${styles.strategyBtn} ${strategy === 'SNOWBALL' ? styles.strategyBtnActive : ''}`}
            onClick={() => setStrategy('SNOWBALL')}
            title="Prioriza deudas con menor saldo para lograr victorias psicológicas tempranas"
          >
            Bola de Nieve (Menor Saldo)
          </button>
        </div>
      </div>

      <div className={styles.sliderSection}>
        <div className={styles.sliderHeader}>
          <span className={styles.sliderLabel}>Aportación Extra Mensual Destinada a Deuda</span>
          <span className={styles.sliderValue}>+{extraMonthlyEuros} € / mes</span>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="25"
          value={extraMonthlyEuros}
          onChange={(e) => setExtraMonthlyEuros(parseInt(e.target.value, 10))}
          className={styles.slider}
          aria-label="Aportación extra mensual"
        />
        <div className={styles.sliderTicks}>
          <span>0 €</span>
          <span>250 €</span>
          <span>500 €</span>
          <span>750 €</span>
          <span>1.000 €/mes</span>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

      {planResult && (
        <>
          <div className={styles.resultsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Tiempo para Deuda Cero
              </span>
              <span className={styles.metricValue}>
                {planResult.totalMonths}{' '}
                <span style={{ fontSize: '1rem', fontWeight: 500, color: '#94a3b8' }}>meses</span>
              </span>
              <span className={styles.metricSubtext}>
                {planResult.monthsSaved > 0
                  ? `¡Adelantas tu libertad financiera en ${planResult.monthsSaved} meses!`
                  : `Plazo base estimado a cuotas mínimas`}
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Intereses Totales a Pagar
              </span>
              <span className={styles.metricValue}>
                {formatMoney(planResult.totalInterestPaidCents)}
              </span>
              <span className={styles.metricSubtext}>
                Vs {formatMoney(planResult.baselineInterestPaidCents)} sin pagos extra
              </span>
            </div>

            <div className={`${styles.metricCard} ${styles.metricCardHighlight}`}>
              <span className={styles.metricLabel} style={{ color: '#10b981' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Ahorro Neto en Intereses
              </span>
              <span className={`${styles.metricValue} ${styles.metricValueEmerald}`}>
                {formatMoney(planResult.interestSavedCents)}
              </span>
              <span className={styles.metricSubtext} style={{ color: '#6ee7b7' }}>
                Capital que conservas íntegramente
              </span>
            </div>
          </div>

          {planResult.payoffOrder && planResult.payoffOrder.length > 0 && (
            <div className={styles.orderSection}>
              <h4 className={styles.orderTitle}>
                Orden de Cancelación Proyectado ({strategy === 'AVALANCHE' ? 'Método Avalancha' : 'Método Bola de Nieve'}):
              </h4>
              <div className={styles.orderList}>
                {planResult.payoffOrder.map((item, idx) => (
                  <div key={item.debtId} className={styles.orderItem}>
                    <div className={styles.orderItemLeft}>
                      <span className={styles.orderBadge}>{idx + 1}</span>
                      <span className={styles.orderConcept}>{item.concept}</span>
                    </div>
                    <div>
                      <span className={styles.orderFinish}>Liquidada en Mes {item.monthFinished}</span>
                      <span className={styles.orderInterest}>
                        Intereses acumulados: {formatMoney(item.interestPaidCents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
