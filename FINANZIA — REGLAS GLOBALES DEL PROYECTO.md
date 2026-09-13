## Contexto general del proyecto

Estamos desarrollando una aplicación web local de finanzas personales con inteligencia artificial multiagente.

El proyecto se desarrollará, ejecutará y probará completamente en entorno local. Durante esta etapa NO se realizará ningún despliegue real en la nube ni se contratarán servicios cloud.

La plataforma cloud objetivo para un futuro despliegue será Microsoft Azure. El despliegue en Azure solo se planificará y documentará; no se ejecutará salvo autorización expresa y posterior del usuario.

## Stack tecnológico previsto

- Frontend: Next.js con TypeScript.
- Backend: NestJS con TypeScript.
- Base de datos: PostgreSQL ejecutándose localmente.
- ORM: Prisma o Drizzle, según decisión documentada.
- Inteligencia artificial: Gemini API, utilizada exclusivamente desde el backend.
- Contenedores locales: Docker y Docker Compose.
- Control de versiones: Git y GitHub.
- Automatización: GitHub Actions para validaciones y CI.
- Futuro despliegue: Microsoft Azure.
- Documentación: Markdown y PDF cuando corresponda.

## Reglas de ejecución local

1. Todo el sistema debe poder ejecutarse localmente.
2. PostgreSQL debe configurarse y ejecutarse localmente, preferiblemente mediante Docker Compose.
3. Los servicios auxiliares necesarios deberán ejecutarse localmente siempre que sea técnicamente viable.
4. No se deben crear recursos, cuentas, bases de datos ni servicios en Azure durante esta fase.
5. No se deben contratar servicios de pago sin autorización expresa del usuario.
6. Antes de instalar software, dependencias globales, motores, herramientas o servicios locales, el agente debe explicar:
   - Qué instalará.
   - Para qué se necesita.
   - Qué cambios realizará.
   - Qué requisitos tiene.
   - Cómo se podrá desinstalar o revertir.
7. Ninguna instalación o modificación del entorno local se realizará sin autorización previa del usuario.
8. El agente debe priorizar soluciones reproducibles mediante Docker y Docker Compose.
9. Las claves de Gemini y cualquier otro secreto deben mantenerse fuera del frontend, del repositorio y de los logs.
10. Nunca se utilizarán números de coma flotante para representar importes monetarios.
11. No se deben ejecutar migraciones destructivas ni eliminar datos sin autorización explícita.
12. Todas las decisiones técnicas relevantes deben documentarse.
13. Ningún agente debe afirmar que una tarea fue completada sin mostrar evidencia verificable.
14. El despliegue futuro en Azure debe quedar documentado, pero no ejecutado.
15. Prevención de loops y bloqueos: Si una orden, tarea o comando dura más de 10 minutos, se debe detener el proceso inmediatamente y solicitar revisión al usuario para evitar bucles infinitos y consumo descontrolado de recursos.