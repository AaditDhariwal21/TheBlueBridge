import { CURRENT_USER } from '../../../app/currentUser';
import { initialsOf } from '../lib/text';
import type { User } from '../model/types';

function member(id: string, name: string, profession: string): User {
  return { id, name, profession, initials: initialsOf(name) };
}

/** Seed members. Professions are plain descriptive text, never roles. */
export const USERS = {
  ananya: member('u-ananya', 'Ananya Singhvi', 'Chartered Accountant'),
  neha: member('u-neha', 'Neha Kothari', 'HR Consultant'),
  kavita: member('u-kavita', 'Kavita Bhati', 'Founder, Leheriya & Co.'),
  ritu: member('u-ritu', 'Dr. Ritu Choudhary', 'Assistant Professor of Physiology'),
  shalini: member('u-shalini', 'Dr. Shalini Purohit', 'Gynaecologist'),
  pooja: member('u-pooja', 'Pooja Mathur', 'Senior Frontend Engineer'),
  divya: member('u-divya', 'Divya Lodha', 'Talent Acquisition Lead'),
  megha: member('u-megha', 'Megha Jain', 'Certified Financial Planner'),
  sunita: member('u-sunita', 'Sunita Parihar', 'Startup Mentor'),
  ishita: member('u-ishita', 'Ishita Mohnot', 'Architect'),
  tanvi: member('u-tanvi', 'Tanvi Daga', 'Textile Designer'),
  rashmi: member('u-rashmi', 'Rashmi Bohra', 'Advocate, Rajasthan High Court'),
  nirmala: member('u-nirmala', 'Nirmala Kalla', 'Physiotherapist'),
  farah: member('u-farah', 'Farah Qureshi', 'Home Baker and Founder'),
  aishwarya: member('u-aishwarya', 'Aishwarya Shekhawat', 'Co-founder, agritech startup'),
  priya: member('u-priya', 'Priya Mehta', 'Data Analyst'),
  komal: member('u-komal', 'Komal Vyas', 'Final-year MBA student'),
  sakshi: member('u-sakshi', 'Sakshi Bissa', 'School Principal'),
  heena: member('u-heena', 'Heena Soni', 'Jewellery Designer'),
  jyoti: member('u-jyoti', 'Jyoti Rathore', 'Bank Branch Manager'),
  lata: member('u-lata', 'Lata Bhandari', 'Retired IAS Officer'),
  current: { ...CURRENT_USER },
} satisfies Record<string, User>;

export type SeedUserKey = keyof typeof USERS;
