// routes/users.ts
import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { hashSHA256 } from "../../helpers/hash";
import { authMiddleware } from "../auth-middleware";

export async function userRoutes(fastify: FastifyInstance) {
  // CREATE - Register new user
  fastify.post(
    "/users",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const {
        username,
        password,
        email,
        status = "active",
        fullname,
        first_name,
        last_name,
        role,
        avatar,
      } = request.body as {
        username: string;
        password: string;
        email: string;
        status?: string;
        fullname?: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        avatar?: string;
      };

      const hashedPassword = hashSHA256(password);

      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            username,
            password_hash: hashedPassword,
            email,
            status,
            fullname,
            first_name,
            last_name,
            role,
            avatar,
            created_at: new Date(),
          },
        ])
        .select()
        .single();

      if (error) return reply.status(500).send(error);
      return reply
        .status(201)
        .send({ message: "User created successfully", data });
    }
  );

  // READ - Get all users
  fastify.get("/users", async (request, reply) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return reply.status(500).send(error);
    return reply.send(data);
  });

  // READ - Get user by ID
  fastify.get("/users/:user_id", async (request, reply) => {
    const { user_id } = request.params as { user_id: string };

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (error) return reply.status(404).send({ error: "User not found" });
    return reply.send(data);
  });

  // UPDATE - Update user
  fastify.put(
    "/users/:user_id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { user_id } = request.params as { user_id: string };
      const {
        username,
        password,
        email,
        status,
        fullname,
        first_name,
        last_name,
        role,
        avatar,
      } = request.body as {
        username?: string;
        password?: string;
        email?: string;
        status?: string;
        fullname?: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        avatar?: string;
      };

      const updateData: any = {};
      if (username) updateData.username = username;
      if (password) updateData.password_hash = hashSHA256(password);
      if (email) updateData.email = email;
      if (status) updateData.status = status;
      if (fullname) updateData.fullname = fullname;
      if (first_name) updateData.first_name = first_name;
      if (last_name) updateData.last_name = last_name;
      if (role) updateData.role = role;
      if (avatar) updateData.avatar = avatar;

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("user_id", user_id)
        .select()
        .single();

      if (error) return reply.status(500).send(error);
      return reply.send({ message: "User updated successfully", data });
    }
  );

  // DELETE - Delete user
  fastify.delete(
    "/users/:user_id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { user_id } = request.params as { user_id: string };

      const { error } = await supabase
        .from("users")
        .delete()
        .eq("user_id", user_id);

      if (error) return reply.status(500).send(error);
      return reply.status(204).send({ message: "User deleted successfully" });
    }
  );
}
