# 需求管理系统 - 问题排查指南

## 用户权限和评论功能问题

### 问题描述
1. 用户登录后显示为"提交者"而非超级管理员
2. 无法添加评论
3. 页面刷新体验不佳，没有实时更新

### 问题原因分析

#### 1. 用户权限问题
- **根本原因**: `comments` 表的 RLS 策略 `comments_insert_deny_auth` 设置为 `false`，阻止了所有插入操作
- **影响**: 即使是超级管理员也无法添加评论

#### 2. 用户角色显示问题
- **根本原因**: 用户在 `auth.users` 表中存在，但 `profiles` 表中缺少对应记录或角色设置不正确
- **影响**: 系统默认显示为"提交者"角色

#### 3. 实时更新问题
- **根本原因**: 使用传统的评论组件，每次操作都需要页面刷新
- **影响**: 用户体验差，无法实现类似微信的实时评论体验

### 解决方案

#### 1. 修复数据库权限策略
```sql
-- 删除阻止插入的策略
DROP POLICY IF EXISTS comments_insert_deny_auth ON comments;

-- 创建允许认证用户插入评论的策略
CREATE POLICY comments_insert_authenticated ON comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
```

#### 2. 修复用户档案
```sql
-- 为现有用户创建或更新档案
INSERT INTO profiles (id, name, role_id, user_id, full_name) 
VALUES (
  '88359a13-342c-4289-afc5-9b6a419aa78e',  -- 用户ID
  '刘台林',
  0,  -- 超级管理员
  '88359a13-342c-4289-afc5-9b6a419aa78e',
  '刘台林'
) 
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  user_id = EXCLUDED.user_id,
  full_name = EXCLUDED.full_name;
```

#### 3. 实时评论组件
- 创建了新的 `RealtimeComments` 组件
- 支持实时订阅数据库变更
- 乐观更新，提升用户体验
- 自动滚动到最新评论

### 技术改进

#### 1. 实时功能
- 使用 Supabase Realtime 订阅评论变更
- 实现乐观更新机制
- 添加加载状态和错误处理

#### 2. 用户体验优化
- 自动滚动到最新评论
- 实时显示新评论通知
- 优化评论输入和提交流程

#### 3. 权限管理
- 统一权限检查逻辑
- 支持管理员删除任意评论
- 普通用户只能删除自己的评论

### 使用说明

#### 1. 登录系统
使用邮箱 `lin88@iwishweb.com` 登录系统

#### 2. 检查权限
登录后应显示为"超级管理员"角色

#### 3. 测试评论功能
- 进入任意需求详情页面
- 尝试添加评论
- 验证实时更新功能

#### 4. 运行修复脚本（如需要）
```typescript
// 在浏览器控制台中运行
import { fixAuthIssues } from '@/scripts/fix-auth-issues'
await fixAuthIssues()
```

### 预防措施

#### 1. 数据库策略管理
- 定期检查 RLS 策略配置
- 确保策略逻辑正确
- 避免过于严格的限制策略

#### 2. 用户档案同步
- 实现用户注册时自动创建档案
- 添加档案完整性检查
- 定期同步用户数据

#### 3. 实时功能监控
- 监控 Realtime 连接状态
- 处理网络断开重连
- 优雅降级到轮询模式

### 常见问题

#### Q: 登录后仍显示为"提交者"
A: 检查 `profiles` 表中是否存在用户记录，确认 `role_id` 设置正确

#### Q: 评论功能仍然无法使用
A: 检查数据库 RLS 策略，确认 `comments_insert_authenticated` 策略已创建

#### Q: 实时更新不工作
A: 检查网络连接和 Supabase Realtime 配置，确认订阅正常建立

### 联系支持
如遇到其他问题，请联系技术支持团队。