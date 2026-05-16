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
      { lines: ['red gates disappear', 'into morning fog — only', 'the bells remain real'], author: 'M. Tanaka', created: '2021-03-12', photo_url: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=1200&q=80' },
      { lines: ['ten thousand torii', 'and still I walk alone through', 'someone else\'s prayer'], author: 'anonymous', created: '2022-07-04', photo_url: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1200&q=80' },
      { lines: ['tourist behind me', 'photographs what I just felt —', 'we share nothing here'], author: 'R. Walsh', created: '2023-11-20', photo_url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80' },
      { lines: ['the fox sits still while', 'pilgrims pass — it has outlived', 'every wish made here'], author: 'anonymous', created: '2024-02-14', photo_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80' },
    ]
  },
  {
    place: 'Café de Flore', city: 'Paris, France', lat: 48.8539, lng: 2.3328,
    google_place_id: 'ChIJM4IixThx5kcRs9DCHB1BSMA',
    haikus: [
      { lines: ['same table as him', 'sixty years ago — garçon,', 'another coffee'], author: 'L. Bernard', created: '2021-09-03', photo_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80' },
      { lines: ['she writes three words then', 'crosses them out — the ashtray', 'holds more than the page'], author: 'anonymous', created: '2022-04-17', photo_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=80' },
      { lines: ['rain on Saint-Germain', 'everyone pretends they meant', 'to stay this long'], author: 'T. Morrison', created: '2023-06-28', photo_url: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200&q=80' },
    ]
  },
  {
    place: 'The High Line', city: 'New York, USA', lat: 40.7480, lng: -74.0048,
    google_place_id: 'ChIJGf63hQtZwokRha98B7MmDpQ',
    haikus: [
      { lines: ['old rail, new flowers —', 'the city forgets nothing', 'it just grows over'], author: 'anonymous', created: '2021-05-22', photo_url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=80' },
      { lines: ['children run ahead', 'my mother walks slowly now —', 'same sky, different pace'], author: 'D. Chen', created: '2022-08-09', photo_url: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=1200&q=80' },
      { lines: ['Hudson through the gaps', 'between buildings — the river', 'was here before all this'], author: 'anonymous', created: '2023-03-15', photo_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80' },
      { lines: ['everyone looking', 'at their phones except one man', 'watching a pigeon'], author: 'S. Okafor', created: '2024-01-07', photo_url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80' },
    ]
  },
  {
    place: 'Shibuya Crossing', city: 'Tokyo, Japan', lat: 35.6595, lng: 139.7004,
    google_place_id: 'ChIJu3_6annbGGARsNKBGsVYmbY',
    haikus: [
      { lines: ['two thousand people', 'cross at once — not one of them', 'is lost like I am'], author: 'anonymous', created: '2021-10-31', photo_url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=80' },
      { lines: ['the light turns — we move', 'as one body, then scatter', 'back to being alone'], author: 'K. Yamamoto', created: '2022-12-24', photo_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80' },
      { lines: ['rain gear, umbrellas —', 'a thousand private shelters', 'moving through each other'], author: 'anonymous', created: '2023-09-11', photo_url: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=1200&q=80' },
    ]
  },
  {
    place: 'Tate Modern', city: 'London, UK', lat: 51.5076, lng: -0.0994,
    google_place_id: 'ChIJ2fPBQdsEdkgRxrMBBRPGDSE',
    haikus: [
      { lines: ['turbine hall echoes', 'a child\'s laugh up to the roof —', 'the art is below'], author: 'P. Osei', created: '2021-07-19', photo_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&q=80' },
      { lines: ['Thames through the window', 'a Rothko behind me breathes —', 'I face the river'], author: 'anonymous', created: '2022-02-28', photo_url: 'https://images.unsplash.com/photo-1574182245530-967d9b3831af?w=1200&q=80' },
      { lines: ['the guard stands so still', 'I think about his long shift —', 'someone should ask him'], author: 'H. Williams', created: '2023-08-04', photo_url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=1200&q=80' },
    ]
  },
  {
    place: 'Lençóis Maranhenses', city: 'Maranhão, Brazil', lat: -2.4833, lng: -43.1167,
    google_place_id: null,
    haikus: [
      { lines: ['white dunes, blue lagoons —', 'the desert holds water like', 'a secret kept well'], author: 'anonymous', created: '2022-06-01', photo_url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200&q=80' },
      { lines: ['no shade for miles and', 'yet we stay — something here is', 'worth the burning'], author: 'C. Santos', created: '2023-01-15', photo_url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80' },
    ]
  },
  {
    place: 'Naoshima Island', city: 'Kagawa, Japan', lat: 34.4618, lng: 133.9950,
    google_place_id: null,
    haikus: [
      { lines: ['pumpkin by the sea —', 'Yayoi put dots on it', 'now we all stop here'], author: 'anonymous', created: '2022-03-22', photo_url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80' },
      { lines: ['art island ferry —', 'the man beside me carries', 'nothing but a towel'], author: 'B. Kim', created: '2023-05-17', photo_url: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=1200&q=80' },
      { lines: ['the museum closed', 'but the light on the water', 'was the exhibit'], author: 'anonymous', created: '2024-03-08', photo_url: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=1200&q=80' },
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

    // Insert haikus, skip duplicates (backfill photo_url if missing on existing rows)
    let inserted = 0
    for (const h of location.haikus) {
      const { data: existingHaiku } = await supabase
        .from('haikus')
        .select('id, photo_url')
        .eq('place_id', placeId)
        .eq('line_1', h.lines[0])
        .single()

      if (existingHaiku) {
        if (!existingHaiku.photo_url) {
          await supabase.from('haikus').update({ photo_url: h.photo_url }).eq('id', existingHaiku.id)
          console.log(`  Backfilled photo_url: "${h.lines[0]}"`)
        } else {
          console.log(`  Skipping duplicate: "${h.lines[0]}"`)
        }
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
          photo_url: h.photo_url,
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
