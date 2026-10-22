export const EPISODE_CONTENT = Object.freeze([
  {
    type: 'paragraph',
    text: 'The first day of meeting in a new class was an exciting experience, I mean from level 100 where you do most work in the college to doing less work (level 200). It marked the beginning of a new academic journey filled with opportunities to learn, interact with new classmates, and build relationships with lecturers. The day also provided an opportunity to become familiar with the new learning environment and understand what to expect throughout the semester.',
  },
  {
    type: 'paragraph',
    text: 'Today is Tuesday, 20th October, 2026 at exactly 8:00am, three course groups, Math/IT, IT/Math and Math/Science students gathered at learning room two for their first class for the semester. We arrived early for the class hoping to start on a good note but as usual there will always be some bad nuts.',
  },
  {
    type: 'paragraph',
    text: 'Mr. Joseph Kafui Letsa-Agbozo as he introduced himself as arrived about 45 minutes after time. I guess, he was trying to find his way to the class. He was very friendly and kind as a good and professional lecturer ought to be. He informed us that today’s lesson will be about familiarization with the course and ourselves as well.',
  },
  {
    type: 'paragraph',
    text: 'After his introduction, we also did same while adding what we do or can do aside academics.',
  },
  { type: 'dialogue', speaker: 'Bernice', text: '“My name is Bernice Deladem Kporfor from Akatsi. Aside academics I play the trumpet and also a momo agent.”' },
  { type: 'dialogue', speaker: 'Mr. Kafui', text: '“Ok next.”' },
  { type: 'dialogue', speaker: 'Bright', text: '“Bright Selorm Nyanyovovor is my name and I help my dad.”' },
  { type: 'dialogue', speaker: 'Mr. Kafui', text: '“what kind of work is your dad into?”' },
  { type: 'dialogue', speaker: 'Bright', text: '“He is a susu collector.”' },
  { type: 'dialogue', speaker: 'Mr. Kafui', text: '“Is that a lucrative business?”' },
  { type: 'dialogue', speaker: 'Bright', text: '“Yes sir, it is. We also offer loans.”' },
  { type: 'dialogue', speaker: 'Mr. Kafui', text: '“I mean money is something people will always be in need of so that’s a good business. I guess we are looking at a millionaire in the making.”' },
  { type: 'dialogue', speaker: 'Othnevia', text: '“Yes sir. Bright please ask your dad to loan us some money for our school fees.”' },
  { type: 'dialogue', speaker: 'Class', text: '“hahaha…. Yes.”' },
  { type: 'dialogue', speaker: 'Gloria', text: '“My name is Gloria Agbenyegah from Sogakope. Aside academics I am good at eating.”' },
  { type: 'paragraph', text: 'The whole class burst out with laughter.' },
  { type: 'dialogue', speaker: 'Mr. Kafui', text: '“haha is eating the only thing you can do?”' },
  { type: 'dialogue', speaker: 'Gloria', text: '“Sir, I don’t know what I’m good at though.”' },
  { type: 'dialogue', speaker: 'Mr. Kafui', text: '“Well, every individual is capable of doing something at least a skill or a talent that you may possess.”' },
  {
    type: 'paragraph',
    text: 'The introduction continued until the very last person. From this we learnt about our individual differences, how to build connections and even seek for business advice. From the young investors, dealers, cook, farmers to the adidas.',
  },
  {
    type: 'paragraph',
    text: 'In conclusion, the day was filled with mixed feelings of excitement, nervousness, and curiosity as we began our journey in a new class. Although we were initially shy and uncertain, the atmosphere gradually became more welcoming as the day progressed. By the time classes ended, we had begun to feel more comfortable with one another. As we packed our bags and prepared to leave, one thing was certain: this was only the beginning of a new chapter filled with challenges, lesson, and unforgettable memories.',
  },
]);

export const EPISODE_TITLE = 'Writing piece on Further Algebra class';
export const EPISODE_SLUG = 'episode-one';

export function parseEpisodeBody(body = '') {
  return body.split(/\n\s*\n/).flatMap((paragraph) => paragraph.split('\n').map((line) => line.trim()).filter(Boolean)).map((line) => {
    const dialogue = line.match(/^([^:]{1,32}):\s+(.+)$/);
    return dialogue ? { type: 'dialogue', speaker: dialogue[1], text: dialogue[2] } : { type: 'paragraph', text: line };
  });
}
