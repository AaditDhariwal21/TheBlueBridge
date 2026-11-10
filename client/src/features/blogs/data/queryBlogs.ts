import { ago } from './time';
import { days, thread, type SeedComment, type SeedEntry } from './threadBuilder';

export interface SeedQueryBlog {
  slug: string;
  topic: string;
  description: string;
  tone: 'blue' | 'pink';
}

/** Pinned topic spaces. New ones come from seed data only. */
export const SEED_QUERY_BLOGS: SeedQueryBlog[] = [
  {
    slug: 'finance',
    topic: 'Finance',
    description: 'Taxes, savings, investing and money decisions at every stage of life.',
    tone: 'pink',
  },
  {
    slug: 'tech',
    topic: 'Tech',
    description: 'Careers in technology, tools, learning paths and remote work.',
    tone: 'blue',
  },
  {
    slug: 'health',
    topic: 'Health',
    description: 'Wellbeing, women’s health and staying well alongside a busy career.',
    tone: 'blue',
  },
  {
    slug: 'career',
    topic: 'Career',
    description: 'Job moves, returning to work, interviews, growth and openings.',
    tone: 'pink',
  },
  {
    slug: 'legal',
    topic: 'Legal',
    description: 'Contracts, workplace rights, property and paperwork, in plain words.',
    tone: 'blue',
  },
  {
    slug: 'entrepreneurship',
    topic: 'Entrepreneurship',
    description: 'Starting, funding and growing a business from Jodhpur and beyond.',
    tone: 'pink',
  },
];

/** Every topic space opened a month ago; entries are offset from then. */
const OPENED_AT = ago({ days: 30 });

