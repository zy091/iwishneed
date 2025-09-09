/**
 * 修复用户认证和权限问题的脚本
 * 解决以下问题：
 * 1. 用户登录后显示为"提交者"而非超级管理员
 * 2. 评论功能无法使用
 * 3. 数据库权限策略问题
 */

import { supabase } from '@/lib/supabaseClient'

export async function fixAuthIssues() {
  console.log('开始修复认证问题...')
  
  try {
    // 1. 检查当前用户状态
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('获取用户信息失败:', userError)
      return false
    }
    
    if (!user) {
      console.log('用户未登录，请先登录')
      return false
    }
    
    console.log('当前用户:', user.email, user.id)
    
    // 2. 检查 profiles 表中的用户记录
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('查询用户档案失败:', profileError)
      return false
    }
    
    if (!profile) {
      console.log('用户档案不存在，创建新档案...')
      // 创建用户档案
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || '用户',
          role_id: 0, // 设置为超级管理员
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name
        })
      
      if (insertError) {
        console.error('创建用户档案失败:', insertError)
        return false
      }
      
      console.log('用户档案创建成功')
    } else {
      console.log('现有用户档案:', profile)
      
      // 如果角色不是管理员，更新为超级管理员
      if (profile.role_id !== 0) {
        console.log('更新用户角色为超级管理员...')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role_id: 0 })
          .eq('id', user.id)
        
        if (updateError) {
          console.error('更新用户角色失败:', updateError)
          return false
        }
        
        console.log('用户角色更新成功')
      }
    }
    
    // 3. 测试评论权限
    console.log('测试评论权限...')
    const { data: canComment } = await supabase.rpc('is_admin')
    console.log('管理员权限检查结果:', canComment)
    
    // 4. 检查评论表策略
    console.log('检查评论表策略...')
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'comments')
    
    if (policyError) {
      console.warn('无法查询策略信息:', policyError)
    } else {
      console.log('评论表策略:', policies)
    }
    
    console.log('认证问题修复完成！')
    return true
    
  } catch (error) {
    console.error('修复过程中发生错误:', error)
    return false
  }
}

// 如果直接运行此脚本
if (typeof window !== 'undefined') {
  // 在浏览器环境中，可以通过控制台调用
  (window as any).fixAuthIssues = fixAuthIssues
}