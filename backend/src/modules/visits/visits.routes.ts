import type { FastifyInstance } from 'fastify';
import { patientIdParamSchema } from '../patients/patients.schema.js';
import { createVisitSchema, evolutionQuerySchema } from './visits.schema.js';
import { createVisit, getEvolution, listVisits } from './visits.service.js';

export async function visitsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/patients/:id/visits',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['visits'],
        summary: 'Inserir nova visita (UC05). Exige ≥1 campo (422). Retorna alertas e novo risco.',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const { id } = patientIdParamSchema.parse(request.params);
      const input = createVisitSchema.parse(request.body);
      const authorId = request.user.sub;
      const result = await createVisit(app, id, authorId, input);
      return reply.status(201).send(result);
    },
  );

  app.get(
    '/patients/:id/visits',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['visits'],
        summary: 'Histórico de visitas por data (UC06 tabela).',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request) => {
      const { id } = patientIdParamSchema.parse(request.params);
      return listVisits(app, id);
    },
  );

  app.get(
    '/patients/:id/evolution',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['visits'],
        summary: 'Evolução por métrica (UC06 gráfico). metrics=pa,glicemia,ldl,hba1c,peso',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } } },
        querystring: { type: 'object', properties: { metrics: { type: 'string' } } },
      },
    },
    async (request) => {
      const { id } = patientIdParamSchema.parse(request.params);
      const { metrics } = evolutionQuerySchema.parse(request.query);
      return getEvolution(app, id, metrics);
    },
  );
}
