-- 1) 扩展评论表：一级回复 + 附件计数
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id UUID NULL,
  ADD COLUMN IF NOT EXISTS attachments_count INT NOT NULL DEFAULT 0;

-- 外键（删除父评论时级联删除其回复）
DO $$ BEGIN
  ALTER TABLE comments
    ADD CONSTRAINT comments_parent_fk
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) 附件表
CREATE TABLE IF NOT EXISTS comment_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;

-- 只读策略（任何人都可通过视图读取元数据）
DO $$ BEGIN
  CREATE POLICY "任何人都可以查看评论附件" ON comment_attachments
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS comment_attachments_comment_id_idx ON comment_attachments(comment_id);

-- 3) 更新匿名视图，增加 parent_id 与 attachments_count
CREATE OR REPLACE VIEW comments_public AS
SELECT
  id,
  requirement_id,
  content,
  CASE 
    WHEN LENGTH(user_external_id) > 5 
    THEN SUBSTRING(user_external_id, 1, 3) || '***' 
    ELSE '匿名用户'
  END AS user_id_masked,
  CASE 
    WHEN position('@' in user_email) > 1 
    THEN SUBSTRING(SPLIT_PART(user_email, '@', 1), 1, 1) || '***@' || SPLIT_PART(user_email, '@', 2)
    ELSE '匿名用户'
  END AS user_email_masked,
  parent_id,
  attachments_count,
  created_at,
  updated_at
FROM comments;

-- 4) 附件公开视图（仅元数据，不含真实权限）
CREATE OR REPLACE VIEW comment_attachments_public AS
SELECT
  id,
  comment_id,
  file_path,
  file_name,
  mime_type,
  size,
  created_at
FROM comment_attachments;

-- 5) 创建存储桶（私有）
INSERT INTO storage.buckets (id, name, public)
VALUES ('comments-attachments', 'comments-attachments', false)
ON CONFLICT (id) DO NOTHING;