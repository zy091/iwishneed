-- 创建评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id UUID NOT NULL,
  content TEXT NOT NULL,
  user_external_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建评论公开视图（匿名展示）
CREATE OR REPLACE VIEW comments_public AS
SELECT
  id,
  requirement_id,
  content,
  -- 隐藏真实用户ID，只保留前3个字符加上掩码
  CASE 
    WHEN LENGTH(user_external_id) > 5 
    THEN SUBSTRING(user_external_id, 1, 3) || '***' 
    ELSE '匿名用户'
  END AS user_id_masked,
  -- 隐藏真实邮箱，只保留用户名首字母和域名
  CASE 
    WHEN position('@' in user_email) > 1 
    THEN SUBSTRING(SPLIT_PART(user_email, '@', 1), 1, 1) || '***@' || SPLIT_PART(user_email, '@', 2)
    ELSE '匿名用户'
  END AS user_email_masked,
  created_at,
  updated_at
FROM comments;

-- 添加行级安全策略
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 创建策略：任何人都可以查看评论
CREATE POLICY "任何人都可以查看评论" ON comments
  FOR SELECT USING (true);

-- 创建策略：只有通过 Edge Function 才能添加评论（由 Edge Function 验证主项目令牌）
CREATE POLICY "只有通过 Edge Function 才能添加评论" ON comments
  FOR INSERT WITH CHECK (false);

-- 创建策略：只有通过 Edge Function 才能删除评论（由 Edge Function 验证主项目令牌和所有权）
CREATE POLICY "只有通过 Edge Function 才能删除评论" ON comments
  FOR DELETE USING (false);

-- 创建索引
CREATE INDEX IF NOT EXISTS comments_requirement_id_idx ON comments(requirement_id);
CREATE INDEX IF NOT EXISTS comments_user_external_id_idx ON comments(user_external_id);