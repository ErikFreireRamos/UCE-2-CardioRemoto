import type { FastifyInstance } from 'fastify';
import { createPatientSchema, listPatientsQuerySchema, patientIdParamSchema } from './patients.schema.js';
import { createPatient, getPatient, listPatients } from './patients.service.js';

export async function patientsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/patients',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['patients'],
        summary: 'Cadastrar paciente (UC02). CPF duplicado → 409.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const input = createPatientSchema.parse(request.body);
      const patient = await createPatient(app, input);
      return reply.status(201).send(patient);
    },
  );

  app.get(
    '/patients',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['patients'],
        summary: 'Listar pacientes (UC03/UC04). Filtro risk=, ordenação sort=visitPriority, busca search=.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            risk: { type: 'string', enum: ['todos', 'verde', 'amarelo', 'vermelho', 'sem_dados'] },
            sort: { type: 'string', enum: ['visitPriority', 'name'] },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const query = listPatientsQuerySchema.parse(request.query);
      return listPatients(app, query);
    },
  );

  app.get(
    '/patients/:id',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['patients'],
        summary: 'Perfil do paciente + controle atual + fatores de risco.',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request) => {
      const { id } = patientIdParamSchema.parse(request.params);
      return getPatient(app, id);
    },
  );
}
