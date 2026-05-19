import { PrismaClient, Role, ComplaintStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function ensureOrg(name: string) {
  let o = await prisma.organization.findFirst({ where: { name } })
  if (!o) o = await prisma.organization.create({ data: { name } })
  return o
}

async function main() {
  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: {
      siteName: '자율보고 처리 시스템',
      logoText: '자율보고 처리',
      primaryColor: '#2563eb',
      accentColor: '#7c3aed',
    },
    create: {
      id: 'singleton',
      siteName: '자율보고 처리 시스템',
      logoText: '자율보고 처리',
      primaryColor: '#2563eb',
      accentColor: '#7c3aed',
    },
  })

  const orgMain = await ensureOrg('환경부')
  await ensureOrg('○○광역시')

  const adminPassword = await bcrypt.hash('1q2w3e4r!@', 12)
  await prisma.user.upsert({
    where: { email: 'admin@complaint.local' },
    update: {
      loginId: 'admin1234',
      password: adminPassword,
      organizationId: orgMain.id,
      department: '관리부',
      team: null,
      phone: null,
    },
    create: {
      email: 'admin@complaint.local',
      loginId: 'admin1234',
      name: '시스템 관리자',
      password: adminPassword,
      role: Role.ADMIN,
      organizationId: orgMain.id,
      department: '관리부',
      isTemporary: false,
    },
  })

  const d1Password = await bcrypt.hash('dist1234!', 12)
  await prisma.user.upsert({
    where: { email: 'd1@complaint.local' },
    update: {
      loginId: 'd1',
      organizationId: orgMain.id,
      department: '환경정책국',
      team: '대기관리과',
      phone: null,
    },
    create: {
      email: 'd1@complaint.local',
      loginId: 'd1',
      name: '1차배분 테스트',
      password: d1Password,
      role: Role.DISTRIBUTOR_1,
      organizationId: orgMain.id,
      department: '환경정책국',
      team: '대기관리과',
    },
  })

  const d2Password = await bcrypt.hash('dist1234!', 12)
  await prisma.user.upsert({
    where: { email: 'd2@complaint.local' },
    update: {
      loginId: 'd2',
      organizationId: orgMain.id,
      department: '수질생태국',
      team: '수질관리과',
      phone: null,
    },
    create: {
      email: 'd2@complaint.local',
      loginId: 'd2',
      name: '2차배분 테스트',
      password: d2Password,
      role: Role.DISTRIBUTOR_2,
      organizationId: orgMain.id,
      department: '수질생태국',
      team: '수질관리과',
    },
  })

  const demoComplaints: Array<{
    receiptNumber: string
    title: string
    content: string
    category: string
    status: ComplaintStatus
  }> = [
    {
      receiptNumber: 'DEMO-2026-00001',
      title: '[데모] 측정망 자료 보정 요청',
      content: '시드용 더미 자율보고입니다.',
      category: '대기',
      status: ComplaintStatus.PENDING,
    },
    {
      receiptNumber: 'DEMO-2026-00002',
      title: '[데모] 배출시설 변경 신고',
      content: '시드용 더미 자율보고입니다.',
      category: '대기',
      status: ComplaintStatus.AGENCY_ASSIGNED,
    },
    {
      receiptNumber: 'DEMO-2026-00003',
      title: '[데모] 수질 자가측정 결과 제출',
      content: '시드용 더미 자율보고입니다.',
      category: '수질',
      status: ComplaintStatus.IN_PROGRESS_PLAN,
    },
    {
      receiptNumber: 'DEMO-2026-00004',
      title: '[데모] 폐기물 보관 시설 점검',
      content: '시드용 더미 자율보고입니다.',
      category: '폐기물',
      status: ComplaintStatus.WAITING_APPROVAL,
    },
    {
      receiptNumber: 'DEMO-2026-00005',
      title: '[데모] 소음 측정 결과 통보',
      content: '시드용 더미 자율보고입니다.',
      category: '소음',
      status: ComplaintStatus.COMPLETED,
    },
  ]

  for (const row of demoComplaints) {
    await prisma.complaint.upsert({
      where: { receiptNumber: row.receiptNumber },
      update: {
        title: row.title,
        content: row.content,
        category: row.category,
        status: row.status,
      },
      create: {
        receiptNumber: row.receiptNumber,
        title: row.title,
        content: row.content,
        category: row.category,
        status: row.status,
      },
    })
  }

  console.log('✅ Seed complete')
  console.log('   관리자 로그인: 아이디 admin1234 / 비밀번호 1q2w3e4r!@  (이메일: admin@complaint.local)')
  console.log('   d1@complaint.local    / dist1234!   (아이디: d1)')
  console.log('   d2@complaint.local    / dist1234!   (아이디: d2)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
