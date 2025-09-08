import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { staffService, type Staff, type StaffDepartment } from '@/services/staff-service'
import { Badge } from '@/components/ui/badge'

export default function StaffManagementPage() {
  const [list, setList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [dept, setDept] = useState<StaffDepartment>('技术部')

  const load = async () => {
    setLoading(true)
    try {
      const data = await staffService.listStaff()
      setList(data)
    } catch (e) {
      console.error('加载人员失败', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const addStaff = async () => {
    if (!name.trim()) return
    try {
      await staffService.createStaff({ name: name.trim(), department: dept, active: true })
      setName('')
      await load()
    } catch (e) {
      console.error('新增失败', e)
    }
  }

  const toggleActive = async (s: Staff) => {
    try {
      await staffService.updateStaff(s.id!, { active: !s.active })
      await load()
    } catch (e) {
      console.error('更新失败', e)
    }
  }

  const changeDept = async (s: Staff, d: StaffDepartment) => {
    try {
      await staffService.updateStaff(s.id!, { department: d })
      await load()
    } catch (e) {
      console.error('更新失败', e)
    }
  }

  const remove = async (s: Staff) => {
    if (!s.id) return
    try {
      await staffService.deleteStaff(s.id)
      await load()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>用户管理（人员与角色）</CardTitle>
          <CardDescription>管理技术/创意人员名单（用于负责人/设计师选择）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input className="w-64" placeholder="人员姓名" value={name} onChange={e => setName(e.target.value)} />
            <Select value={dept} onValueChange={(v) => setDept(v as StaffDepartment)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="部门" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="技术部">技术部</SelectItem>
                <SelectItem value="创意部">创意部</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addStaff}>新增人员</Button>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4}>加载中...</TableCell></TableRow>
                ) : list.length ? list.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Select value={s.department} onValueChange={(v) => changeDept(s, v as StaffDepartment)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="技术部">技术部</SelectItem>
                          <SelectItem value="创意部">创意部</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{s.active ? <Badge className="bg-green-500">启用</Badge> : <Badge variant="secondary">停用</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => toggleActive(s)}>{s.active ? '停用' : '启用'}</Button>
                        <Button variant="outline" onClick={() => remove(s)}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center">暂无数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}