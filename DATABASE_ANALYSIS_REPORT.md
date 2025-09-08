# 📊 数据库结构分析与优化建议

## 🎯 当前数据库状态总结

### ✅ 核心表结构（保留 - 符合业务需求）
1. **tech_requirements** - 技术部需求表 ✅
2. **creative_requirements** - 创意部需求表 ✅
3. **tech_staff** - 人员管理表 ✅
4. **comments** - 评论系统表 ✅
5. **comment_attachments** - 评论附件表 ✅

### ⚠️ 问题表结构（需要优化）
6. **app_admins** - 管理员表（结构过于简单）
7. **roles** - 角色表（与profiles关联有问题）
8. **profiles** - 用户档案表（字段不完整）
9. **admin_audit_logs** - 审计日志表（字段不匹配服务层）
10. **requirement_activity_logs** - 活动日志表 ✅

### 🔧 企业级功能
- **requirements_unified** 视图 ✅ （统一查询接口）
- **完整的RLS策略** ✅
- **自动化触发器** ✅
- **企业级函数** ✅

## 🚨 发现的主要问题

### 1. **重复的RLS策略**
```sql
-- 发现多个重复的策略，如：
- comments_delete 和 comments_delete_owner_or_admin
- comment_attachments_insert 和 comment_attachments_insert_auth
- comments_read_all 和 comments_select
```

### 2. **重复的触发器**
```sql
-- 发现重复的updated_at触发器：
- trg_creative_requirements_updated_at
- update_creative_requirements_updated_at
- update_tech_requirements_updated_at
```

### 3. **表结构不一致**
- `app_admins` 表只有 `user_id` 字段，缺少企业服务需要的字段
- `profiles` 表字段与类型定义不匹配
- `admin_audit_logs` 表字段与服务层期望不符

### 4. **不必要的函数**
- `exec_sql` - 安全风险，应删除
- `update_current_user_profile` - 可用标准操作替代

## 🔧 优化建议

### 立即需要修复的问题：

#### 1. 清理重复的RLS策略
```sql
-- 删除重复策略，保留更完整的版本
DROP POLICY IF EXISTS "comments_delete" ON comments;
DROP POLICY IF EXISTS "comment_attachments_insert_auth" ON comment_attachments;
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comment_attachments_select" ON comment_attachments;
```

#### 2. 修复表结构
```sql
-- 修复app_admins表
ALTER TABLE app_admins ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
ALTER TABLE app_admins ADD COLUMN IF NOT EXISTS email text NOT NULL;
ALTER TABLE app_admins ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE app_admins ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';
ALTER TABLE app_admins ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]';
ALTER TABLE app_admins ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE app_admins ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE app_admins ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 修复profiles表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- 修复admin_audit_logs表
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS admin_id text;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS admin_name text;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS target_id text;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS old_values jsonb;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS new_values jsonb;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS user_agent text;
```

#### 3. 删除不安全的函数
```sql
DROP FUNCTION IF EXISTS exec_sql(text);
```

#### 4. 清理重复触发器
```sql
-- 保留标准的updated_at触发器
DROP TRIGGER IF EXISTS trg_creative_requirements_updated_at ON creative_requirements;
DROP TRIGGER IF EXISTS update_tech_requirements_updated_at ON tech_requirements;
```

### 可选优化：

#### 1. 添加缺失的索引
```sql
-- 提升查询性能
CREATE INDEX IF NOT EXISTS idx_tech_requirements_submitter ON tech_requirements(submitter_id);
CREATE INDEX IF NOT EXISTS idx_tech_requirements_assignee ON tech_requirements(tech_assignee);
CREATE INDEX IF NOT EXISTS idx_creative_requirements_submitter ON creative_requirements(submitter_id);
CREATE INDEX IF NOT EXISTS idx_creative_requirements_designer ON creative_requirements(designer);
CREATE INDEX IF NOT EXISTS idx_comments_requirement ON comments(requirement_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_requirement ON requirement_activity_logs(requirement_id, requirement_type);
```

#### 2. 添加数据验证约束
```sql
-- 确保数据质量
ALTER TABLE tech_requirements ADD CONSTRAINT check_progress 
    CHECK (progress IN ('未开始', '处理中', '已完成', '已沟通延迟'));
    
ALTER TABLE creative_requirements ADD CONSTRAINT check_platform 
    CHECK (platform IN ('GG', 'FB', 'CT', '网站') OR platform IS NULL);
```

## 📋 建议的操作优先级

### 🔴 高优先级（立即执行）
1. 清理重复的RLS策略
2. 修复表结构不匹配问题
3. 删除不安全的函数

### 🟡 中优先级（本周内）
1. 添加性能索引
2. 清理重复触发器
3. 添加数据验证约束

### 🟢 低优先级（可选）
1. 优化视图查询性能
2. 添加更多企业级函数
3. 完善监控和日志

## 🎯 最终目标

优化后的数据库将具备：
- ✅ 清晰的表结构，无冗余
- ✅ 高效的查询性能
- ✅ 完善的安全策略
- ✅ 企业级功能支持
- ✅ 与服务层完全匹配

## 🚀 执行建议

建议按以下顺序执行优化：
1. 先备份当前数据库
2. 在测试环境执行优化脚本
3. 验证所有功能正常
4. 在生产环境执行优化

这样可以确保系统稳定性和数据安全。