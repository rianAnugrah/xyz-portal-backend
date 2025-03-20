import { FastifyInstance } from "fastify";
import { getEditorChoices } from "./read";
import { createEditorChoices } from "./create";

export default async function editorChoicesRoutes(fastify: FastifyInstance) {
  await Promise.all([getEditorChoices(fastify), createEditorChoices(fastify)]);
}
