import React, { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { techRequirementService, TechRequirement } from '@/services/tech-requirement-service'
import { logger } from '@/lib/logger'

function detectDelimiter(sample: string): string {
  const lines = sample.split(/\r?\n/).slice(0, 5)
  const counts = { ',': 0, ';': 0, '\t': 0 }
  for (const l of lines) {
    counts[','] += (l.match(/,/g) || []).length
    counts[';'] += (l.match(/;/g) || []).length
    counts['\t'] += (l.match(/\t/g) || []).length
  }
  let best: ',' | ';' | '\t' = ','
  if (counts[';'] > counts[best]) best = ';'
  if (counts['\t'] > counts[best]) best = '\t'
  return best
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  if (!text) return { headers: [], rows: [] }
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (c === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (!inQuotes && c === delimiter) {
      cur.push(field)
      field = ''
    } else if (!inQuotes && (c === '\n' || c === '\r')) {
      if (c === '\r' && next === '\n') i++
      cur.push(field)
      rows.push(cur)
      cur = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field)
    rows.push(cur)
  }

  const headers = rows[0]?.map((h) => h.trim()) || []
  const body = rows.slice(1).map((r) => {
    const arr = Array.from({ length: headers.length }, (_, idx) => (r[idx] ?? '').trim())
    return arr
  })
  return { headers, rows: body }
}

export default function RequirementImport() {
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [log, setLog] = useState<string[]>([])
  const navigate = useNavigate()
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // �?URL 参数或路径获取部门信�?
  const departmentParam = searchParams.get('department')
  const isDepartmentView = location.pathname.startsWith('/departments/')
  
  const department = departmentParam === 'tech' ? '技术部'
    : departmentParam === 'creative' ? '创意�?
    : isDepartmentView && location.pathname.includes('/tech') ? '技术部'
    : isDepartmentView && location.pathname.includes('/creative') ? '创意�?
    : '未分�?
    
  const type: 'tech' | 'creative' | undefined = department === '技术部' ? 'tech' 
    : department === '创意�? ? 'creative' 
    : undefined
    
  const departmentLabel = department === '技术部' ? '技术部' 
    : department === '创意�? ? '创意�? 
    : '通用'

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const { headers: H, rows: R } = parseCSV(text)
      setHeaders(H)
      setRows(R)
      setFileName(file.name)
      setLog([])
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!headers.length || !rows.length) return
    if (!user) {
      setLog(['请先登录后再导入'])
      navigate('/login')
      return
    }

    const parseDate = (dateStr: string): string | null => {
      if (!dateStr) return null
      const d = new Date(dateStr)
      return isNaN(d.getTime()) ? null : d.toISOString()
    }

    const validateUrgency = (urgency: string): '�? | '�? | '�? => {
      if (urgency === '�? || urgency === '�? || urgency === '�?) return urgency
      return '�?
    }

    const validateClientType = (clientType: string): '流量运营服务' | '全案深度服务' => {
      if (clientType === '流量运营服务' || clientType === '全案深度服务') return clientType
      return '流量运营服务'
    }

    const validateProgress = (progress: string): '未开�? | '处理�? | '已完�? | '已沟通延�? => {
      if (progress === '未开�? || progress === '处理�? || progress === '已完�? || progress === '已沟通延�?) return progress
      return '未开�?
    }

    try {
      if (type === 'tech') {
        const payload: Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>[] = rows.map((row, i) => {
          const raw: Record<string, string> = {}
          headers.forEach((h, idx) => {
            const key = h || `�?{idx + 1}列`
            raw[key] = row[idx] || ''
          })

          return {
            title: raw['需求标�?] || raw['标题'] || `未命名需�?${i + 1}`,
            month: raw['月份'] || new Date().getFullYear() + '�? + (new Date().getMonth() + 1) + '�?,
            submit_time: parseDate(raw['提交时间'] || raw['需求提交时�?]) || new Date().toISOString(),
            expected_completion_time: parseDate(raw['期望完成的时�?] || raw['期望完成时间']) || new Date().toISOString(),
            urgency: validateUrgency(raw['紧急程�?]),
            submitter_name: raw['提交人（直接使用用户名）'] || raw['提交�?] || user.name || '未知提交�?,
            client_url: raw['需支持的客户网址'] || raw['客户网址'] || undefined,
            description: raw['具体需求描�?] || raw['需求描�?] || `来源文件�?{fileName}\n导入时间�?{new Date().toLocaleString()}`,
            tech_assignee: raw['技术负责人'] || undefined,
            client_type: validateClientType(raw['客户类型（流量运营服�?全案深度服务�?] || raw['客户类型']),
            attachments: undefined,
            assignee_estimated_time: parseDate(raw['技术负责人预计可完成时�?]) || undefined,
            progress: validateProgress(raw['技术完成进度（未开�?处理�?已完�?已沟通延迟）'] || raw['技术完成进�?]),
            submitter_id: user.id,
            submitter_avatar: user.avatar,
          }
        })

        const result = await techRequirementService.importTechRequirements(payload)
        setLog([`导入完成：新�?${result.length} 条技术需求（部门�?{departmentLabel}）`])
        return
      }

      if (type === 'creative') {
        const payload = rows.map((row, i) => {
          const raw: Record<string, string> = {}
          headers.forEach((h, idx) => {
            const key = h || `�?{idx + 1}列`
            raw[key] = row[idx] || ''
          })

          const toInt = (v: string): number | null => {
            const n = parseInt(v, 10)
            return isNaN(n) ? null : n
          }

          return {
            submit_time: parseDate(raw['提交时间']) || new Date().toISOString(),
            expected_delivery_time: parseDate(raw['期望交付时间']),
            actual_delivery_time: parseDate(raw['实际交付时间']),
            submitter_name: raw['需求提交人'] || user.name || '未知提交�?,
            platform: (raw['平台(GG/FB/CT/网站)'] as any) || null,
            status: (raw['状态（未开�?处理�?已完�?不做处理�?] as any) || '未开�?,
            urgency: (raw['紧急程�?] as any) || '�?,
            designer: raw['设计�?] || undefined,
            site_name: raw['网站名称'] || undefined,
            url_or_product_page: raw['网址/产品详情�?] || undefined,
            asset_type: raw['素材类型（Google广告�?Meta广告�?网站Banner�?网站产品�?网站横幅�?联盟营销/EDM营销/Criteo广告图）'] || undefined,
            asset_size: raw['素材尺寸'] || undefined,
            layout_style: raw['设计版式'] || undefined,
            asset_count: toInt(raw['素材数量'] || ''),
            copy: raw['具体文案'] || undefined,
            style_requirements: raw['风格要求'] || undefined,
            original_assets: raw['原素�?] || undefined,
            asset_package: raw['素材�?] || undefined,
            remark: raw['备注'] || undefined,
            reference_examples: raw['参考案�?] || undefined,
          }
        })

        const { error } = await supabase.from('creative_requirements').insert(payload)
        if (error) throw error
        setLog([`导入完成：新�?${payload.length} 条创意部需求（部门�?{departmentLabel}）`])
        return
      }

      setLog(['未识别的部门，暂不导入。请在地址中指�??department=tech �??department=creative'])
    } catch (e: any) {
      logger.error('Requirement import failed', e)
      setLog([`导入失败�?{e?.message || '未知错误'}`])
    }
  }

  const disableImport = !headers.length || !rows.length

  const getReturnPath = () => {
    if (department === '技术部') {
      return '/departments/tech'
    } else if (department === '创意�?) {
      return '/departments/creative'
    }
    return '/requirements'
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">导入需求（CSV�?- {departmentLabel}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(getReturnPath())}>
            返回列表
          </Button>
          <Button onClick={handleImport} disabled={disableImport}>
            开始导�?
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>上传文件</CardTitle>
          <CardDescription>支持 CSV（UTF-8）。系统将按原始列展示与导入到 {departmentLabel}�?/CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>数据预览（前 10 行）</CardTitle>
            <CardDescription>以原�?CSV 列展示，用于核对解析是否正确�?/CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, idx) => (
                      <TableHead key={idx}>{h || `�?{idx + 1}列`}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((r, idx) => (
                    <TableRow key={idx}>
                      {headers.map((_, i) => (
                        <TableCell key={i}>{r[i]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {log.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>导入结果</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <div className="mt-4">
              <Button onClick={() => navigate(getReturnPath())}>查看需求列�?/Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
