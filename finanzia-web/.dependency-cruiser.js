/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // =========================================================================
    // PASO 3: REGLAS GENERALES DEL PROYECTO
    // =========================================================================
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Prohíbe dependencias circulares: ningún archivo puede depender, directa o indirectamente, ' +
        'de otro archivo que termine dependiendo de él mismo.',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'Advierte sobre archivos huérfanos en el proyecto. ' +
        'Se excluyen páginas de Next.js (src/app/**), configuración, historias de Storybook y tests.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)src/app/',
          '(^|/)src/middleware\\.ts$',
          '(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|json)$',
          '[.]d[.]ts$',
          '(^|/)tsconfig.*[.]json$',
          '(^|/)next\\.config.*',
          '(^|/)stories/',
          '\\.stories\\.tsx?$',
          '(^|/)tests/',
          '\\.spec\\.tsx?$',
          '\\.test\\.tsx?$'
        ]
      },
      to: {}
    },

    // =========================================================================
    // PASO 5: REGLAS DEL FRONTEND HEXAGONAL (finanzia-web / client)
    // =========================================================================
    {
      name: 'client-domain-no-react-next',
      severity: 'error',
      comment:
        'El dominio del cliente (src/core/domain) debe ser código puro TypeScript agnóstico. ' +
        'No puede importar React, ReactDOM ni Next.js para preservar la independencia del framework visual.',
      from: {
        path: '^src/core/domain'
      },
      to: {
        path: '^react$|^react-dom$|^next'
      }
    },
    {
      name: 'client-application-no-react',
      severity: 'error',
      comment:
        'Los casos de uso del cliente (src/core/application) no deben depender directamente de React. ' +
        'La integración con componentes visuales se delega a los hooks dentro de la capa de presentación.',
      from: {
        path: '^src/core/application'
      },
      to: {
        path: '^react$|^react-dom$'
      }
    },
    {
      name: 'client-application-no-concrete-infra',
      severity: 'error',
      comment:
        'Los casos de uso del cliente no deben acoplarse directamente a implementaciones concretas de infraestructura (HTTP clients, localStorage). ' +
        'Deben consumir interfaces o abstracciones definidas en el núcleo.',
      from: {
        path: '^src/core/application'
      },
      to: {
        path: '^src/infrastructure'
      }
    },
    {
      name: 'client-ui-components-no-infra',
      severity: 'error',
      comment:
        'Los componentes de presentación visual (src/presentation/components) no deben invocar infraestructura ni clientes HTTP directamente. ' +
        'Deben interactuar a través de custom hooks (src/presentation/hooks) o la capa de aplicación.',
      from: {
        path: '^src/presentation/components'
      },
      to: {
        path: '^src/infrastructure'
      }
    },

    // =========================================================================
    // PASO 6: SEPARACIÓN CLIENTE / SERVIDOR (CRÍTICO EN NEXT.JS)
    // =========================================================================
    {
      name: 'client-never-import-server',
      severity: 'error',
      comment:
        'CRÍTICO: El código de cliente (finanzia-web) jamás puede importar código ni módulos de finanzia-api ' +
        'ni librerías exclusivas de backend (@prisma/client, argon2, pg) para evitar fugas de lógica sensible o secretos al navegador.',
      from: {
        path: '^src'
      },
      to: {
        path: 'finanzia-api|@prisma/client|argon2|passport'
      }
    },
    {
      name: 'pages-no-backend-infra',
      severity: 'error',
      comment:
        'Las páginas de Next.js (src/app) tienen terminantemente prohibido importar infraestructura de backend ' +
        'o persistencia directa de base de datos.',
      from: {
        path: '^src/app'
      },
      to: {
        path: 'finanzia-api/src/infrastructure|@prisma'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    exclude: {
      path: ['^node_modules', '^.next', '^coverage', '^tests', '^stories', '^.storybook']
    },
    tsConfig: {
      fileName: './tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)'
      },
      archi: {
        collapsePattern: '^(?:src/core/[^/]+|src/[^/]+)'
      },
      text: {
        highlightFocused: true
      }
    }
  }
};
