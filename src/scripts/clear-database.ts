import { supabase } from '@/lib/supabaseClient'

/**
 * 清空数据库中的所有需求数据
 * 注意：这个操作不可逆，请谨慎使用
 */
export async function clearAllRequirements() {
  try {
    console.log('开始清空数据库...')
    
    // 清空技术需求表
    const { error: techError } = await supabase
      .from('tech_requirements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有记录
    
    if (techError) {
      console.error('清空技术需求表失败:', techError)
      throw techError
    }
    
    console.log('✅ 技术需求表已清空')
    
    // 清空创意需求表
    const { error: creativeError } = await supabase
      .from('requirements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有记录
    
    if (creativeError) {
      console.error('清空创意需求表失败:', creativeError)
      throw creativeError
    }
    
    console.log('✅ 创意需求表已清空')
    
    // 清空用户活动记录表（如果存在）
    const { error: activityError } = await supabase
      .from('user_activities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有记录
    
    if (activityError && activityError.code !== 'PGRST116') { // PGRST116 表示表不存在，可以忽略
      console.error('清空用户活动表失败:', activityError)
      throw activityError
    }
    
    console.log('✅ 用户活动表已清空')
    
    console.log('🎉 数据库清空完成！')
    
    return {
      success: true,
      message: '数据库已成功清空'
    }
    
  } catch (error) {
    console.error('清空数据库失败:', error)
    return {
      success: false,
      message: `清空失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * 获取当前数据库统计信息
 */
export async function getDatabaseStats() {
  try {
    // 获取技术需求数量
    const { count: techCount, error: techError } = await supabase
      .from('tech_requirements')
      .select('*', { count: 'exact', head: true })
    
    if (techError) {
      console.error('获取技术需求统计失败:', techError)
    }
    
    // 获取创意需求数量
    const { count: creativeCount, error: creativeError } = await supabase
      .from('requirements')
      .select('*', { count: 'exact', head: true })
    
    if (creativeError) {
      console.error('获取创意需求统计失败:', creativeError)
    }
    
    // 获取用户活动数量
    const { count: activityCount, error: activityError } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
    
    if (activityError && activityError.code !== 'PGRST116') {
      console.error('获取用户活动统计失败:', activityError)
    }
    
    return {
      techRequirements: techCount || 0,
      creativeRequirements: creativeCount || 0,
      userActivities: activityCount || 0,
      total: (techCount || 0) + (creativeCount || 0)
    }
    
  } catch (error) {
    console.error('获取数据库统计失败:', error)
    return {
      techRequirements: 0,
      creativeRequirements: 0,
      userActivities: 0,
      total: 0
    }
  }
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  // Node.js 环境
  const readline = require('readline')
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  async function main() {
    console.log('🚨 警告：此操作将清空数据库中的所有需求数据！')
    console.log('这个操作不可逆，请确保你真的要执行此操作。')
    
    // 先显示当前统计
    const stats = await getDatabaseStats()
    console.log('\n当前数据库统计:')
    console.log(`- 技术需求: ${stats.techRequirements} 条`)
    console.log(`- 创意需求: ${stats.creativeRequirements} 条`)
    console.log(`- 用户活动: ${stats.userActivities} 条`)
    console.log(`- 总计: ${stats.total} 条需求\n`)
    
    rl.question('请输入 "CONFIRM" 来确认清空操作: ', async (answer) => {
      if (answer === 'CONFIRM') {
        const result = await clearAllRequirements()
        console.log(result.message)
      } else {
        console.log('操作已取消')
      }
      rl.close()
    })
  }
  
  main().catch(console.error)
}