// Countries, provinces/states and postal-code checks for addresses.

const CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ')

let names = null
try { names = new Intl.DisplayNames(['en'], { type: 'region' }) } catch { names = null }
const nameOf = (code) => (names ? names.of(code) : code)

// Canada and the United States first (the only ones we serve), then every other country A–Z.
export const SERVED_COUNTRIES = ['Canada', 'United States']
export const OTHER_COUNTRIES = CODES.filter((code) => code !== 'CA' && code !== 'US').map(nameOf).sort((a, b) => a.localeCompare(b))

export const REGIONS = {
  Canada: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'],
  'United States': ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
}
export const regionLabel = (country) => (country === 'United States' ? 'State' : 'Province or territory')
export const postalLabel = (country) => (country === 'United States' ? 'ZIP code' : 'Postal code')

export function cleanPostal(raw, country) {
  const value = String(raw || '').toUpperCase().replace(/\s+/g, '')
  if (country === 'Canada' && /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(value)) return `${value.slice(0, 3)} ${value.slice(3)}`
  return String(raw || '').trim().toUpperCase()
}

export function postalProblem(raw, country) {
  const value = String(raw || '').trim().toUpperCase()
  if (!value) return ''
  if (country === 'Canada' && !/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/.test(value)) return 'Use the format A1A 1A1, e.g. V6K 1A1.'
  if (country === 'United States' && !/^\d{5}(-\d{4})?$/.test(value)) return 'Use 5 digits, e.g. 98101.'
  return ''
}

// Phone country codes. Canada first, then the United States, then everyone else A–Z.
const DIAL = 'AF:93 AX:358 AL:355 DZ:213 AS:1684 AD:376 AO:244 AI:1264 AG:1268 AR:54 AM:374 AW:297 AU:61 AT:43 AZ:994 BS:1242 BH:973 BD:880 BB:1246 BY:375 BE:32 BZ:501 BJ:229 BM:1441 BT:975 BO:591 BA:387 BW:267 BR:55 IO:246 VG:1284 BN:673 BG:359 BF:226 BI:257 KH:855 CM:237 CA:1 CV:238 BQ:599 KY:1345 CF:236 TD:235 CL:56 CN:86 CX:61 CC:61 CO:57 KM:269 CG:242 CD:243 CK:682 CR:506 CI:225 HR:385 CU:53 CW:599 CY:357 CZ:420 DK:45 DJ:253 DM:1767 DO:1809 EC:593 EG:20 SV:503 GQ:240 ER:291 EE:372 SZ:268 ET:251 FK:500 FO:298 FJ:679 FI:358 FR:33 GF:594 PF:689 GA:241 GM:220 GE:995 DE:49 GH:233 GI:350 GR:30 GL:299 GD:1473 GP:590 GU:1671 GT:502 GG:44 GN:224 GW:245 GY:592 HT:509 HN:504 HK:852 HU:36 IS:354 IN:91 ID:62 IR:98 IQ:964 IE:353 IM:44 IL:972 IT:39 JM:1876 JP:81 JE:44 JO:962 KZ:7 KE:254 KI:686 XK:383 KW:965 KG:996 LA:856 LV:371 LB:961 LS:266 LR:231 LY:218 LI:423 LT:370 LU:352 MO:853 MG:261 MW:265 MY:60 MV:960 ML:223 MT:356 MH:692 MQ:596 MR:222 MU:230 YT:262 MX:52 FM:691 MD:373 MC:377 MN:976 ME:382 MS:1664 MA:212 MZ:258 MM:95 NA:264 NR:674 NP:977 NL:31 NC:687 NZ:64 NI:505 NE:227 NG:234 NU:683 NF:672 KP:850 MK:389 MP:1670 NO:47 OM:968 PK:92 PW:680 PS:970 PA:507 PG:675 PY:595 PE:51 PH:63 PL:48 PT:351 PR:1787 QA:974 RE:262 RO:40 RU:7 RW:250 BL:590 SH:290 KN:1869 LC:1758 MF:590 PM:508 VC:1784 WS:685 SM:378 ST:239 SA:966 SN:221 RS:381 SC:248 SL:232 SG:65 SX:1721 SK:421 SI:386 SB:677 SO:252 ZA:27 KR:82 SS:211 ES:34 LK:94 SD:249 SR:597 SJ:47 SE:46 CH:41 SY:963 TW:886 TJ:992 TZ:255 TH:66 TL:670 TG:228 TK:690 TO:676 TT:1868 TN:216 TR:90 TM:993 TC:1649 TV:688 VI:1340 UG:256 UA:380 AE:971 GB:44 US:1 UY:598 UZ:998 VU:678 VA:39 VE:58 VN:84 WF:681 EH:212 YE:967 ZM:260 ZW:263'
  .split(' ').map((pair) => { const [iso, dial] = pair.split(':'); return { iso, dial, name: nameOf(iso) } })

export const PHONE_COUNTRIES = [
  ...['CA', 'US'].map((iso) => DIAL.find((item) => item.iso === iso)),
  ...DIAL.filter((item) => item.iso !== 'CA' && item.iso !== 'US').sort((a, b) => a.name.localeCompare(b.name)),
]

// "+44 7700 900123" → { iso: 'GB', dial: '44', national: '7700 900123' }. Numbers without + are Canadian.
export function splitPhone(raw, fallbackIso = 'CA') {
  const text = String(raw || '').trim()
  const fallback = PHONE_COUNTRIES.find((item) => item.iso === fallbackIso) || PHONE_COUNTRIES[0]
  if (!text.startsWith('+')) return { iso: fallback.iso, dial: fallback.dial, national: text }
  const digits = text.replace(/\D/g, '')
  // NANP (+1) numbers stay Canadian unless US was picked; other codes match the longest prefix.
  if (digits.startsWith('1')) {
    const iso = fallback.dial === '1' ? fallback.iso : 'CA'
    return { iso, dial: '1', national: text.replace(/^\+1\s*/, '') }
  }
  const match = [...PHONE_COUNTRIES].filter((item) => digits.startsWith(item.dial)).sort((a, b) => b.dial.length - a.dial.length)[0]
  if (!match) return { iso: fallback.iso, dial: fallback.dial, national: text }
  return { iso: match.iso, dial: match.dial, national: text.replace(new RegExp(`^\\+${match.dial}\\s*`), '') }
}

export const joinPhone = (dial, national) => (String(national || '').trim() ? `+${dial} ${String(national).trim()}` : '')
