import { ID, Permission, Query, Role, TablesDB } from 'node-appwrite'

const DB_ID = 'gignow'
const NOTIFS_TABLE = '6acc0a5f000cd80428e0'
const PREFS_TABLE = '6acc1930001673ed260c'

export type NotifyInput = {
  userId: string
  type: string
  title: string
  body?: string
  link?: string
}

// Only the most urgent alerts are allowed to trigger a phone call later.
const HIGH_PRIORITY = new Set(['no_show', 'unconfirmed_employer'])

// Delivery placeholders. When a provider is connected, fill in the function
// body and set its environment variable in Vercel. Until then each one just
// reports 'not_configured' and nothing is sent.
async function sendEmail(_userId: string, _input: NotifyInput): Promise<string> {
  if (!process.env.EMAIL_PROVIDER_KEY) return 'not_configured'
  return 'not_implemented'
}

async function sendSms(_phone: string, _input: NotifyInput): Promise<string> {
  if (!process.env.SMS_PROVIDER_KEY) return 'not_configured'
  return 'not_implemented'
}

async function sendVoice(_phone: string, _input: NotifyInput): Promise<string> {
  if (!process.env.VOICE_PROVIDER_KEY) return 'not_configured'
  return 'not_implemented'
}

// Always saves an in-app notification, then hands off to the channels the
// person has opted into. Never throws, so a failed alert can't break a hire,
// a clock-in, or the cron job.
export async function notify(db: TablesDB, input: NotifyInput): Promise<void> {
  try {
    let prefs: any = null
    try {
      const p = await db.listRows({
        databaseId: DB_ID,
        tableId: PREFS_TABLE,
        queries: [Query.equal('userId', input.userId), Query.limit(1)],
      })
      prefs = p.rows[0] || null
    } catch {
      prefs = null
    }
    const emailStatus = prefs && prefs.emailOptIn === false ? 'opted_out' : await sendEmail(input.userId, input)
    const smsStatus = prefs && prefs.smsOptIn && prefs.phone ? await sendSms(String(prefs.phone), input) : 'not_opted_in'
    const voiceStatus =
      prefs && prefs.voiceOptIn && prefs.phone
        ? HIGH_PRIORITY.has(input.type)
          ? await sendVoice(String(prefs.phone), input)
          : 'not_high_priority'
        : 'not_opted_in'
    await db.createRow({
      databaseId: DB_ID,
      tableId: NOTIFS_TABLE,
      rowId: ID.unique(),
      data: {
        userId: input.userId,
        type: input.type.slice(0, 40),
        title: input.title.slice(0, 120),
        body: (input.body || '').slice(0, 500),
        link: (input.link || '').slice(0, 200),
        emailStatus,
        smsStatus,
        voiceStatus,
      },
      permissions: [Permission.read(Role.user(input.userId)), Permission.update(Role.user(input.userId))],
    })
  } catch (err) {
    console.error('notify failed', err)
  }
}
