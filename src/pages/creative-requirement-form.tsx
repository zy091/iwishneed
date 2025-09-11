import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { creativeRequirementService } from '@/services/creative-requirement-service'
import type { CreativeRequirement } from '@/types/requirement'

const PLATFORMS = ['GG', 'FB', 'CT', '网站'] as const
const STATUSES = ['未开始', '处理中', '已完成', '不做处理'] as const
const URGENCIES = ['高', '中', '低'] as const
const ASSET_TYPES = [
  'Google广告素材','Meta广告素材','网站Banner素材','网站产品素材','网站横幅素材','联盟营销','EDM营销','Criteo广告素材'
] as const

export default function CreativeRequirementForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [designers, setDesigners] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<Partial<CreativeRequirement>>({
    submit_time: new Date().toISOString(),
    platform: 'GG',
    status: '未开始',
    urgency: '中',
  })

  useEffect(() => {
    const run = async () => {
      try {
        const ds = await creativeRequirementService.getDesigners()
        setDesigners(ds)
        if (profile?.name && !isEdit) {
          handleChange('submitter_name', profile.name)
        }
      } catch (e) {
        console.error('获取设计师失败', e)
      }
    }
    run()
  }, [profile, isEdit])

  useEffect(() => {
    const load = async () => {
      if (!isEdit || !id) return
      try {
        const data = await creativeRequirementService.getCreativeRequirement(id)
        if (data) {
          setForm(data)
        }
      } catch (e) {
        console.error('获取创意需求失败', e)
      }
    }
    load()
  }, [isEdit, id])

  const handleChange = (key: keyof CreativeRequirement, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    // 验证必填字段
    if (!form.title?.trim()) {
      alert('请填写需求标题')
      return
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await creativeRequirementService.updateCreativeRequirement(id, form)
      } else {
        // 创建新需求时添加submitter_id和必需字段
        const formWithSubmitter = {
          ...form,
          submitter_id: profile?.id,
          title: form.title?.trim() || '',
          status: form.status || '未开始',
          urgency: form.urgency || '中',
          platform: form.platform || 'GG',
          submitter_name: form.submitter_name || profile?.name || ''
        } as Omit<CreativeRequirement, 'id' | 'created_at' | 'updated_at'>
        await creativeRequirementService.createCreativeRequirement(formWithSubmitter)
      }
      navigate('/departments/creative')
    } catch (e) {
      console.error('保存失败:', e)
      alert('保存失败，请检查填写的信息是否完整')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isEdit ? '编辑创意需求' : '提交创意需求'}</h1>
        <Button variant="secondary" onClick={() => navigate('/departments/creative')}>
          返回列表
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>创意需求信息</CardTitle>
          <CardDescription>请按照飞书表格格式填写完整的创意需求信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>需求标题 *</Label>
              <Input
                value={form.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="请输入需求标题"
                required
              />
            </div>
            <div>
              <Label>需求描述</Label>
              <Textarea
                value={form.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="请详细描述需求内容"
                rows={3}
              />
            </div>
          </div>

          {/* 时间信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>提交时间</Label>
              <Input
                type="date"
                value={form.submit_time ? new Date(form.submit_time).toISOString().slice(0,10) : ''}
                onChange={(e) => handleChange('submit_time', e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : undefined)}
              />
            </div>
            <div>
              <Label>期望交付时间</Label>
              <Input
                type="date"
                value={form.expected_delivery_time ? new Date(form.expected_delivery_time).toISOString().slice(0,10) : ''}
                onChange={(e) => handleChange('expected_delivery_time', e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : undefined)}
              />
            </div>
            <div>
              <Label>实际交付时间</Label>
              <Input
                type="date"
                value={form.actual_delivery_time ? new Date(form.actual_delivery_time).toISOString().slice(0,10) : ''}
                onChange={(e) => handleChange('actual_delivery_time', e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : undefined)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>提交人</Label>
              <Input
                value={form.submitter_name || ''}
                readOnly
                className="bg-gray-50"
                placeholder="自动填充当前用户"
              />
            </div>
            <div>
              <Label>平台</Label>
              <Select value={form.platform || ''} onValueChange={(v) => handleChange('platform', v)}>
                <SelectTrigger><SelectValue placeholder="选择平台" /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>状态</Label>
              <Select value={form.status || ''} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>紧急程度</Label>
              <Select value={form.urgency || ''} onValueChange={(v) => handleChange('urgency', v)}>
                <SelectTrigger><SelectValue placeholder="选择紧急程度" /></SelectTrigger>
                <SelectContent>
                  {URGENCIES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>设计师</Label>
              <Select value={form.designer || ''} onValueChange={(v) => handleChange('designer', v)}>
                <SelectTrigger><SelectValue placeholder="选择设计师" /></SelectTrigger>
                <SelectContent>
                  {designers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>网站名称</Label>
              <Input value={form.site_name || ''} onChange={(e) => handleChange('site_name', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>网址/产品详情页</Label>
              <Input value={form.url_or_product_page || ''} onChange={(e) => handleChange('url_or_product_page', e.target.value)} />
            </div>
            <div>
              <Label>素材类型</Label>
              <Select value={form.asset_type || ''} onValueChange={(v) => handleChange('asset_type', v)}>
                <SelectTrigger><SelectValue placeholder="选择素材类型" /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>素材尺寸</Label>
              <Input value={form.asset_size || ''} onChange={(e) => handleChange('asset_size', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>设计版式</Label>
              <Input value={form.layout_style || ''} onChange={(e) => handleChange('layout_style', e.target.value)} />
            </div>
            <div>
              <Label>素材数量</Label>
              <Input
                type="number"
                value={form.asset_count ?? ''}
                onChange={(e) => handleChange('asset_count', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              />
            </div>
            <div>
              <Label>备注</Label>
              <Input value={form.remark || ''} onChange={(e) => handleChange('remark', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>具体文案</Label>
              <Textarea value={form.copy || ''} onChange={(e) => handleChange('copy', e.target.value)} rows={4} />
            </div>
            <div>
              <Label>风格要求</Label>
              <Textarea value={form.style_requirements || ''} onChange={(e) => handleChange('style_requirements', e.target.value)} rows={4} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>原素材（链接或说明）</Label>
              <Textarea value={form.original_assets || ''} onChange={(e) => handleChange('original_assets', e.target.value)} rows={3} />
            </div>
            <div>
              <Label>素材包（链接或说明）</Label>
              <Textarea value={form.asset_package || ''} onChange={(e) => handleChange('asset_package', e.target.value)} rows={3} />
            </div>
          </div>

          <div>
            <Label>参考案例（链接或说明）</Label>
            <Textarea value={form.reference_examples || ''} onChange={(e) => handleChange('reference_examples', e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="secondary" onClick={() => navigate('/departments/creative')}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? '保存中...' : (isEdit ? '更新需求' : '提交需求')}
            </Button>
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}