import { createClient } from "@supabase/supabase-js";
import { FastifyInstance } from "fastify";
import mysql from "mysql2";
import supabase from "../../supabase"; // Pastikan ini sudah benar

// Setup MySQL connection
const mysqlConnection = mysql.createConnection({
  host: "localhost", // Ganti dengan host MySQL
  user: "root", // Ganti dengan user MySQL
  password: "root", // Ganti dengan password MySQL
  database: "local", // Ganti dengan nama database MySQL
});

// Query untuk mengambil artikel secara batch dari MySQL
const query_get_all_articles = `
SELECT p.ID, p.post_status, p.post_title
FROM wpi6_posts p
WHERE p.post_status = 'publish' AND p.post_type = 'post'
ORDER BY p.ID DESC
LIMIT 10000 OFFSET 1188;
`;

// Fungsi untuk memeriksa apakah string valid JSON
function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fungsi untuk migrasi artikel dari MySQL ke Supabase
async function migrateArticles() {
  let migratedCount = 1188; // Counter untuk jumlah artikel yang berhasil dimigrasi

  return new Promise<void>((resolve, reject) => {
    mysqlConnection.query(query_get_all_articles, async (err, results) => {
      if (err) {
        reject(`Error fetching articles: ${err}`);
        return;
      }

      // Pastikan results di-cast ke format yang sesuai (rows)
      const rows = results as mysql.RowDataPacket[];

      for (const row of rows) {
        const articleId = row.ID;

        // Ambil detail artikel berdasarkan ID
        mysqlConnection.query(
          `SELECT 
                p.ID, p.post_title, p.post_date, p.post_content, p.post_excerpt,
                p.post_name, p.post_status, p.post_type, u.display_name, 
                u.ID AS author_id, img.meta_value AS headline_image_url, 
                alt.meta_value AS headline_image_alt, COUNT(ar.article_id) AS post_views,
                CONCAT('[', GROUP_CONCAT(DISTINCT CASE WHEN tt.taxonomy != 'category' THEN CONCAT('"', t.name, '"') END SEPARATOR ','), ']') AS taxonomies,
                GROUP_CONCAT(DISTINCT tt.taxonomy) AS taxonomy_types, 
                MAX(CASE WHEN tt.taxonomy = 'category' THEN t.name END) AS category
              FROM wpi6_posts p
              LEFT JOIN wpi6_users u ON p.post_author = u.ID
              LEFT JOIN wpi6_postmeta pm ON pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id'
              LEFT JOIN wpi6_postmeta img ON img.post_id = pm.meta_value AND img.meta_key = '_wp_attached_file'
              LEFT JOIN wpi6_postmeta alt ON alt.post_id = pm.meta_value AND alt.meta_key = '_wp_attachment_image_alt'
              LEFT JOIN wpi6_term_relationships tr ON tr.object_id = p.ID
              LEFT JOIN wpi6_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
              LEFT JOIN wpi6_terms t ON tt.term_id = t.term_id
              LEFT JOIN wpi6_posts a ON a.post_parent = p.ID AND a.post_type = 'attachment'
              LEFT JOIN wpi6_postmeta mt_title ON mt_title.post_id = p.ID AND mt_title.meta_key = '_yoast_wpseo_title'
              LEFT JOIN wpi6_postmeta mt_desc ON mt_desc.post_id = p.ID AND mt_desc.meta_key = '_yoast_wpseo_metadesc'
              LEFT JOIN article_reads ar ON p.ID = ar.article_id
              WHERE p.post_status = 'publish' AND p.ID = ? 
              GROUP BY p.ID, p.post_title, p.post_date, p.post_content, p.post_name, p.post_status, 
                p.post_type, u.display_name, img.meta_value, alt.meta_value`,
          [articleId],
          async (err, articleDetails) => {
            if (err) {
              console.error("Error fetching article details:", err);
              return;
            }

            const details = articleDetails as mysql.RowDataPacket[];

            if (details.length > 0) {
              const article = details[0];

              // Menyusun data yang akan dimigrasi ke Supabase
              const articleData = {
                article_id: article.ID,
                title: article.post_title,
                platform_id: 1, // Sesuaikan dengan platform_id yang relevan
                type: article.post_type || "",
                image: article.headline_image_url || "",
                image_alt: article.headline_image_alt || "",
                date: article.post_date,
                slug: article.post_name || "",
                content: article.post_content || "",
                //tags: article.taxonomies ? JSON.parse(article.taxonomies) : [],
                description: article.post_excerpt || "",
                category: isValidJson(article.category)
                  ? JSON.parse(article.category)
                  : [article.category], // Periksa validitas JSON
                tags: isValidJson(article.taxonomies)
                  ? JSON.parse(article.taxonomies)
                  : [article.taxonomies], // Periksa validitas JSON
                author_id: article.author_id,
                status: article.post_status,
                approved_by: 0, // Sesuaikan jika perlu
                approved_at: new Date(),
                views: article.post_views || 0,
                caption: "",
                image_description: "",
                meta_title: article.mt_title || "",
                scheduled_at: article.scheduled_at || null,
                image_title: article.image_title || "",
              };

              // Menyimpan data ke Supabase
              const { data, error } = await supabase
                .from("articles")
                .insert([articleData]);

              if (error) {
                console.error("Error inserting article to Supabase:", error);
              } else {
                migratedCount++; // Tambahkan ke counter setelah migrasi sukses
                console.log(
                  `Article migrated successfully. Total articles migrated: ${migratedCount}`
                );
                await delay(0);
              }
            }
          }
        );
      }
      resolve();
    });
  });
}

export async function migrateArticle(fastify: FastifyInstance) {
  // Endpoint untuk memulai migrasi
  fastify.post("/migrate-articles", async (request, reply) => {
    try {
      await migrateArticles();
      reply.send({ message: "Articles migration started." });
    } catch (err) {
      console.error("Migration error:", err);
      reply.status(500).send({ message: "Error migrating articles." });
    }
  });
}
