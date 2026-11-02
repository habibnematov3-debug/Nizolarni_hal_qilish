import { useEffect, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays,
  CheckCheck, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Clock3,
  FileClock, FileText, Handshake, Landmark, LogIn, Phone, UserRound,
  Users, WalletCards, type LucideIcon,
} from 'lucide-react'
import { ActionIcon, Alert, Badge, Box, Button, Card, Center, Container, Grid, Group, Loader, Menu, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title, UnstyledButton } from '@mantine/core'
import { apiGet, getAccessToken } from './api'
import { LanguageFlag } from './ApplicantDashboard'
import { type ApplicantLanguage, applicantText } from './applicantLocale'

export type ClientRole = 'CITIZEN' | 'BUSINESS'

type ServiceItem = {
  label: string
  description: string
  icon: LucideIcon
  page?: string
  action?: 'mediation'
  href?: string
}

type ServiceGroup = { title: string; description: string; icon: LucideIcon; items: ServiceItem[] }

function clientServiceGroups(role: ClientRole): ServiceGroup[] {
  const mediationItems: ServiceItem[] = [
    { label: 'Yangi mediatsiya', description: 'Nizo bo‘yicha murojaat yuboring', icon: Handshake, action: 'mediation' },
    { label: 'Mediatorlar reyestri', description: 'Mutaxassislarni toping', icon: Users, page: 'Mediatorlar reyestri' },
    { label: 'Mediatsiyalarim', description: 'Murojaatlar holatini kuzating', icon: ClipboardList, page: 'Mediatsiyalarim' },
    { label: 'Onlayn uchrashuvlar', description: 'Uchrashuv va sessiyalarni ko‘ring', icon: CalendarDays, page: 'Onlayn uchrashuvlar' },
    ...(role === 'CITIZEN' ? [{ label: 'Mediator bo‘lish', description: 'Mediator maqomiga ariza bering', icon: FileClock, page: 'Mediator bo‘lish' } as ServiceItem] : []),
  ]

  return [
    { title: 'Nizolar va mediatsiya', description: 'Murojaat va mediatorlar', icon: Handshake, items: mediationItems },
    { title: 'Huquqiy jarayonlar', description: 'Sud va kelishuv ijrosi', icon: Landmark, items: [
      { label: 'Sud da’volari', description: 'Sudga oid murojaatlarni ko‘ring', icon: Landmark, page: 'Sud da’volari' },
      { label: 'Kelishuvlar ijrosi', description: 'Kelishuv majburiyatlarini kuzating', icon: CheckCheck, page: 'Kelishuvlar ijrosi' },
    ] },
    { title: 'Hujjatlar va to‘lovlar', description: 'Shartnomalar va hisob-kitoblar', icon: WalletCards, items: [
      { label: 'Shartnomalar', description: 'Mediatsiya hujjatlarini ko‘ring', icon: FileText, page: 'Shartnomalar' },
      { label: 'To‘lovlar', description: 'To‘lov ma’lumotlariga o‘ting', icon: WalletCards, page: 'To‘lovlar' },
    ] },
    { title: 'Shaxsiy kabinet', description: 'Profil va xabarnomalar', icon: UserRound, items: [
      ...(role === 'BUSINESS' ? [{ label: 'Tashkilot profili', description: 'Tashkilot rekvizitlari va vakil hujjatlari', icon: Building2, page: 'Tashkilot profili' } as ServiceItem] : []),
      { label: 'Shaxsiy ma’lumotlar', description: 'Aloqa va profil ma’lumotlari', icon: UserRound, page: 'Shaxsiy ma’lumotlar' },
      { label: 'Xabarnomalar', description: 'Yangi xabarlarni ko‘ring', icon: Bell, page: 'Xabarnomalar' },
    ] },
    { title: 'Yordam va qo‘llab-quvvatlash', description: 'Mavjud aloqa kanali', icon: CircleHelp, items: [
      { label: 'Ishonch telefoni', description: '1008 raqamiga qo‘ng‘iroq qiling', icon: Phone, href: 'tel:1008' },
    ] },
  ]
}

type ClientRoleOption = { key: string; label: string }

