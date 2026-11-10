import type { CategoryId } from '../model/types';
import { ago } from './time';
import type { SeedUserKey } from './users';

export interface SeedBlog {
  id: string;
  title: string;
  categoryId: CategoryId;
  author: SeedUserKey;
  createdAt: string;
  body: string;
}

/** Paragraphs joined by a blank line, the same format the composer produces. */
const p = (...paragraphs: string[]) => paragraphs.join('\n\n');

export const SEED_BLOGS: SeedBlog[] = [
  {
    id: 'first-itr-as-a-freelancer',
    title: 'A chartered accountant’s checklist for filing your first ITR as a freelancer',
    categoryId: 'finance',
    author: 'ananya',
    createdAt: ago({ hours: 3, minutes: 20 }),
    body: p(
      'Every July my phone fills up with the same message from friends who have just gone independent: “I got paid by three clients this year, one of them abroad. Which form do I even file?” This is the checklist I send them, tidied up for all of you.',
      'Start with Form 26AS and the AIS on the income tax portal. Download both before you do anything else. Clients who deducted TDS will show up there, and so will interest from your savings account that you have probably forgotten about. If a client’s TDS is missing, write to them now, not in the last week of July.',
      'Next, decide whether presumptive taxation under Section 44ADA suits you. If your gross receipts are under the limit and you are a professional such as a designer, consultant or developer, you can declare half your receipts as income and skip detailed books. It is not always the cheapest option, but it is almost always the simplest for a first year.',
      'Foreign clients paying through PayPal, Wise or a direct SWIFT transfer? Keep the FIRA or bank advice for every payment. Your income is taxable in India in rupees, at the rate on the day you received it, and you will want that paper trail if a notice ever arrives.',
      'Finally, open a separate savings account for business receipts and move 25 to 30 percent of every payment into a “tax” fixed deposit the day it lands. Advance tax is due in instalments through the year, and the interest under Sections 234B and 234C adds up quietly. The women I see most stressed in July are never the ones who earned the least. They are the ones who did not set money aside.',
    ),
  },
  {
    id: 'remote-tech-jobs-from-jodhpur',
    title: 'Remote tech jobs from Jodhpur are real. Here is how I found mine.',
    categoryId: 'tech',
    author: 'pooja',
    createdAt: ago({ hours: 9 }),
    body: p(
      'Two years ago I was told, more than once, that a frontend engineer in Jodhpur had two options: move to Bengaluru or accept a local salary. Today I work for a product company in Berlin from my desk in Shastri Nagar. It was not luck, and it was not quick, so here is the honest version.',
      'I stopped applying through job boards. Out of roughly 140 applications in my first three months I got four replies. What worked was writing in public: short posts about problems I had solved at work, a small open-source date-picker that people actually used, and thoughtful comments on engineering blogs from companies I admired.',
      'Time zones are the conversation you need to have early. I overlap four hours with Berlin, from 1:30 to 5:30 pm my time, and I protect those hours fiercely. Mornings are for deep work and my daughter’s school run. Being clear about this in interviews made me look more senior, not less committed.',
      'Get your setup sorted before your first day: a power backup that lasts at least two hours, two internet connections from different providers, and a quiet corner with a door. The summer outages here are not a myth, and “my light went” stops being charming after the second standup.',
      'If you are a developer here and want someone to look at your portfolio, reply below. I would rather spend an evening reviewing ten portfolios than watch another talented woman decide the city is too small for her career.',
    ),
  },
  {
    id: 'back-to-work-after-six-years',
    title: 'What I wish I had known before going back to work after a six-year break',
    categoryId: 'work-life',
    author: 'neha',
    createdAt: ago({ days: 2, hours: 4 }),
    body: p(
      'When my son started Class 1, I updated my CV for the first time in six years and stared at the gap in the middle of it for a whole evening. I had been an HR business partner at a textile exporter before he was born. On paper, it looked like I had simply stopped existing.',
      'The first thing I wish I had known is that the gap matters far more to you than to the people reading your CV. In the forty-odd interviews I have since conducted as a consultant, nobody has rejected a woman for a career break. They have rejected women who apologised for it for ten minutes.',
      'Say it in one sentence and move on: “I took six years to raise my son, and I am now ready to return full-time.” Then talk about what you did in those years that is relevant. I had run the parent committee at his school and organised a fundraiser for 600 families. That is stakeholder management, whatever the job portals call it.',
      'Second, returnship programmes are worth your time, even the unpaid-sounding ones. Several large companies now run structured six-month programmes for women returning to work, and many convert to permanent roles. Look at the fine print, but do not dismiss them.',
      'Third, negotiate. I almost accepted the first number because I felt grateful to be asked. A friend made me ask for 18 percent more, and I got 12. The gratitude faded within a month; the salary did not.',
      'And finally, tell your family what will change before it changes. Who picks up from school, who cooks on Tuesdays, what happens when someone falls ill. The return was hardest in the weeks when we were improvising those answers every morning.',
    ),
  },
  {
    id: 'pricing-handicrafts-for-instagram',
    title: 'Pricing your handicraft business for Instagram buyers outside Rajasthan',
    categoryId: 'entrepreneurship',
    author: 'kavita',
    createdAt: ago({ days: 3, hours: 7 }),
    body: p(
      'Leheriya & Co. began as a stall at a Diwali mela with my mother’s dupattas. Three years later we ship to 22 states and four countries, and the single biggest lesson has been this: what sells in Jodhpur at ₹650 needs to be priced very differently for a buyer in Pune.',
      'Work out your true cost first. Fabric, dye and the artisan’s wages are obvious. Packaging, the courier, payment-gateway fees, returns and the hours you spend answering “is this available?” in DMs are not. When I added those up honestly, my best-selling dupatta was losing ₹40 on every order.',
      'Then price for the story, not just the cloth. Buyers outside Rajasthan are paying for the hand-tied process and the woman in Bhadwasiya who made it. Put her name and a photograph of her hands on the product page, with her permission. Our average order value went up by a third the month we started doing this, with no change to the product.',
      'Free shipping is a pricing decision, not a gift. Build it into the price, set a minimum order for it, and watch your basket size grow. Discounts, on the other hand, teach your followers to wait. We run exactly two sales a year now and our regular customers know it.',
    ),
  },
  {
    id: 'aiims-and-twins-timetable',
    title: 'Teaching at AIIMS Jodhpur and raising twins: an honest timetable',
    categoryId: 'work-life',
    author: 'ritu',
    createdAt: ago({ days: 5, hours: 2 }),
    body: p(
      'People ask how I “manage it all” in a tone that suggests I have a secret. I do not. I have a timetable, a husband who reads it, a mother-in-law who rewrote half of it, and a fridge door covered in sticky notes.',
      'Weekdays start at 5:15 am. I get an hour to prepare lectures before the twins wake, because I learnt the hard way that I cannot think about the cardiac cycle and pack two tiffins at the same time. Lectures and practicals run until 2 pm, and research happens in the gaps, which is not ideal, but it is honest.',
      'The rule that saved us is that one parent is always “on call” for the children each evening, and it alternates. On my off evenings I can stay late for a lab meeting or simply sit in the library without guilt. We wrote it down. Writing it down was the whole trick.',
      'I also stopped measuring good days against the version of me who had no children. Some weeks the paper does not move. Some weeks I miss the annual day rehearsal. Both are survivable, and neither defines me as a doctor or a mother.',
    ),
  },
  {
    id: 'salary-negotiation-scripts',
    title: 'The salary conversation: three scripts that worked for me',
    categoryId: 'career',
    author: 'divya',
    createdAt: ago({ days: 6, hours: 11 }),
    body: p(
      'I have sat on both sides of the table: I hire for a living, and I have negotiated my own offers three times. Here are the exact words that worked, because “know your worth” has never helped anyone in the actual moment.',
      'When asked for your expected salary before an offer: “I would like to understand the role and the band first. Could you share the range you have budgeted?” Most recruiters will tell you. If they insist, give a range whose bottom is a number you would be genuinely happy with.',
      'When the offer comes in low: “Thank you, I am excited about this role. Based on the scope we discussed and my experience leading a team of six, I was expecting something closer to fourteen lakh. Is there flexibility?” Then stop talking. The silence is uncomfortable. Let it be.',
      'When they cannot move on fixed pay: “I understand. Could we look at a joining bonus, a review at six months instead of twelve, or two days of remote work a week?” Every one of these has a value, and many managers have more room on them than on the base salary.',
    ),
  },
  {
    id: 'daughters-education-fund',
    title: 'Sukanya, PPF or mutual funds? How I split my daughter’s education fund',
    categoryId: 'finance',
    author: 'megha',
    createdAt: ago({ days: 8 }),
    body: p(
      'My daughter is four. A good engineering or medical degree today costs somewhere between twelve and twenty-five lakh, and at a modest 8 percent education inflation that becomes forty to eighty lakh by the time she is eighteen. Those numbers scared me into making a plan.',
      'Sukanya Samriddhi gets the first slice. The rate is government-backed, the maturity is tax-free, and it forces discipline because you cannot dip into it on a whim. I put in a fixed amount every April so it earns interest for the full year.',
      'The largest share goes into two diversified equity index funds through a monthly SIP. With fourteen years to go, equity is where the real growth will come from, and index funds keep costs low. I raise the SIP by ten percent every year, on her birthday, so I never forget.',
      'From the time she turns fourteen, I will start moving money from equity into short-term debt funds and fixed deposits, a little each quarter. The worst thing that can happen is a market crash in the year the fees are due.',
      'This is my plan, not advice for yours. If you would like help thinking through your own numbers, ask in the Finance Query Blog. I try to answer there every Sunday.',
    ),
  },
  {
    id: 'pcos-at-thirty',
    title: 'PCOS at thirty: what my patients and I actually changed',
    categoryId: 'health',
    author: 'shalini',
    createdAt: ago({ days: 9, hours: 5 }),
    body: p(
      'I diagnose polycystic ovary syndrome several times a week, and I was diagnosed with it myself at twenty-nine. That gives me a slightly unusual view of the advice women receive, which is often either alarming or useless.',
      'The changes that consistently help are unglamorous. Strength training two or three times a week does more for insulin resistance than any supplement I have seen marketed in a chemist’s shop. Walking after meals helps too. Ten minutes is enough to start.',
      'Food does not need to be foreign or expensive. Bajra and jowar rotis, dal, curd, seasonal sabzi and fewer packaged snacks will take most women a long way. You do not need quinoa. Your nani’s kitchen was closer to the ideal than most diet plans.',
      'Please do not suffer irregular cycles, acne or hair fall quietly for years. These are symptoms worth a conversation with a doctor, and treatment has improved enormously. Book the appointment you have been putting off.',
    ),
  },
  {
    id: 'women-founders-programmes-jodhpur',
    title: 'Five programmes for women founders in and around Jodhpur this winter',
    categoryId: 'local',
    author: 'sunita',
    createdAt: ago({ days: 11, hours: 3 }),
    body: p(
      'Every few weeks someone tells me there is “nothing for founders here”. There is more than people think. It is just scattered across noticeboards, WhatsApp groups and government circulars. Here is what I am recommending to the founders I mentor this season.',
      'The incubation centre at IIT Jodhpur runs open office hours for early-stage founders. You do not need to be an alumna. Email ahead with a one-page summary of what you are building and the specific help you want.',
      'The District Industries Centre is the place to start for collateral-free loans under the state’s self-employment schemes. Go in person, take photocopies of everything, and ask for the officer who handles women entrepreneurs. The process is slow but real money comes out the other end.',
      'Several banks run women-entrepreneur desks at their main Jodhpur branches. Ask specifically about Stand-Up India and Mudra loans; staff at the counter do not always volunteer them.',
      'And the one I always mention last because it is free and underused: the monthly founders’ breakfast that a few of us host near Ratanada. No pitches, no sponsors. Just women who are building things, comparing notes over poha. Message me for the date.',
    ),
  },
  {
    id: 'leaving-at-six',
    title: 'Why I stopped apologising for leaving the office at 6 pm',
    categoryId: 'work-life',
    author: 'ishita',
    createdAt: ago({ days: 13, hours: 6 }),
    body: p(
      'Architecture has a culture of late nights that we pretend is passion. For my first seven years I stayed until nine or ten, mostly because everyone else did. My drawings did not get better after eight. My mood got noticeably worse.',
      'When I started my own practice I made 6 pm a hard stop, and I told clients up front. Not one has left over it. A few have said they found it reassuring: someone who protects her own time is probably careful with theirs.',
      'The real change was internal. I stopped saying “sorry, I have to leave” and started saying “I am heading out, I will pick this up at 9:30 tomorrow”. The words are small. The difference in how people treated my time was not.',
    ),
  },
  {
    id: 'first-international-client',
    title: 'First client from Germany today.',
    categoryId: 'entrepreneurship',
    author: 'tanvi',
    createdAt: ago({ days: 14, hours: 1 }),
    body: 'Small studio, big day. Thank you to everyone in this community who reviewed my portfolio last month. Your notes are why this happened.',
  },
  {
    id: 'first-generation-woman-lawyer-high-court',
    title:
      'On building a practice at the Rajasthan High Court as a first-generation woman lawyer, and the unwritten rules nobody explained to me in my first three years',
    categoryId: 'career',
    author: 'rashmi',
    createdAt: ago({ days: 16, hours: 8 }),
    body: p(
      'Nobody in my family had been inside a courtroom except as a witness. When I enrolled with the Bar Council, I knew the law reasonably well and the profession not at all. These are the things I learnt slowly that I would like you to learn quickly.',
      'Your senior is your syllabus. Choose one for the way they prepare, not the size of their chamber. I spent two years with a senior who had very few matters but read every file twice, and I still draft the way she taught me.',
      'Be in court even when your matter is not listed. You learn how particular benches think, which arguments land and which irritate, and the court staff start to recognise you. Half of practice is being known as reliable.',
      'Money will be thin for longer than you expect. Keep a small, steady side income if you can, such as drafting work, legal research for firms, or teaching at a coaching centre, so that you never take a brief only because you need the fee.',
      'And find the other women. There are more of us at the Bar in Jodhpur than there were a decade ago. We have a lunch table now. Come and sit with us.',
    ),
  },
  {
    id: 'kaylana-walks-and-my-back',
    title: 'Morning walks at Kaylana and the habit that fixed my back',
    categoryId: 'health',
    author: 'nirmala',
    createdAt: ago({ days: 18, hours: 2 }),
    body: p(
      'For a physiotherapist, I ignored my own back pain for an embarrassingly long time. Twelve hours a day bending over patients will do that. What finally fixed it was not a machine or a belt. It was a habit.',
      'Three mornings a week I walk the stretch along Kaylana lake with two friends, and at the end we do ten minutes of exercises together: bridges, bird-dogs, side planks against the railing. The walk gets us out of bed. The exercises are what my back needed.',
      'If you sit at a desk all day, set a timer for every 45 minutes and stand up. Walk to the water cooler, roll your shoulders, look at something far away. Your spine is designed to move. Most of the pain I treat in women in their thirties is simply the cost of not moving.',
    ),
  },
  {
    id: 'home-kitchen-to-forty-orders',
    title: 'From a home kitchen in Sardarpura to forty orders a day',
    categoryId: 'entrepreneurship',
    author: 'farah',
    createdAt: ago({ days: 21, hours: 4 }),
    body: p(
      'I baked my first mawa cake for sale during the lockdown, for a neighbour’s anniversary. Today my kitchen sends out about forty orders a day, and I have three women working with me. I am still in the same kitchen, with one more oven.',
      'Get your FSSAI registration early. For a small home business the basic registration is simple and inexpensive, and it changes how customers and corporate buyers see you. Two of my largest regular orders came only after I could show the certificate.',
      'Say no to custom orders that do not make sense. Early on I accepted every request: three-tier cakes for two people, sugar-free orders at midnight. Now I have a menu, a cut-off time and a minimum order. My income went up when I started saying no.',
      'And hire women from your own neighbourhood. They understand the work, they understand the families who order from us, and the money stays in the mohalla. That part of the business makes me prouder than any review.',
    ),
  },
  {
    id: 'reading-a-term-sheet',
    title: 'Learning to read a term sheet: notes from our first angel round',
    categoryId: 'finance',
    author: 'aishwarya',
    createdAt: ago({ days: 24, hours: 6 }),
    body: p(
      'We closed our first angel round last month for our drip-irrigation advisory service for farmers around Osian. I read the term sheet four times and still had to look up half the words. Here are my notes, for the next founder who is staring at one.',
      'Valuation gets all the attention, but the liquidation preference matters more if things go sideways. A one-times, non-participating preference is standard and fair. Anything more, ask why.',
      'Look carefully at the option pool. If investors ask you to create one before the round, it comes out of your share, not theirs. That is normal, but size it for the hires you will actually make in the next eighteen months, not a fantasy org chart.',
      'Information rights, board seats and the founders’ vesting schedule are all negotiable. Get a lawyer who has seen a hundred of these, and ask other founders who have raised from the same people what they were like when things got hard. That reference check was the most useful hour of the entire process.',
    ),
  },
];