const ENTRIES: Record<string, SeedEntry[]> = {
  finance: [
    {
      id: 'qf-1',
      author: 'priya',
      at: days(4),
      body: 'I have just moved to a new job and have two PF accounts now. Do I need to transfer the old one, or can I leave it?',
    },
    {
      id: 'qf-1a',
      author: 'ananya',
      at: days(4) + 90,
      parent: 'qf-1',
      body: 'Transfer it. As long as both are linked to the same UAN, you can request the transfer online from the EPFO portal. Leaving it means interest can stop once the account goes inoperative, and withdrawals later are more paperwork.',
    },
    {
      id: 'qf-1b',
      author: 'priya',
      at: days(4) + 150,
      parent: 'qf-1a',
      body: 'Both are on the same UAN. Requesting it today, thank you!',
    },
    {
      id: 'qf-2',
      author: 'heena',
      at: days(11),
      body: 'Is gold jewellery a good investment, or should I be buying gold some other way? My family has always bought jewellery for weddings.',
    },
    {
      id: 'qf-2a',
      author: 'megha',
      at: days(11) + 200,
      parent: 'qf-2',
      body: 'Jewellery is wonderful to wear but a poor investment: making charges and GST mean you lose 10 to 25 percent the moment you buy it. For investment, gold ETFs or gold mutual funds are cheaper and easier to sell.',
    },
    {
      id: 'qf-2b',
      author: 'jyoti',
      at: days(11) + 400,
      parent: 'qf-2',
      body: 'From the bank side: if you do keep jewellery, a gold loan against it is one of the cheapest emergency credit options available. Worth knowing.',
    },
    {
      id: 'qf-3',
      author: 'tanvi',
      at: days(26),
      body: 'I sell textile designs to clients in India and Germany. Does 44ADA apply to me, or 44AD? I have two different answers from two CAs.',
    },
    {
      id: 'qf-3a',
      author: 'ananya',
      at: days(26) + 300,
      parent: 'qf-3',
      body: 'If you are selling design services, licences or commissioned artwork, it is usually treated as a profession, so 44ADA. If you are selling finished fabric or garments, it is business income under 44AD. Many designers do both. Split your invoices by type and the answer becomes clear.',
    },
  ],

  tech: [
    {
      id: 'qt-1',
      author: 'komal',
      at: days(6),
      body: 'I am an MBA student who wants to move into product management. Should I learn SQL first or Python?',
    },
    {
      id: 'qt-1a',
      author: 'priya',
      at: days(6) + 120,
      parent: 'qt-1',
      body: 'SQL, without a doubt. As a PM you will query data every week and rarely write Python. A month of practice on real datasets is enough to be useful.',
    },
    {
      id: 'qt-1b',
      author: 'current',
      at: days(6) + 240,
      parent: 'qt-1a',
      body: 'Agreeing with this. The PMs I trust most can pull their own numbers instead of waiting a week for an analyst.',
    },
    {
      id: 'qt-1c',
      author: 'komal',
      at: days(6) + 300,
      parent: 'qt-1b',
      body: 'This settles it. Any course you would recommend?',
    },
    {
      id: 'qt-1d',
      author: 'priya',
      at: days(6) + 380,
      parent: 'qt-1c',
      body: 'Do the free SQL track on any of the big learning platforms, then download a public dataset, such as Rajasthan rainfall data, and answer five questions you are curious about. That second part is where you actually learn.',
    },
    {
      id: 'qt-2',
      author: 'nirmala',
      at: days(15),
      body: 'What is the simplest way to take appointments online for a small clinic? I do not want to build a website.',
    },
    {
      id: 'qt-2a',
      author: 'pooja',
      at: days(15) + 60,
      parent: 'qt-2',
      body: 'A WhatsApp Business account with a booking link from a scheduling tool will cover 90 percent of what you need. No website required, and patients already use WhatsApp.',
    },
    {
      id: 'qt-3',
      author: 'sakshi',
      at: days(22),
      body: 'Are there coding clubs for girls in Jodhpur schools? I want to start one at ours and would love to borrow from someone who has done it.',
    },
    {
      id: 'qt-3a',
      author: 'pooja',
      at: days(22) + 500,
      parent: 'qt-3',
      body: 'I would volunteer for this. Two Saturdays a month?',
    },
  ],

  health: [
    {
      id: 'qh-1',
      author: 'divya',
      at: days(3),
      body: 'Desk job, constant neck pain by 4 pm. What should I change first?',
    },
    {
      id: 'qh-1a',
      author: 'nirmala',
      at: days(3) + 45,
      parent: 'qh-1',
      body: 'Raise your screen so the top edge is at eye level. Laptops on a desk are the cause of most of the neck pain I see. Then stand up every 45 minutes. Start with those two before buying anything.',
    },
    {
      id: 'qh-2',
      author: 'jyoti',
      at: days(12),
      body: 'Which routine blood tests should women in their late thirties do every year?',
    },
    {
      id: 'qh-2a',
      author: 'shalini',
      at: days(12) + 180,
      parent: 'qh-2',
      body: 'A sensible baseline: complete blood count, fasting sugar or HbA1c, thyroid (TSH), lipid profile, vitamin D and B12. Add a Pap smear every three years and discuss a breast examination with your doctor. Your history may add more.',
    },
    {
      id: 'qh-2b',
      author: 'jyoti',
      at: days(12) + 260,
      parent: 'qh-2a',
      body: 'Thank you, this is a much clearer list than the “full body package” my lab keeps advertising.',
    },
    {
      id: 'qh-3',
      author: 'farah',
      at: days(24),
      body: 'I stand in the kitchen for ten hours a day. Any advice for my feet and lower back?',
    },
    {
      id: 'qh-3a',
      author: 'nirmala',
      at: days(24) + 100,
      parent: 'qh-3',
      body: 'Cushioned footwear even indoors, an anti-fatigue mat where you stand most, and calf stretches against the counter twice a day. Come by the clinic if it continues.',
    },
  ],

  career: [
    {
      id: 'qc-1',
      author: 'aishwarya',
      at: days(28),
      body: 'We are hiring an operations lead and a field coordinator at our agritech startup, both based in Jodhpur. Women returning to work are very welcome. Reply here if you would like the details.',
    },
    {
      id: 'qc-1a',
      author: 'jyoti',
      at: days(28) + 60,
      parent: 'qc-1',
      body: 'Sharing with my cousin, who has eight years in rural banking operations.',
    },
    {
      id: 'qc-2',
      author: 'komal',
      at: days(9),
      body: 'How do I explain a one-year gap after graduation when I was preparing for the civil services and did not clear it?',
    },
    {
      id: 'qc-2a',
      author: 'lata',
      at: days(9) + 240,
      parent: 'qc-2',
      body: 'Say it exactly as it is. Preparing for the civil services teaches discipline, current affairs and writing under pressure. Interviewers respect a serious attempt far more than you think.',
    },
    {
      id: 'qc-2b',
      author: 'divya',
      at: days(9) + 300,
      parent: 'qc-2',
      body: 'Agree with this. Mention it in one line on your CV, so it is not a mystery, and be ready with what you learnt.',
    },
    {
      id: 'qc-3',
      author: 'ishita',
      at: days(19),
      body: 'Has anyone moved from a salaried job to freelancing and back again? I am wondering whether the move back is harder than it looks.',
    },
    {
      id: 'qc-3a',
      author: 'neha',
      at: days(19) + 600,
      parent: 'qc-3',
      body: 'I have hired several people who did exactly that. Freelancers come back with a client mindset that teams value. Frame it as running a business, because that is what it was.',
    },
  ],

  legal: [
    {
      id: 'ql-1',
      author: 'kavita',
      at: days(5),
      body: 'A large retailer wants to stock our dupattas on a sale-or-return basis. What should I look for in the agreement?',
    },
    {
      id: 'ql-1a',
      author: 'rashmi',
      at: days(5) + 200,
      parent: 'ql-1',
      body: 'Three things: how long they can hold stock before returning it, who bears the cost of damaged returns, and when you get paid for what sells. Ask for monthly settlement in writing. Thirty to forty-five days is reasonable; ninety is not.',
    },
    {
      id: 'ql-1b',
      author: 'kavita',
      at: days(5) + 300,
      parent: 'ql-1a',
      body: 'Their draft says “payment within 90 days of sale”. Going back to them now.',
    },
    {
      id: 'ql-2',
      author: 'pooja',
      at: days(14),
      body: 'My employer abroad wants me to sign a contract as a “contractor”. Is there anything I should check under Indian law?',
    },
    {
      id: 'ql-2a',
      author: 'rashmi',
      at: days(14) + 400,
      parent: 'ql-2',
      body: 'Check which country’s law governs the contract and where disputes are heard, the notice period on both sides, and the intellectual property clause. Make sure it covers only work done for them, not your personal projects.',
    },
    {
      id: 'ql-3',
      author: 'sakshi',
      at: days(21),
      body: 'Is a will made on plain paper valid, or does it need to be registered?',
    },
    {
      id: 'ql-3a',
      author: 'rashmi',
      at: days(21) + 300,
      parent: 'ql-3',
      body: 'A will on plain paper is valid if it is signed by you and attested by two witnesses. Registration is optional, but it makes the will much harder to challenge later. Worth doing.',
    },
  ],

  entrepreneurship: [
    {
      id: 'qe-1',
      author: 'farah',
      at: days(2),
      body: 'When should a home business register for GST? I am close to the limit this year.',
    },
    {
      id: 'qe-1a',
      author: 'ananya',
      at: days(2) + 90,
      parent: 'qe-1',
      body: 'Register before you cross it, not after. Once registered you can also claim input credit on your oven, packaging and other purchases, which some home bakers find balances out the tax.',
    },
    {
      id: 'qe-2',
      author: 'tanvi',
      at: days(10),
      body: 'How did you find your first international clients? I have one now and want a repeatable way to find more.',
    },
    {
      id: 'qe-2a',
      author: 'kavita',
      at: days(10) + 360,
      parent: 'qe-2',
      body: 'Ask your German client for one introduction, specifically. Not “do you know anyone”, but “who is one person you would recommend me to?” Most of our export buyers came that way.',
    },
    {
      id: 'qe-2b',
      author: 'sunita',
      at: days(10) + 500,
      parent: 'qe-2',
      body: 'Also look at the export promotion council for handicrafts. Their trade fairs are expensive, but they sometimes subsidise first-time women exhibitors.',
    },
    {
      id: 'qe-3',
      author: 'heena',
      at: days(25),
      body: 'Is it worth paying for Instagram ads at my size, about 2,000 followers?',
    },
    {
      id: 'qe-3a',
      author: 'kavita',
      at: days(25) + 240,
      parent: 'qe-3',
      body: 'Try a small, fixed budget on your single best-selling product for two weeks and measure orders, not likes. If it does not pay for itself, stop and put the money into product photography instead.',
    },
  ],
};

export const SEED_QUERY_THREADS: Record<string, SeedComment[]> = Object.fromEntries(
  SEED_QUERY_BLOGS.map((q) => [q.slug, thread(OPENED_AT, ENTRIES[q.slug] ?? [])]),
);