export function ClientCabinetHeader({
  role, activePage, userName, assignedRoles, language, onLanguageChange, onNavigate, onOpenPublic, onSignOut, onSwitchRole, onStartMediation,
}: {
  role: ClientRole
  activePage: string
  userName: string
  assignedRoles: ClientRoleOption[]
  language: ApplicantLanguage
  onLanguageChange: (language: ApplicantLanguage) => void
  onNavigate: (page: string) => void
  onOpenPublic: () => void
  onSignOut: () => void
  onSwitchRole: (role: string) => void
  onStartMediation: () => void
}) {
  const groups = clientServiceGroups(role)
  const accountType = role === 'BUSINESS' ? 'Yuridik shaxs' : 'Jismoniy shaxs'
  const initials = userName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('uz') || 'F'

  return <header className="client-header sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
    <Container size="xl" style={{ maxWidth: 1600 }}>
      <Group justify="space-between" wrap="nowrap" gap="sm" mih={76}>
        <Group wrap="nowrap" gap="sm" style={{ minWidth: 0 }}>
          <UnstyledButton onClick={() => onNavigate('Umumiy ko‘rsatkich')} aria-label="Kabinet bosh sahifasi">
            <Group wrap="nowrap" gap="sm">
              <ThemeIcon size={46} radius="lg" color="teal" variant="light"><Handshake size={23}/></ThemeIcon>
              <Box visibleFrom="sm" style={{ minWidth: 0 }}>
                <Text fw={750} size="sm" c="dark.9" truncate>Nizolarni hal etish</Text>
                <Text size="10px" c="dimmed" tt="uppercase" style={{ letterSpacing: '.16em' }}>Elektron platforma</Text>
              </Box>
            </Group>
          </UnstyledButton>
          <Box visibleFrom="md" style={{ height: 36, width: 1, background: 'var(--mantine-color-gray-3)' }}/>
          <Menu position="bottom-start" withinPortal={false} shadow="md" width="min(700px, calc(100vw - 24px))" trigger="click">
            <Menu.Target>
              <Button variant="subtle" color="dark" leftSection={<ClipboardList size={17}/>} rightSection={<ChevronDown size={15}/>} size="sm">
                <span className="hidden sm:inline">Xizmatlar</span><span className="sm:hidden">Bo‘limlar</span>
              </Button>
            </Menu.Target>
            <Menu.Dropdown p="md" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <Stack gap="md">
                <Box>
                  <Text fw={700} size="sm">Xizmatlar</Text>
                  <Text size="xs" c="dimmed">Kerakli bo‘limni tanlang</Text>
                </Box>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  {[groups.slice(0, 3), groups.slice(3)].map((column, columnIndex) => <Stack key={columnIndex} gap="lg">
                    {column.map((group) => <Box key={group.title}>
                      <Group wrap="nowrap" gap="xs" mb={6}>
                        <ThemeIcon size={32} radius="md" color="teal" variant="light"><group.icon size={16}/></ThemeIcon>
                        <Box>
                          <Text fw={700} size="xs">{group.title}</Text>
                          <Text size="10px" c="dimmed">{group.description}</Text>
                        </Box>
                      </Group>
                      <Stack gap={2}>
                        {group.items.map((item) => item.href
                          ? <Menu.Item key={item.label} component="a" href={item.href} leftSection={<item.icon size={15}/>} rightSection={<ArrowUpRight size={13}/>}>{item.label}</Menu.Item>
                          : <Menu.Item key={item.label} leftSection={<item.icon size={15}/>} rightSection={<ArrowUpRight size={13}/>} onClick={() => item.action === 'mediation' ? onStartMediation() : onNavigate(item.page || 'Umumiy ko‘rsatkich')}>{item.label}</Menu.Item>)}
                      </Stack>
                    </Box>)}
                  </Stack>)}
                </SimpleGrid>
              </Stack>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Group wrap="nowrap" gap="xs">
          <ActionIcon
            variant="subtle"
            color="dark"
            size="lg"
            onClick={() => onLanguageChange(language === 'uz' ? 'ru' : 'uz')}
            aria-label={applicantText(language, 'Rus tiliga o‘tish', 'Переключить на узбекский язык')}
            title={applicantText(language, 'Rus tiliga o‘tish', 'Переключить на узбекский язык')}
          ><LanguageFlag language={language}/></ActionIcon>
          <ActionIcon
            variant={activePage === 'Xabarnomalar' ? 'light' : 'subtle'}
            color={activePage === 'Xabarnomalar' ? 'teal' : 'dark'}
            size="lg"
            onClick={() => onNavigate('Xabarnomalar')}
            aria-label="Xabarnomalarni ochish"
            style={{ position: 'relative' }}
          ><Bell size={18}/></ActionIcon>
          <Menu position="bottom-end" withinPortal={false} shadow="md" width={260} trigger="click">
            <Menu.Target>
              <UnstyledButton aria-label="Profil menyusini ochish" className="rounded-xl p-1.5 hover:bg-slate-50 sm:px-2">
                <Group wrap="nowrap" gap="xs">
                  <ThemeIcon size={36} radius="xl" color="dark">{initials}</ThemeIcon>
                  <Box visibleFrom="sm" maw={145}>
                    <Text size="xs" fw={650} truncate>{userName}</Text>
                    <Text size="10px" c="dimmed">{accountType}</Text>
                  </Box>
                  <ChevronDown size={14} color="var(--mantine-color-gray-6)"/>
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Box px="sm" py="xs">
                <Text size="sm" fw={650} truncate>{userName}</Text>
                <Text size="xs" c="dimmed">{accountType}</Text>
              </Box>
              <Menu.Divider/>
              {assignedRoles.length > 1 && <>
                <Text px="sm" pt={4} size="xs" c="dimmed">Kabinetni almashtirish</Text>
                {assignedRoles.map((item) => <Menu.Item key={item.key} onClick={() => onSwitchRole(item.key)} rightSection={item.key === role ? <CheckCheck size={14} color="var(--mantine-color-teal-7)"/> : null}>{item.label}</Menu.Item>)}
                <Menu.Divider/>
              </>}
              <Menu.Item leftSection={<UserRound size={15}/>} onClick={() => onNavigate('Shaxsiy ma’lumotlar')}>Shaxsiy ma’lumotlar</Menu.Item>
              {role === 'BUSINESS' && <Menu.Item leftSection={<Building2 size={15}/>} onClick={() => onNavigate('Tashkilot profili')}>Tashkilot profili</Menu.Item>}
              <Menu.Item leftSection={<ArrowUpRight size={15}/>} onClick={onOpenPublic}>Ochiq sahifaga qaytish</Menu.Item>
              <Menu.Divider/>
              <Menu.Item color="red" leftSection={<LogIn size={15}/>} onClick={onSignOut}>Kabinetdan chiqish</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Container>
  </header>
}
type DashboardCase = {
  id: string
  title: string
  status: string
  region?: string
  createdAt?: string
  disputeSubject?: string
}

