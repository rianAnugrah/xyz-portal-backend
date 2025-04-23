import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { hashSHA256 } from "../../helpers/hash";
import { authMiddleware } from "../auth-middleware";

export async function userRoutes(fastify: FastifyInstance) {
  // CREATE - Register new user with platform access
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
        platform_ids = [],
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
        platform_ids?: number[];
      };

      const hashedPassword = hashSHA256(password);

      const { data: user, error: userError } = await supabase
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

      if (userError) return reply.status(500).send(userError);

      if (platform_ids.length > 0) {
        const platformAccessInserts = platform_ids.map((platform_id) => ({
          user_id: user.user_id,
          platform_id,
        }));

        const { error: accessError } = await supabase
          .from("platform_access")
          .insert(platformAccessInserts);

        if (accessError)
          return reply.status(500).send({ message: "User created but failed to assign platforms", error: accessError });
      }

      return reply.status(201).send({ message: "User created successfully", data: user });
    }
  );

  // READ - Get all users with platform access
  fastify.get("/users", async (request, reply) => {
    const { data, error } = await supabase
      .from("users")
      .select("*, platform_access(*, platforms(*))")
      .order("created_at", { ascending: false });

    if (error) return reply.status(500).send(error);
    return reply.send(data);
  });

  // READ - Get user by ID with platform access
  fastify.get("/users/:user_id", async (request, reply) => {
    const { user_id } = request.params as { user_id: string };

    const { data, error } = await supabase
      .from("users")
      .select("*, platform_access(*, platforms(*))")
      .eq("user_id", user_id)
      .single();

    if (error) return reply.status(404).send({ error: "User not found" });
    return reply.send(data);
  });

  // UPDATE - Update user and platform access
  fastify.put(
    "/users/:user_id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { user_id } = request.params as { user_id: string };
      const {
        username,
        password,
        old_password,
        email,
        status,
        fullname,
        first_name,
        last_name,
        role,
        avatar,
        platform_ids,
      } = request.body as {
        username?: string;
        password?: string;
        old_password?: string;
        email?: string;
        status?: string;
        fullname?: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        avatar?: string;
        platform_ids?: number[];
      };
  
      if (password) {
        const { data: currentUser, error: fetchError } = await supabase
          .from("users")
          .select("password_hash")
          .eq("user_id", user_id)
          .single();
  
        if (fetchError || !currentUser) {
          return reply.status(404).send({
            message: "User not found or error fetching user data",
            error: fetchError,
          });
        }
  
        if (!old_password) {
          return reply.status(400).send({
            message: "Old password is required when updating password",
          });
        }
  
        const oldPasswordHash = hashSHA256(old_password);
        if (oldPasswordHash !== currentUser.password_hash) {
          return reply.status(401).send({
            message: "Old password is incorrect",
          });
        }
      }
  
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
  
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("user_id", user_id)
        .select()
        .single();
  
      if (updateError) return reply.status(500).send(updateError);
  
      // Handle platform access update
      if (platform_ids) {
        // Delete old platform access
        await supabase.from("platform_access").delete().eq("user_id", user_id);
  
        // Insert new platform access
        if (platform_ids.length > 0) {
          const platformAccessInserts = platform_ids.map((platform_id) => ({
            user_id: updatedUser.user_id,
            platform_id,
          }));
  
          const { error: insertError } = await supabase
            .from("platform_access")
            .insert(platformAccessInserts);
  
          if (insertError) return reply.status(500).send(insertError);
        }
      }
  
      // Fetch the updated user data with platform access
      const { data: finalUser, error: fetchError } = await supabase
        .from("users")
        .select("*, platform_access(*, platforms(*))")
        .eq("user_id", updatedUser.user_id)
        .single();
  
      if (fetchError) return reply.status(500).send(fetchError);
  
      return reply.send({ message: "User updated successfully", data: finalUser });
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