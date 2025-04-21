import { FastifyInstance } from 'fastify'
import supabase from '../../supabase'

export default async function platformAccessRoutes(server: FastifyInstance) {
  server.get('/platform-access', async (req, reply) => {
    const { data, error } = await supabase
      .from('platform_access')
      .select(`
        id,
        created_at,
        user_id,
        platform_id,
        users (
          user_id,
          username,
          email,
          fullname,
          role,
          avatar,
          status
        ),
        platforms (
          platform_id,
          platform_name,
          platform_desc
        )
      `)

    if (error) {
      return reply.status(500).send({ message: 'Gagal mengambil data akses platform.', error })
    }

    return reply.send({ message: 'Berhasil mengambil data akses platform.', data })
  })

  server.get('/platform-access/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data, error } = await supabase
      .from('platform_access')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return reply.status(500).send({ message: 'Gagal mengambil data akses platform dengan ID tersebut.', error })
    }

    return reply.send({ message: 'Berhasil mengambil data akses platform.', data })
  })

  server.post('/platform-access', async (req, reply) => {
    const body = req.body as {
      user_id: number
      platform_id: number
    }

    const { data: existing, error: checkError } = await supabase
      .from('platform_access')
      .select('id')
      .eq('user_id', body.user_id)
      .eq('platform_id', body.platform_id)
      .maybeSingle()

    if (checkError) {
      return reply.status(500).send({ message: 'Gagal memeriksa data duplikat.', error: checkError })
    }

    if (existing) {
      return reply.status(409).send({
        message: 'Akses platform untuk user dan platform ini sudah ada.'
      })
    }

    const { data, error } = await supabase
      .from('platform_access')
      .insert([body])
      .select()

    if (error) {
      return reply.status(500).send({ message: 'Gagal menambahkan akses platform.', error })
    }

    return reply.code(201).send({ message: 'Akses platform berhasil ditambahkan.', data })
  })

  server.put('/platform-access/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as {
      user_id?: number
      platform_id?: number
    }

    const { data, error } = await supabase
      .from('platform_access')
      .update(body)
      .eq('id', id)
      .select()

    if (error) {
      return reply.status(500).send({ message: 'Gagal memperbarui akses platform.', error })
    }

    return reply.send({ message: 'Akses platform berhasil diperbarui.', data })
  })

  server.delete('/platform-access/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const { error } = await supabase
      .from('platform_access')
      .delete()
      .eq('id', id)

    if (error) {
      return reply.status(500).send({ message: 'Gagal menghapus akses platform.', error })
    }

    return reply.code(204).send()
  })
}
