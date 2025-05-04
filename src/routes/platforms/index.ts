import { FastifyInstance } from "fastify";
import supabase from "../../supabase";

export default async function platformRoutes(server: FastifyInstance) {
  server.get("/platforms", async (req, reply) => {
    const { data, error } = await supabase
      .from("platforms")
      .select("*")
      .order("platform_id", { ascending: true });

    if (error) {
      return reply
        .status(500)
        .send({ message: "Gagal mengambil data platform.", error });
    }

    return reply.send({
      message: "Berhasil mengambil data platform.",
      data,
    });
  });

  server.get("/platforms/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const { data, error } = await supabase
      .from("platforms")
      .select("*")
      .eq("platform_id", id)
      .single();

    if (error) {
      return reply
        .status(404)
        .send({ message: "Platform tidak ditemukan.", error });
    }

    return reply.send({
      message: "Berhasil mengambil detail platform.",
      data,
    });
  });

  server.post("/platforms", async (req, reply) => {
    const body = req.body as {
      platform_id: number;
      platform_name?: string;
      platform_desc?: string;
      logo_url?: string;
    };

    const { data, error } = await supabase.from("platforms").insert(body).select();

    if (error) {
      return reply
        .status(400)
        .send({ message: "Gagal menambahkan platform.", error });
    }

    return reply.send({
      message: "Platform berhasil ditambahkan.",
      data,
    });
  });

  server.put("/platforms/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      platform_name?: string;
      platform_desc?: string;
      logo_url?: string;
    };

    const { data, error } = await supabase
      .from("platforms")
      .update(body)
      .eq("platform_id", id)
      .select();

    if (error) {
      return reply
        .status(400)
        .send({ message: "Gagal memperbarui platform.", error });
    }

    return reply.send({
      message: "Platform berhasil diperbarui.",
      data,
    });
  });

  server.delete("/platforms/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const { error } = await supabase
      .from("platforms")
      .delete()
      .eq("platform_id", id);

    if (error) {
      return reply
        .status(500)
        .send({ message: "Gagal menghapus platform.", error });
    }

    return reply.send({
      message: "Platform berhasil dihapus.",
    });
  });
}
