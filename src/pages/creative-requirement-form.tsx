import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { creativeRequirementService, CreativeRequirement } from '@/services/creative-requirement-service'
import { useAuth } from '@/hooks/use-auth'

const PLATFORMS = ['GG', 'FB', 'CT', '网站'] as const
const STATUSES = ['未开始', '处理中', '已完成', '不做处理'] as const
const URGENCIES = ['高', '中', '低'] as const
const ASSET_TYPES = [
  'Google广告图','Meta广告图','网站Banner图','网站产品图','网站横幅图','联盟营销','EDM营销','Criteo广告图'
] as const

export default function CreativeRequirementForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()

  const [designers, setDesigners] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<Omit<CreativeRequirement, 'id' | 'created_at' | 'updated_at'>>({
    submit_time: new Date().toISOString(),
    expected_delivery_time: undefined,
    actual_delivery_time: undefined,
    submitter_name: user?.name || '',
    platform: 'GG',
    status: '未开始',
    urgency: '中',
    designer: undefined,
    site_name: '',
    url_or_product_page: '',
    asset_type: undefined,
    asset_size: '',
    layout_style: '',
    asset_count: undefined,
    copy: '',
    style_requirements: '',
    original_assets: '',
    asset_package: '',
    remark: '',
    reference_examples: '',
  })

  useEffect(() => {
    const run = async () => {
      try {
        const ds = await creativeRequirementService.getDesigners()
        setDesigners(ds)
      } catch (e) {
        console.error('获取设计师失败:', e)
      }
    }
    run()
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!isEdit || !id) return
      try {
        const data = await creativeRequirementService.getCreativeRequirement(id)
        if (data) {
          const { id: _id, created_at, updated_at, ...rest } = data
          setForm({
            ...rest
          })
        }
      } catch (e) {
        console.error('获取创意需求失败:', e)
      }
    }
    load()
  }, [isEdit, id])

  const handleChange = (key: keyof typeof form, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (isEdit && id) {
        await creativeRequirementService.updateCreativeRequirement(id, form as any)
      } else {
        await creativeRequirementService.createCreativeRequirement(form as any)
      }
      navigate('/departments/creative')
    } catch (e) {
      console.error('保存失败:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{isEdit ? '编辑创意需求' : '新建创意需求'}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/departments/creative')}>返回列表</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
          <CardDescription>按需填写以下字段</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>提交时间</Label>
              <Input
                type="datetime-local"
                value={form.submit_time ? new Date(form.submit_time).toISOString().slice(0,16) : ''}
                onChange={(e) => handleChange('submit_time', new Date(e.target.value).toISOString())}
              />
            </div>
            <div>
              <Label>期望交付时间</Label>
              <Input
                type="datetime-local"
                value={form.expected_delivery_time ? new Date(form.expected_delivery_time).toISOString().slice(0,16) : ''}
                onChange={(e) => handleChange('expected_delivery_time', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
            </div>
            <div>
              <Label>实际交付时间</Label>
              <Input
                type="datetime-local"
                value={form.actual_delivery_time ? new Date(form.actual_delivery_time).toISOString().slice(0,16) : ''}
                onChange={(e) => handleChange('actual_delivery_time', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>提交人</Label>
              <Input
                value={form.submitter_name || ''}
                onChange={(e) => handleChange('submitter_name', e.target.value)}
                placeholder="提交人姓名"
              />
            </div>
            <div>
              <Label>平台</Label>
              <Select value={(form.platform as any) || ''} onValueChange={(v) => handleChange('platform', v as any)}>
                <SelectTrigger><SelectValue placeholder="选择平台" /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>状态</Label>
              <Select value={(form.status as any) || ''} onValueChange={(v) => handleChange('status', v as any)}>
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
              <Select value={(form.urgency as any) || ''} onValueChange={(v) => handleChange('urgency', v as any)}>
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
              <Select value={(form.asset_type as any) || ''} onValueChange={(v) => handleChange('asset_type', v as any)}>
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
        </CardContent>
      </Card>
    </div>
  )
}