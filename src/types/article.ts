export interface Article {
    _id: number;
    article_id?: number;
    platform_id: number;
    title: string;
    caption?: string | null;
    type: string;
    image?: string | null;
    image_alt?: string | null;
    image_description?: string | null;
    meta_title?: string | null;
    scheduled_at?: number | null;
    date: number;
    slug: string;
    content?: string | null;
    tags?: any; // jsonb
    description?: string | null;
    category?: any; // jsonb
    author_id?: number;
    status: string;
    approved_by?: number;
    approved_at: number;
    is_deleted: boolean;
    created_at: number;
    updated_at: number;
    views?: number;
}

export interface CreateArticleInput {
    platform_id: number;
    title: string;
    type?: string;
    image?: string;
    image_alt?: string;
    image_description?: string;
    meta_title?: string;
    scheduled_at?: number;
    slug: string;
    content?: string;
    tags?: any;
    description?: string;
    category?: any;
    author_id?: number;
    status?: string;
    approved_by?: number;
}

// Tambahkan di akhir file src/types/article.ts
export interface ArticleQueryParams {
    page?: string;           // Nomor halaman untuk pagination
    limit?: string;          // Jumlah item per halaman
    sortBy?: string;         // Kolom untuk sorting (misal: "title", "created_at")
    sortOrder?: 'asc' | 'desc'; // Urutan sorting
    search?: string;         // Pencarian berdasarkan title atau description
    tags?: string;           // Filter berdasarkan tags (JSON string atau comma-separated)
    category?: string;       // Filter berdasarkan category (JSON string atau comma-separated)
    status?: string;         // Filter berdasarkan status
  }