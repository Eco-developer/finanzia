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
        'de otro archivo que termine dependiendo de él mismo para evitar acoplamientos estrechos y bloqueos en ejecución.',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'Advierte sobre archivos huérfanos que ningún módulo importa en el proyecto (posible código muerto o desuso). ' +
        'Se excluyen archivos de configuración, bootstrap principal (main.ts), tipos y tests.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)src/main\\.ts$',
          '(^|/)src/app\\.module\\.ts$',
          '(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|json)$',
          '[.]d[.]ts$',
          '(^|/)tsconfig.*[.]json$',
          '(^|/)test/',
          '\\.spec\\.ts$',
          '\\.e2e-spec\\.ts$'
        ]
      },
      to: {}
    },

    // =========================================================================
    // PASO 4: REGLAS DEL BACKEND HEXAGONAL (finanzia-api / server)
    // =========================================================================
    {
      name: 'server-domain-no-infra',
      severity: 'error',
      comment:
        'El dominio del backend no puede depender de la infraestructura. ' +
        'Las entidades y reglas de negocio puras no deben conocer detalles de base de datos, ORMs ni servicios externos.',
      from: {
        path: '^src/core/domain'
      },
      to: {
        path: '^src/infrastructure'
      }
    },
    {
      name: 'server-domain-no-application',
      severity: 'error',
      comment:
        'El dominio del backend no puede depender de los casos de uso (application). ' +
        'El flujo de dependencias en Clean Architecture debe ir de la periferia hacia el núcleo, nunca al revés.',
      from: {
        path: '^src/core/domain'
      },
      to: {
        path: '^src/core/application'
      }
    },
    {
      name: 'server-domain-framework-agnostic',
      severity: 'error',
      comment:
        'El dominio debe ser totalmente agnóstico de frameworks y librerías externas. ' +
        'Tiene prohibido importar NestJS (@nestjs), Prisma (@prisma), Next.js o librerías externas de transporte o persistencia.',
      from: {
        path: '^src/core/domain'
      },
      to: {
        dependencyTypes: ['npm', 'npm-dev'],
        pathNot: ['^rxjs'] // utilidades puras si aplica
      }
    },
    {
      name: 'server-application-no-concrete-infra',
      severity: 'error',
      comment:
        'Los casos de uso (core/application) no deben depender de implementaciones concretas de infraestructura. ' +
        'Deben comunicarse mediante interfaces (puertos) ubicados en el dominio o la capa de aplicación para permitir inversión de dependencias.',
      from: {
        path: '^src/core/application'
      },
      to: {
        path: '^src/infrastructure'
      }
    },
    {
      name: 'server-application-no-web-framework',
      severity: 'error',
      comment:
        'Los casos de uso no deben depender de objetos de transporte web de frameworks (como Request/Response de Express o Next.js), ' +
        'preservando la neutralidad de protocolo.',
      from: {
        path: '^src/core/application'
      },
      to: {
        path: 'next|@nestjs/platform-express|express'
      }
    },
    {
      name: 'server-routes-no-direct-infra',
      severity: 'error',
      comment:
        'Los controladores de la API (presentation/controllers) solo pueden comunicarse con la capa de casos de uso (application); ' +
        'tienen prohibido interactuar directamente con repositorios de base de datos o infraestructura.',
      from: {
        path: '^src/presentation/controllers'
      },
      to: {
        path: '^src/infrastructure/database'
      }
    },
    {
      name: 'server-routes-no-direct-domain-instance',
      severity: 'warn',
      comment:
        'Los controladores deberían delegar la orquestación en la capa de casos de uso (application) ' +
        'en lugar de instanciar y mutar entidades de dominio por su cuenta.',
      from: {
        path: '^src/presentation/controllers'
      },
      to: {
        path: '^src/core/domain/entities'
      }
    },

    // =========================================================================
    // PASO 6: SEPARACIÓN CLIENTE / SERVIDOR
    // =========================================================================
    {
      name: 'server-never-import-client',
      severity: 'error',
      comment:
        'El código del servidor nunca puede importar código del cliente (finanzia-web, React o Next.js), ' +
        'evitando dependencias cruzadas con capas de presentación frontend.',
      from: {
        path: '^src'
      },
      to: {
        path: 'finanzia-web|^react$|^react-dom$|^next$'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    exclude: {
      path: ['^node_modules', '^dist', '^coverage', '^test']
    },
    tsConfig: {
      fileName: './tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.json']
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
