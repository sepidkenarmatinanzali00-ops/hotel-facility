import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  console.log('🚀 Seeding database...')

  // پاک‌سازی
  await db.activityLog.deleteMany()
  await db.notification.deleteMany()
  await db.issue.deleteMany()
  await db.room.deleteMany()
  await db.user.deleteMany()

  // کاربران پیش‌فرض
  const pwd = await hashPassword('123456')
  const manager = await db.user.create({
    data: {
      username: 'manager',
      password: pwd,
      fullName: 'مدیر هتل',
      role: 'MANAGER',
      phone: '0912000000',
    },
  })

  const hk1 = await db.user.create({
    data: {
      username: 'housekeeping1',
      password: pwd,
      fullName: 'مریم احمدی',
      role: 'HOUSEKEEPING',
      phone: '09121111111',
    },
  })

  const hk2 = await db.user.create({
    data: {
      username: 'housekeeping2',
      password: pwd,
      fullName: 'فاطمه رضایی',
      role: 'HOUSEKEEPING',
      phone: '09122222222',
    },
  })

  const f1 = await db.user.create({
    data: {
      username: 'facility1',
      password: pwd,
      fullName: 'علی محمدی',
      role: 'FACILITY',
      phone: '09123333333',
    },
  })

  const f2 = await db.user.create({
    data: {
      username: 'facility2',
      password: pwd,
      fullName: 'حسین کریمی',
      role: 'FACILITY',
      phone: '09124444444',
    },
  })

  const f3 = await db.user.create({
    data: {
      username: 'facility3',
      password: pwd,
      fullName: 'رضا نوری',
      role: 'FACILITY',
      phone: '09125555555',
    },
  })

  // اتاق‌های نمونه
  const rooms = [
    { number: '101', floor: 1, type: 'استاندارد' },
    { number: '102', floor: 1, type: 'استاندارد' },
    { number: '103', floor: 1, type: 'دوبل' },
    { number: '201', floor: 2, type: 'سوئیت' },
    { number: '202', floor: 2, type: 'استاندارد' },
    { number: '203', floor: 2, type: 'سوئیت' },
    { number: '301', floor: 3, type: 'سوئیت جونیور' },
    { number: '302', floor: 3, type: 'استاندارد' },
    { number: '303', floor: 3, type: 'پرزیدنتال' },
    { number: '401', floor: 4, type: 'سوئیت پرزیدنتال' },
  ]
  for (const r of rooms) {
    await db.room.create({ data: r })
  }

  // چند خرابی نمونه با تاریخچه متفاوت برای داشبورد پربار
  const now = Date.now()
  const samples = [
    { daysAgo: 9, room: '101', cat: 'PLUMBING', prio: 'HIGH', desc: 'چکه کردن شیر آشپزخانه', status: 'RESOLVED', minutes: 25, rating: 5, fk: f1.id, hk: hk1.id },
    { daysAgo: 8, room: '203', cat: 'AIR_CONDITION', prio: 'MEDIUM', desc: 'عدم سرمایش کولر', status: 'RESOLVED', minutes: 45, rating: 4, fk: f2.id, hk: hk2.id },
    { daysAgo: 7, room: '301', cat: 'ELECTRICAL', prio: 'URGENT', desc: 'خرابی پریز اتاق خواب', status: 'RESOLVED', minutes: 15, rating: 5, fk: f1.id, hk: hk1.id },
    { daysAgo: 6, room: '102', cat: 'LOCKSMITH', prio: 'MEDIUM', desc: 'قفل در کار نمی‌کند', status: 'RESOLVED', minutes: 30, rating: 4, fk: f3.id, hk: hk2.id },
    { daysAgo: 5, room: '401', cat: 'APPLIANCE', prio: 'HIGH', desc: 'یخچال سرد نمی‌کند', status: 'RESOLVED', minutes: 60, rating: 3, fk: f2.id, hk: hk1.id },
    { daysAgo: 4, room: '202', cat: 'PLUMBING', prio: 'URGENT', desc: 'نشتی لوله حمام', status: 'RESOLVED', minutes: 50, rating: 5, fk: f1.id, hk: hk2.id },
    { daysAgo: 3, room: '303', cat: 'CARPENTRY', prio: 'LOW', desc: 'شکسته بودن دسته کمد', status: 'RESOLVED', minutes: 35, rating: 4, fk: f3.id, hk: hk1.id },
    { daysAgo: 2, room: '201', cat: 'ELECTRICAL', prio: 'HIGH', desc: 'قطعی برق سوئیت', status: 'IN_PROGRESS', fk: f2.id, hk: hk1.id },
    { daysAgo: 1, room: '302', cat: 'AIR_CONDITION', prio: 'MEDIUM', desc: 'صدای غیرعادی کولر', status: 'PENDING', fk: null, hk: hk2.id },
    { daysAgo: 0, room: '103', cat: 'OTHER', prio: 'LOW', desc: 'تعویض لامپ راهرو', status: 'PENDING', fk: null, hk: hk1.id },
  ]

  let counter = 1001
  for (const s of samples) {
    const createdAt = new Date(now - s.daysAgo * 24 * 3600 * 1000)
    const assignedAt = s.status !== 'PENDING' ? new Date(createdAt.getTime() + 5 * 60000) : null
    const resolvedAt = s.status === 'RESOLVED' ? new Date((assignedAt ?? createdAt).getTime() + (s.minutes ?? 30) * 60000) : null

    const ticketCode = `ISS-${String(counter++).padStart(4, '0')}`
    await db.issue.create({
      data: {
        ticketCode,
        roomNumber: s.room,
        description: s.desc,
        category: s.cat as any,
        priority: s.prio as any,
        status: s.status as any,
        beforePhoto: null,
        afterPhoto: null,
        reportedById: s.hk,
        reportedAt: createdAt,
        assignedToId: s.fk,
        assignedAt: assignedAt,
        resolvedAt: resolvedAt,
        resolutionMinutes: s.status === 'RESOLVED' ? (s.minutes ?? 30) : null,
        rating: s.status === 'RESOLVED' ? (s.rating ?? null) : null,
        createdAt,
      },
    })
  }

  console.log('✅ Seed complete!')
  console.log('   manager / 123456 (مدیر)')
  console.log('   housekeeping1 / 123456 (مریم احمدی)')
  console.log('   housekeeping2 / 123456 (فاطمه رضایی)')
  console.log('   facility1 / 123456 (علی محمدی)')
  console.log('   facility2 / 123456 (حسین کریمی)')
  console.log('   facility3 / 123456 (رضا نوری)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