const remoteStatusLabels: Record<string, string> = {
  AWAITING_CONSENT: 'Rozilik kutilmoqda',
  MEDIATOR_REQUESTED: 'Mediator tanlash',
  MEDIATOR_ASSIGNED: 'Mediator tayinlandi',
  AGREEMENT_PENDING_SIGNATURE: 'Kelishuv imzolanmoqda',
  SCHEDULED: 'Uchrashuv belgilangan',
  IN_SESSION: 'Mediatsiya sessiyasi',
  SETTLED: 'Kelishuv monitoringi',
  FAILED: 'Kelishuvga erishilmadi',
  CLOSED: 'Yopildi',
}

export function ClientBusinessDashboard({ role, userName, demoCases, onNavigate, onStartMediation }: {
  role: ClientRole
  userName: string
  demoCases: DashboardCase[]
  onNavigate: (page: string) => void
  onStartMediation: () => void
}) {
  const [items, setItems] = useState<DashboardCase[]>(demoCases)
  const [loading, setLoading] = useState(Boolean(getAccessToken()))
  const [error, setError] = useState('')
  const demoMode = !getAccessToken()
  const groups = clientServiceGroups(role)

  useEffect(() => {
    if (!getAccessToken()) {
      setItems(demoCases)
      setLoading(false)
      setError('')
      return
    }
    let active = true
    setLoading(true)
    setError('')
    apiGet<Array<DashboardCase & { disputeSubject?: string }>>('/cabinet/mts/mediations')
      .then((rows) => {
        if (!active) return
        setItems((rows || []).map((item) => ({ ...item, title: item.disputeSubject || item.title || 'Mediatsiya murojaati' })))
      })
      .catch((cause) => { if (active) { setItems([]); setError(cause instanceof Error ? cause.message : 'Murojaatlarni yuklab bo‘lmadi.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [role, demoCases.length])

  const activeCount = items.filter((item) => !isTerminalStatus(item.status)).length
  const pendingCount = items.filter((item) => isPendingStatus(item.status)).length
  const completedCount = items.filter((item) => isAgreementCompleted(item.status)).length
  const stats = [
    { label: 'Faol murojaatlar', value: activeCount, detail: 'Jarayonda bo‘lgan mediatsiyalar', icon: ClipboardList, color: 'teal' },
    { label: 'Javob kutilmoqda', value: pendingCount, detail: 'Taraf roziligi yoki mediator javobi', icon: Clock3, color: 'orange' },
    { label: 'Yakunlangan kelishuvlar', value: completedCount, detail: 'Muvaffaqiyatli yakunlangan ishlar', icon: CheckCheck, color: 'blue' },
  ] as const

  const shortcuts: ServiceItem[] = [
    { label: 'Mediatorlar reyestri', description: 'Mutaxassisni ixtisoslik va hudud bo‘yicha toping', icon: Users, page: 'Mediatorlar reyestri' },
    { label: 'Yangi mediatsiya', description: 'Nizo bo‘yicha murojaat yuboring', icon: Handshake, action: 'mediation' },
    { label: 'Shartnomalar', description: 'Kelishuv va hujjatlarni ko‘ring', icon: FileText, page: 'Shartnomalar' },
    { label: 'To‘lovlar', description: 'To‘lov ma’lumotlariga o‘ting', icon: WalletCards, page: 'To‘lovlar' },
  ]

  const activate = (item: ServiceItem) => item.action === 'mediation' ? onStartMediation() : onNavigate(item.page || 'Umumiy ko‘rsatkich')

  return <Stack className="client-dashboard" gap="xl">
    <Paper radius="xl" p={{ base: 'lg', sm: 'xl' }} shadow="sm" style={{ overflow: 'hidden', position: 'relative', background: 'linear-gradient(120deg, #07101f 0%, #101a2b 68%, #0c2527 100%)' }}>
      <Box aria-hidden="true" style={{ position: 'absolute', right: -70, top: -120, width: 330, height: 330, borderRadius: '50%', background: 'rgba(96, 232, 190, .09)', filter: 'blur(42px)' }}/>
      <Group className="relative" justify="space-between" align="center" gap="xl" wrap="wrap">
        <Box maw={680}>
          <Text size="xs" fw={700} tt="uppercase" c="teal.3" style={{ letterSpacing: '.18em' }}>{role === 'BUSINESS' ? 'Yuridik shaxs kabineti' : 'Shaxsiy kabinet'}</Text>
          <Title order={1} mt="sm" c="white" size="clamp(1.7rem, 3vw, 2.5rem)" fw={650}>Xush kelibsiz, {greetingName(userName)}</Title>
          <Text mt="sm" c="gray.3" size="sm" maw={600} lh={1.7}>Nizongizni kelishuv orqali hal qilish uchun kerakli xizmatlar va murojaatlaringiz bir joyda.</Text>
        </Box>
        <Group gap="sm" wrap="wrap">
          <Button size="md" radius="md" color="teal" c="dark.9" fw={700} leftSection={<Handshake size={18}/>} rightSection={<ArrowRight size={16}/>} onClick={onStartMediation}>Yangi mediatsiya</Button>
          <Button size="md" radius="md" variant="default" color="gray" leftSection={<Users size={17}/>} onClick={() => onNavigate('Mediatorlar reyestri')} styles={{ root: { background: 'rgba(255,255,255,.07)', borderColor: 'rgba(255,255,255,.22)', color: 'white' } }}>Mediator tanlash</Button>
        </Group>
      </Group>
    </Paper>

    <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md" aria-label="Mediatsiya ko‘rsatkichlari">
      {stats.map(({ label, value, detail, icon: Icon, color }) => <Paper key={label} withBorder radius="lg" p="lg" shadow="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box>
            <Text size="sm" c="dimmed" fw={550}>{label}</Text>
            <Text mt="xs" size="32px" lh={1.2} fw={750} c="dark.9">{loading || error ? '—' : value}</Text>
          </Box>
          <ThemeIcon size={46} radius="lg" color={color} variant="light"><Icon size={21}/></ThemeIcon>
        </Group>
        <Text mt="sm" size="xs" c="dimmed">{detail}</Text>
      </Paper>)}
    </SimpleGrid>

    <Grid gap="md" align="stretch">
      <Grid.Col span={{ base: 12, xl: 8 }}>
        <Card withBorder radius="lg" p={0} shadow="xs" h="100%">
          <Group justify="space-between" align="center" p="lg" wrap="wrap">
            <Box>
              <Title order={2} size="lg">Mediatsiya murojaatlarim</Title>
              <Text mt={4} size="sm" c="dimmed">Yuborgan murojaatlaringiz va ularning holati</Text>
            </Box>
            <Button variant="subtle" color="teal" rightSection={<ArrowRight size={15}/>} onClick={() => onNavigate('Mediatsiyalarim')}>Barchasini ko‘rish</Button>
          </Group>
          <Box style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            {error && <Alert color="orange" variant="light" mx="lg" mt="md" radius="md" title="Murojaatlar yuklanmadi">{error}</Alert>}
            {loading ? <Center p="xl"><Group gap="sm"><Loader size="sm" color="teal"/><Text size="sm" c="dimmed">Murojaatlar yuklanmoqda…</Text></Group></Center> : items.length ? <Stack gap={0}>
              {items.slice(0, 4).map((item) => <UnstyledButton key={item.id} onClick={() => onNavigate('Mediatsiyalarim')} className="client-application-row w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 sm:px-6">
                <Group wrap="nowrap" align="flex-start" gap="sm">
                  <ThemeIcon mt={2} size={40} radius="md" color="gray" variant="light"><FileClock size={18}/></ThemeIcon>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
                      <Text size="sm" fw={650} c="dark.9" style={{ minWidth: 0, flex: 1 }} lineClamp={1}>{item.title || item.disputeSubject || 'Mediatsiya murojaati'}</Text>
                      <StatusBadge status={formatStatus(item.status)}/>
                    </Group>
                    <Text mt={5} size="xs" c="dimmed">№ {item.id}{item.region ? ' · ' + item.region : ''}</Text>
                    <Text mt={4} size="xs" c="gray.6">Yuborilgan: {formatDate(item.createdAt)}</Text>
                  </Box>
                  <ChevronRight size={17} color="var(--mantine-color-gray-5)" style={{ marginTop: 8, flexShrink: 0 }}/>
                </Group>
              </UnstyledButton>)}
            </Stack> : <Stack align="center" ta="center" p="xl" gap="xs">
              <ThemeIcon size={48} radius="lg" color="teal" variant="light"><Handshake size={22}/></ThemeIcon>
              <Text mt="xs" size="sm" fw={650}>Hozircha murojaatlar yo‘q</Text>
              <Text size="xs" c="dimmed" maw={390}>Birinchi mediatsiya murojaatingizni yuboring. Jarayon holati shu yerda ko‘rinadi.</Text>
              <Button mt="sm" size="sm" color="dark" leftSection={<Handshake size={15}/>} onClick={onStartMediation}>Yangi mediatsiya</Button>
            </Stack>}
          </Box>
          {demoMode && <Text px="lg" py="sm" size="xs" c="dimmed" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>Demo ma’lumotlar ushbu brauzerda saqlanadi.</Text>}
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, xl: 4 }}>
        <Card withBorder radius="lg" p="lg" shadow="xs" h="100%">
          <Group justify="space-between" align="flex-start">
            <Box><Title order={2} size="lg">Tezkor amallar</Title><Text mt={4} size="sm" c="dimmed">Ko‘p ishlatiladigan xizmatlar</Text></Box>
            <ThemeIcon size={36} radius="md" color="teal" variant="light"><ArrowUpRight size={18}/></ThemeIcon>
          </Group>
          <Stack mt="md" gap="xs">
            {shortcuts.map((item) => <UnstyledButton key={item.label} onClick={() => activate(item)} className="client-quick-action flex min-h-[68px] w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
              <ThemeIcon size={40} radius="md" color="teal" variant="white"><item.icon size={18}/></ThemeIcon>
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text size="xs" fw={650} c="dark.9">{item.label}</Text>
                <Text mt={3} size="10px" c="dimmed" lineClamp={2}>{item.description}</Text>
              </Box>
              <ArrowUpRight size={15} color="var(--mantine-color-gray-5)"/>
            </UnstyledButton>)}
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>

    <Box component="section" aria-labelledby="client-services-heading">
      <Group justify="space-between" align="flex-end" mb="md" wrap="wrap" gap="xs">
        <Box><Text size="xs" fw={700} tt="uppercase" c="teal.8" style={{ letterSpacing: '.16em' }}>Kabinet navigatsiyasi</Text><Title id="client-services-heading" order={2} mt={4} size="xl">Barcha xizmatlar</Title></Box>
        <Text size="sm" c="dimmed">Kerakli xizmatni mavzusi bo‘yicha tanlang.</Text>
      </Group>
      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
        {groups.map((group) => <Card key={group.title} withBorder radius="lg" p="lg" shadow="xs">
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon size={42} radius="md" color="teal" variant="light"><group.icon size={19}/></ThemeIcon>
            <Box><Text size="sm" fw={650}>{group.title}</Text><Text size="xs" c="dimmed">{group.description}</Text></Box>
          </Group>
          <Stack mt="md" gap={3}>
            {group.items.map((item) => item.href
              ? <Button key={item.label} component="a" href={item.href} variant="subtle" color="dark" justify="flex-start" fullWidth leftSection={<item.icon size={16}/>} rightSection={<ArrowUpRight size={14}/>} styles={{ inner: { justifyContent: 'flex-start' }, label: { flex: 1, textAlign: 'left' } }}>{item.label}</Button>
              : <Button key={item.label} variant="subtle" color="dark" justify="flex-start" fullWidth leftSection={<item.icon size={16}/>} rightSection={<ArrowUpRight size={14}/>} styles={{ inner: { justifyContent: 'flex-start' }, label: { flex: 1, textAlign: 'left' } }} onClick={() => activate(item)}>{item.label}</Button>)}
          </Stack>
        </Card>)}
      </SimpleGrid>
    </Box>
    {demoMode && <Alert variant="light" color="blue" icon={<CircleHelp size={18}/>} radius="md">Demo rejimida kiritilgan o‘zgarishlar faqat ushbu brauzerda saqlanadi. Davlat tizimlari, billing, SMS, OneID va ERI integratsiyalari ulanmagan.</Alert>}
  </Stack>
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLocaleLowerCase('uz')
  const color = /rad et|muvaffaqiyatsiz|erishilmadi|yopildi/.test(lower) ? 'red' : /yakun|monitoring|imzol|belgilangan|tayinlandi/.test(lower) ? 'teal' : /kutil|tanlash|tekshiril/.test(lower) ? 'orange' : 'gray'
  return <Badge color={color} variant="light" radius="xl" size="sm" style={{ flexShrink: 0, textTransform: 'none' }}>{status}</Badge>
}
function formatStatus(status: string) { return remoteStatusLabels[status] || status || 'Holat ko‘rsatilmagan' }
function formatDate(value?: string) {
  if (!value) return 'Sana ko‘rsatilmagan'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium' }).format(date)
}
function firstName(name: string) { return name.trim().split(/\s+/)[0] || 'foydalanuvchi' }
function isPendingStatus(status: string) { return ['AWAITING_CONSENT', 'MEDIATOR_REQUESTED'].includes(status) || /rozilik kutilmoqda|mediator tanlash|javob kutilmoqda/i.test(status) }
function isAgreementCompleted(status: string) { return status === 'SETTLED' || /kelishuv monitoringi|yakunlandi/i.test(status) }
function isTerminalStatus(status: string) { return ['FAILED', 'CLOSED'].includes(status) || /yakunlandi|erishilmadi|yopildi/i.test(status) }
function greetingName(name: string) { return name === 'Demo foydalanuvchi' ? name : firstName(name) }
