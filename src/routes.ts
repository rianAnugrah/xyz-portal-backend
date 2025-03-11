import { FastifyInstance } from "fastify";
import supabase from "./supabase";

async function routes(fastify: FastifyInstance) {
  // Get all data
  fastify.get("/posts", async (request, reply) => {
    const { data, error } = await supabase.from("posts").select("*");
    if (error) return reply.status(500).send(error);
    return data;
  });

  // Get single post by ID
  fastify.get("/posts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data, error } = await supabase.from("posts").select("*").eq("id", id).single();
    if (error) return reply.status(500).send(error);
    return data;
  });

  // Create new post
  fastify.post("/posts", async (request, reply) => {
    const { title, content } = request.body as { title: string; content: string };
    const { data, error } = await supabase.from("posts").insert([{ title, content }]);
    if (error) return reply.status(500).send(error);
    return reply.status(201).send(data);
  });

  // Update post
  fastify.put("/posts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title, content } = request.body as { title: string; content: string };
    const { data, error } = await supabase.from("posts").update({ title, content }).eq("id", id);
    if (error) return reply.status(500).send(error);
    return data;
  });

  // Delete post
  fastify.delete("/posts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return reply.status(500).send(error);
    return reply.status(204).send();
  });
}

export default routes;
