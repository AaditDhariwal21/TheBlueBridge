import { SEED_BLOGS } from './blogs';
import { thread, type SeedComment, type SeedEntry } from './threadBuilder';

/**
 * Comment threads per blog, keyed by blog id. The return-to-work thread is
 * deliberately deep and long, to exercise the threading UI. The one-line
 * "first client" post has no comments, to show the empty state.
 */
const ENTRIES: Record<string, SeedEntry[]> = {
  'first-itr-as-a-freelancer': [
    {
      id: 'itr-1',
      author: 'pooja',
      at: 25,
      body: 'Saving this. The FIRA point alone would have saved me a very stressful August last year.',
    },
    {
      id: 'itr-2',
      author: 'ananya',
      at: 41,
      parent: 'itr-1',
      body: 'If your bank did not issue FIRAs automatically, ask for an e-FIRC. Most banks can generate it from their portal now.',
    },
    {
      id: 'itr-3',
      author: 'tanvi',
      at: 70,
      body: 'Does 44ADA apply to textile design work, or only to “professions” in the narrow sense? My CA and my friend’s CA gave different answers.',
    },
    {
      id: 'itr-4',
      author: 'ananya',
      at: 96,
      parent: 'itr-3',
      body: 'Good question, and the honest answer is that it depends on how your work is structured. Interior and fashion design have been treated as notified professions; selling finished textiles is business income under 44AD instead. Happy to look at your invoices if you post in the Finance Query Blog.',
    },
    {
      id: 'itr-5',
      author: 'tanvi',
      at: 110,
      parent: 'itr-4',
      body: 'That explains the two answers! Will post there tonight.',
    },
  ],

  'remote-tech-jobs-from-jodhpur': [
    {
      id: 'rt-1',
      author: 'priya',
      at: 30,
      body: 'This is exactly the post I needed this week. I am a data analyst, two years in, and every remote role seems to want five years of experience. Did you apply for roles above your level?',
    },
    {
      id: 'rt-2',
      author: 'pooja',
      at: 52,
      parent: 'rt-1',
      body: 'Yes, always slightly above. Years of experience on a job post are a wish list. If you meet about 70 percent of it, apply.',
    },
    {
      id: 'rt-3',
      author: 'komal',
      at: 140,
      body: 'Would you look at portfolios from students too? I am finishing my MBA but I have been teaching myself React on the side.',
    },
    {
      id: 'rt-4',
      author: 'pooja',
      at: 175,
      parent: 'rt-3',
      body: 'Of course. Share a link here or message me.',
    },
    {
      id: 'rt-5',
      author: 'komal',
      at: 190,
      parent: 'rt-4',
      body: 'Thank you! Here it is: https://github.com/komal-vyas/expense-splitter-with-upi-deeplinks-and-offline-sync-demo',
    },
    {
      id: 'rt-6',
      author: 'divya',
      at: 260,
      body: 'From the hiring side: writing in public works. Two of the last five engineers we hired came to us because someone on the team had read their blog.',
    },
  ],

  'back-to-work-after-six-years': [
    {
      id: 'bw-1',
      author: 'jyoti',
      at: 40,
      body: 'The one-sentence answer is gold. I spent my first interview after maternity leave apologising and I could feel the room go cold.',
    },
    {
      id: 'bw-2',
      author: 'neha',
      at: 66,
      parent: 'bw-1',
      body: 'It happens to almost everyone the first time. The second interview is always better.',
    },
    {
      id: 'bw-3',
      author: 'sakshi',
      at: 95,
      parent: 'bw-2',
      body: 'I would add: practise the sentence out loud, to a mirror or a friend. It sounds very different when you have said it ten times.',
    },
    {
      id: 'bw-4',
      author: 'jyoti',
      at: 130,
      parent: 'bw-3',
      body: 'Trying this tonight with my husband as the “interviewer”. He is going to enjoy this far too much.',
    },
    {
      id: 'bw-5',
      author: 'neha',
      at: 151,
      parent: 'bw-4',
      body: 'Ask him to throw in “so why should we hire you over someone with continuous experience?” That is the follow-up that trips people up.',
    },
    {
      id: 'bw-6',
      author: 'jyoti',
      at: 205,
      parent: 'bw-5',
      body: 'Oof. Okay. What is a good answer to that one?',
    },
    {
      id: 'bw-7',
      author: 'neha',
      at: 232,
      parent: 'bw-6',
      body: 'Do not compare yourself to the imaginary candidate. Talk about what you bring: “I bring eight years of experience in X, and I am returning with a very clear sense of what I want and why.” Then give one concrete example.',
    },
    {
      id: 'bw-8',
      author: 'lata',
      at: 260,
      parent: 'bw-6',
      body: 'In thirty years of interview boards I never once preferred continuous experience over clarity of purpose. The candidate who knows why she is in the room wins.',
    },
    {
      id: 'bw-9',
      author: 'heena',
      at: 300,
      parent: 'bw-1',
      body: 'Same. I think we are taught to fill silence with explanations.',
    },
    {
      id: 'bw-10',
      author: 'divya',
      at: 340,
      parent: 'bw-1',
      body: 'As someone who interviews people every week: we notice confidence far more than gaps.',
    },
    {
      id: 'bw-11',
      author: 'ritu',
      at: 410,
      body: 'The point about telling your family what will change is underrated. We did a proper “handover” meeting at home before I joined, like you would at work. It sounds silly and it worked.',
    },
    {
      id: 'bw-12',
      author: 'neha',
      at: 455,
      parent: 'bw-11',
      body: 'Not silly at all. A household is an organisation too.',
    },
    {
      id: 'bw-13',
      author: 'megha',
      at: 600,
      body: 'On the negotiation point: please also restart your retirement contributions on day one. The six years of missing PF contributions are the gap that actually costs money later.',
    },
    {
      id: 'bw-14',
      author: 'komal',
      at: 720,
      parent: 'bw-13',
      body: 'Is there a way to catch up on the missed years, or is it gone?',
    },
    {
      id: 'bw-15',
      author: 'megha',
      at: 760,
      parent: 'bw-14',
      body: 'You cannot back-fill PF, but you can raise voluntary contributions (VPF) or add to an NPS account. Even a few thousand a month for the first few years closes a surprising amount of the gap.',
    },
    {
      id: 'bw-16',
      author: 'farah',
      at: 1300,
      body: 'Sharing this with my sister, who has been “thinking about it” for two years. Thank you for writing it so warmly.',
    },
    {
      id: 'bw-17',
      author: 'aishwarya',
      at: 1700,
      body: 'Returnship programmes are great, and also: startups are often more flexible than they look. Several of us would happily talk to experienced women returning to work. The gap genuinely does not bother us.',
    },
    {
      id: 'bw-18',
      author: 'neha',
      at: 1760,
      parent: 'bw-17',
      body: 'This is really good to hear. Would you be open to listing your openings in the Career Query Blog?',
    },
    {
      id: 'bw-19',
      author: 'aishwarya',
      at: 1800,
      parent: 'bw-18',
      body: 'Done, posted there this morning.',
    },
  ],

  'pricing-handicrafts-for-instagram': [
    {
      id: 'ph-1',
      author: 'heena',
      at: 120,
      body: 'The ₹40 loss per order line hit hard. I just did the same exercise for my silver earrings and found the same thing with courier charges.',
    },
    {
      id: 'ph-2',
      author: 'kavita',
      at: 180,
      parent: 'ph-1',
      body: 'Courier is the silent killer. Negotiate a rate once you cross about 100 shipments a month; aggregators will move on price.',
    },
    {
      id: 'ph-3',
      author: 'sunita',
      at: 400,
      body: 'Putting the artisan’s name on the product page is also simply the right thing to do. Lovely to see it paying off commercially too.',
    },
  ],

  'aiims-and-twins-timetable': [
    {
      id: 'tw-1',
      author: 'pooja',
      at: 200,
      body: 'The alternating “on call” evening is going straight onto our fridge.',
    },
    {
      id: 'tw-2',
      author: 'shalini',
      at: 700,
      body: 'Thank you for writing about the weeks where the paper does not move. Academic medicine does not talk about that nearly enough.',
    },
    {
      id: 'tw-3',
      author: 'ritu',
      at: 760,
      parent: 'tw-2',
      body: 'We should start a support group. We would just need to find an evening when none of us is on call.',
    },
  ],

  'salary-negotiation-scripts': [
    {
      id: 'sn-1',
      author: 'komal',
      at: 90,
      body: 'Do these work for a first job too? Campus placements feel like there is no room at all.',
    },
    {
      id: 'sn-2',
      author: 'divya',
      at: 130,
      parent: 'sn-1',
      body: 'Campus offers usually have little room on base pay, but you can often ask about joining date, location or the relocation allowance. It is still worth asking politely.',
    },
    {
      id: 'sn-3',
      author: 'jyoti',
      at: 520,
      body: 'The silence after asking is the hardest part. I counted to ten in my head the last time.',
    },
    {
      id: 'sn-4',
      author: 'ishita',
      at: 1440,
      body: 'Script three works for freelance rates too. If a client will not move on the fee, I ask for a shorter payment cycle instead.',
    },
  ],

  'daughters-education-fund': [
    {
      id: 'ef-1',
      author: 'jyoti',
      at: 60,
      body: 'Raising the SIP on her birthday is such a nice ritual. Stealing it.',
    },
    {
      id: 'ef-2',
      author: 'ananya',
      at: 300,
      body: 'Worth adding: the Sukanya deposit also counts under Section 80C if you are still on the old tax regime.',
    },
    {
      id: 'ef-3',
      author: 'megha',
      at: 340,
      parent: 'ef-2',
      body: 'Yes! Thank you, I should have mentioned that.',
    },
  ],

  'pcos-at-thirty': [
    {
      id: 'pc-1',
      author: 'nirmala',
      at: 150,
      body: 'Strength training two or three times a week. I say this to patients daily and it is lovely to see a gynaecologist say it too.',
    },
    {
      id: 'pc-2',
      author: 'priya',
      at: 800,
      body: 'I was diagnosed last year and felt very alone with it. Thank you for the reminder that bajra roti counts as a plan.',
    },
    {
      id: 'pc-3',
      author: 'shalini',
      at: 900,
      parent: 'pc-2',
      body: 'You are far from alone. Roughly one in five women I see has some features of PCOS. Please do follow up with your doctor regularly.',
    },
  ],

  'women-founders-programmes-jodhpur': [
    {
      id: 'wf-1',
      author: 'farah',
      at: 240,
      body: 'Can I come to the founders’ breakfast if my business is a home kitchen?',
    },
    {
      id: 'wf-2',
      author: 'sunita',
      at: 300,
      parent: 'wf-1',
      body: 'Absolutely. Some of our most useful conversations have been with food founders.',
    },
    {
      id: 'wf-3',
      author: 'kavita',
      at: 1500,
      body: 'Confirming the DIC route works. It took four visits and a lot of patience, but the loan came through.',
    },
  ],

  'leaving-at-six': [
    {
      id: 'ls-1',
      author: 'divya',
      at: 180,
      body: '“I am heading out, I will pick this up at 9:30 tomorrow.” I am going to say this exact sentence on Monday.',
    },
  ],

  'first-generation-woman-lawyer-high-court': [
    {
      id: 'fl-1',
      author: 'lata',
      at: 600,
      body: 'Beautifully put. “Half of practice is being known as reliable” is true of the civil service too.',
    },
    {
      id: 'fl-2',
      author: 'komal',
      at: 1200,
      body: 'Is the lunch table open to law students? My cousin starts at the National Law University this year.',
    },
    {
      id: 'fl-3',
      author: 'rashmi',
      at: 1290,
      parent: 'fl-2',
      body: 'Tell her to find me. The table is open to anyone who will one day sit at it.',
    },
  ],

  'kaylana-walks-and-my-back': [
    {
      id: 'kw-1',
      author: 'sakshi',
      at: 400,
      body: 'Which days do you walk? Three of us teachers have been looking for a morning group.',
    },
    {
      id: 'kw-2',
      author: 'nirmala',
      at: 460,
      parent: 'kw-1',
      body: 'Monday, Wednesday and Friday, 6:15 am, from the Kaylana garden gate. Just come.',
    },
  ],

  'home-kitchen-to-forty-orders': [
    {
      id: 'hk-1',
      author: 'ananya',
      at: 300,
      body: 'Saying no to custom orders that do not make sense is the most underrated pricing strategy there is.',
    },
    {
      id: 'hk-2',
      author: 'heena',
      at: 1000,
      body: 'Your mawa cake is the reason I know about this community. Huge congratulations, Farah.',
    },
  ],

  'reading-a-term-sheet': [
    {
      id: 'ts-1',
      author: 'sunita',
      at: 500,
      body: 'The reference check on investors is the advice I give most often and the one founders skip most often. Thank you for writing it down.',
    },
    {
      id: 'ts-2',
      author: 'megha',
      at: 2000,
      body: 'Congratulations on the round! Would you write a follow-up on how you chose your lawyer?',
    },
  ],
};

export const SEED_BLOG_COMMENTS: Record<string, SeedComment[]> = Object.fromEntries(
  SEED_BLOGS.map((blog) => [blog.id, thread(blog.createdAt, ENTRIES[blog.id] ?? [])]),
);
