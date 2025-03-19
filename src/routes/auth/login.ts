import { FastifyInstance } from "fastify";
import supabase from "../../supabase";
import { hashSHA256 } from "../../helpers/hash";

export async function loginRoute(fastify: FastifyInstance) {
  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    // Ambil data pengguna berdasarkan email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError) {
      console.error("Supabase user error:", userError);
      return reply
        .status(500)
        .send({ message: "Database error", error: userError });
    }

    if (!user) return reply.status(400).send({ message: "User not found" });

    // Verifikasi password
    const isValidPassword = hashSHA256(password) === user.password_hash;
    if (!isValidPassword)
      return reply.status(401).send({ message: "Invalid credentials" });

    // Pastikan status pengguna aktif
    if (user.status !== "active") {
      return reply.status(403).send({ message: `User is ${user.status}` });
    }

    // Ambil data platform_access untuk pengguna ini
    const { data: platformAccess, error: accessError } = await supabase
      .from("platform_access")
      .select(
        `
        id,
        platform_id,
        platforms (
          platform_id,
          platform_name,
          platform_desc
        )
      `
      )
      .eq("user_id", user.user_id);

    if (accessError) {
      console.error("Supabase platform_access error:", accessError);
      return reply
        .status(500)
        .send({
          message: "Error fetching platform access",
          error: accessError,
        });
    }

    // Buat token JWT dengan informasi pengguna
    const token = fastify.jwt.sign({
      id: user.user_id,
      email: user.email,
      platforms: platformAccess.map((access: any) => ({
        platform_id: access.platforms.platform_id,
        platform_name: access.platforms.platform_name,
      })),
    });

    // Kembalikan token dan data pengguna beserta platform yang diakses
    return reply.send({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        fullname: user.fullname,
        status: user.status,
        role: user.role,
        avatar: user.avatar,
      },
      platforms: platformAccess.map((access: any) => ({
        id: access.platforms.id,
        platform_id: access.platforms.platform_id,
        platform_name: access.platforms.platform_name,
        platform_desc: access.platforms.platform_desc,
      })),
    });
  });
}
