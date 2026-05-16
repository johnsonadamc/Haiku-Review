import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const seedData = [
  {
    place: 'Fushimi Inari Shrine', city: 'Kyoto, Japan', lat: 34.9671, lng: 135.7727,
    google_place_id: 'ChIJK3vOQyMHAWARoRFBTMqMDME',
    haikus: [
      { lines: ['red gates disappear', 'into morning fog — only', 'the bells remain real'], author: 'M. Tanaka', created: '2021-03-12' },
      { lines: ['ten thousand torii', 'and still I walk alone through', 'someone else\'s prayer'], author: 'anonymous', created: '2022-07-04' },
      { lines: ['tourist behind me', 'photographs what I just felt —', 'we share nothing here'], author: 'R. Walsh', created: '2023-11-20' },
      { lines: ['the fox sits still while', 'pilgrims pass — it has outlived', 'every wish made here'], author: 'anonymous', created: '2024-02-14' },
    ]
  },
  {
    place: 'Café de Flore', city: 'Paris, France', lat: 48.8539, lng: 2.3328,
    google_place_id: 'ChIJM4IixThx5kcRs9DCHB1BSMA',
    haikus: [
      { lines: ['same table as him', 'sixty years ago — garçon,', 'another coffee'], author: 'L. Bernard', created: '2021-09-03' },
      { lines: ['she writes three words then', 'crosses them out — the ashtray', 'holds more than the page'], author: 'anonymous', created: '2022-04-17' },
      { lines: ['rain on Saint-Germain', 'everyone pretends they meant', 'to stay this long'], author: 'T. Morrison', created: '2023-06-28' },
    ]
  },
  {
    place: 'The High Line', city: 'New York, USA', lat: 40.7480, lng: -74.0048,
    google_place_id: 'ChIJGf63hQtZwokRha98B7MmDpQ',
    haikus: [
      { lines: ['old rail, new flowers —', 'the city forgets nothing', 'it just grows over'], author: 'anonymous', created: '2021-05-22' },
      { lines: ['children run ahead', 'my mother walks slowly now —', 'same sky, different pace'], author: 'D. Chen', created: '2022-08-09' },
      { lines: ['Hudson through the gaps', 'between buildings — the river', 'was here before all this'], author: 'anonymous', created: '2023-03-15' },
      { lines: ['everyone looking', 'at their phones except one man', 'watching a pigeon'], author: 'S. Okafor', created: '2024-01-07' },
    ]
  },
  {
    place: 'Shibuya Crossing', city: 'Tokyo, Japan', lat: 35.6595, lng: 139.7004,
    google_place_id: 'ChIJu3_6annbGGARsNKBGsVYmbY',
    haikus: [
      { lines: ['two thousand people', 'cross at once — not one of them', 'is lost like I am'], author: 'anonymous', created: '2021-10-31' },
      { lines: ['the light turns — we move', 'as one body, then scatter', 'back to being alone'], author: 'K. Yamamoto', created: '2022-12-24' },
      { lines: ['rain gear, umbrellas —', 'a thousand private shelters', 'moving through each other'], author: 'anonymous', created: '2023-09-11' },
    ]
  },
  {
    place: 'Tate Modern', city: 'London, UK', lat: 51.5076, lng: -0.0994,
    google_place_id: 'ChIJ2fPBQdsEdkgRxrMBBRPGDSE',
    haikus: [
      { lines: ['turbine hall echoes', 'a child\'s laugh up to the roof —', 'the art is below'], author: 'P. Osei', created: '2021-07-19' },
      { lines: ['Thames through the window', 'a Rothko behind me breathes —', 'I face the river'], author: 'anonymous', created: '2022-02-28' },
      { lines: ['the guard stands so still', 'I think about his long shift —', 'someone should ask him'], author: 'H. Williams', created: '2023-08-04' },
    ]
  },
  {
    place: 'Lençóis Maranhenses', city: 'Maranhão, Brazil', lat: -2.4833, lng: -43.1167,
    google_place_id: null,
    haikus: [
      { lines: ['white dunes, blue lagoons —', 'the desert holds water like', 'a secret kept well'], author: 'anonymous', created: '2022-06-01' },
      { lines: ['no shade for miles and', 'yet we stay — something here is', 'worth the burning'], author: 'C. Santos', created: '2023-01-15' },
    ]
  },
  {
    place: 'Naoshima Island', city: 'Kagawa, Japan', lat: 34.4618, lng: 133.9950,
    google_place_id: null,
    haikus: [
      { lines: ['pumpkin by the sea —', 'Yayoi put dots on it', 'now we all stop here'], author: 'anonymous', created: '2022-03-22' },
      { lines: ['art island ferry —', 'the man beside me carries', 'nothing but a towel'], author: 'B. Kim', created: '2023-05-17' },
      { lines: ['the museum closed', 'but the light on the water', 'was the exhibit'], author: 'anonymous', created: '2024-03-08' },
    ]
  },
]

async function seed() {
  console.log('Seeding Haiku Review database...\n')

  for (const location of seedData) {
    // Find or create place
    let placeId: string

    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('name', location.place)
      .single()

    if (existing) {
      placeId = existing.id
      console.log(`Place exists: ${location.place}`)
    } else {
      const { data: newPlace, error } = await supabase
        .from('places')
        .insert({
          name: location.place,
          city: location.city,
          lat: location.lat,
          lng: location.lng,
          google_place_id: location.google_place_id,
          haiku_count: 0,
        })
        .select('id')
        .single()

      if (error || !newPlace) {
        console.error(`Failed to create place: ${location.place}`, error)
        continue
      }

      placeId = newPlace.id
      console.log(`Created place: ${location.place}`)
    }

    // Insert haikus, skip duplicates
    let inserted = 0
    for (const h of location.haikus) {
      const { data: existingHaiku } = await supabase
        .from('haikus')
        .select('id')
        .eq('place_id', placeId)
        .eq('line_1', h.lines[0])
        .single()

      if (existingHaiku) {
        console.log(`  Skipping duplicate: "${h.lines[0]}"`)
        continue
      }

      const { error } = await supabase
        .from('haikus')
        .insert({
          place_id: placeId,
          line_1: h.lines[0],
          line_2: h.lines[1],
          line_3: h.lines[2],
          author: h.author,
          created_at: new Date(h.created).toISOString(),
        })

      if (error) {
        console.error(`  Failed to insert: "${h.lines[0]}"`, error)
      } else {
        inserted++
        console.log(`  Inserted: "${h.lines[0]}"`)
      }
    }

    // Update haiku_count to reflect actual rows
    const { count } = await supabase
      .from('haikus')
      .select('*', { count: 'exact', head: true })
      .eq('place_id', placeId)

    await supabase
      .from('places')
      .update({ haiku_count: count ?? 0 })
      .eq('id', placeId)

    console.log(`  haiku_count updated to ${count}\n`)
  }

  console.log('Seed complete.')
}

seed()
