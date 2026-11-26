// "Fun fact of the day" for the dashboard. A fact-checker should get its own facts right, so every
// entry is a well-established fact, and most correct a popular myth. Keep entries short and sourced
// from mainstream references (encyclopedias, space agencies, natural-history museums).

export const FUN_FACTS = [
  {
    topic: 'Space',
    myth: 'The Great Wall of China is visible from the Moon.',
    fact: 'It isn’t. From the Moon no individual human-made structure can be seen with the naked eye, and even from low orbit the wall is very hard to spot.',
  },
  {
    topic: 'Body',
    myth: 'We only use 10% of our brains.',
    fact: 'Brain imaging shows activity throughout the brain, and damage to almost any area causes some loss of function.',
  },
  {
    topic: 'Animals',
    fact: 'Octopuses have three hearts: two pump blood through the gills and one pumps it around the rest of the body.',
  },
  { topic: 'Food', fact: 'Botanically, bananas are berries, but strawberries are not.' },
  {
    topic: 'Space',
    fact: 'Venus takes longer to turn once on its axis (about 243 Earth days) than to orbit the Sun (about 225 Earth days).',
  },
  {
    topic: 'Weather',
    myth: 'Lightning never strikes the same place twice.',
    fact: 'Tall structures are hit again and again. The Empire State Building is struck around two dozen times a year.',
  },
  {
    topic: 'Animals',
    myth: 'Bulls are enraged by the colour red.',
    fact: 'Cattle can’t distinguish red well. Bulls charge at the movement of the matador’s cape, not its colour.',
  },
  {
    topic: 'Animals',
    myth: 'Goldfish have a three-second memory.',
    fact: 'Experiments show goldfish can remember things for months, and can be trained to respond to sounds and colours.',
  },
  {
    topic: 'Body',
    myth: 'Cracking your knuckles causes arthritis.',
    fact: 'Studies comparing habitual knuckle-crackers with non-crackers have found no link to arthritis.',
  },
  {
    topic: 'Nature',
    fact: 'Sharks are older than trees. Sharks appeared around 450 million years ago; the first trees about 385 million years ago.',
  },
  {
    topic: 'Animals',
    fact: 'Wombats produce cube-shaped droppings, which is thought to stop them rolling off the rocks and logs where wombats leave them as territory markers.',
  },
  {
    topic: 'Earth',
    fact: 'The summit of Ecuador’s Chimborazo, not Everest, is the point on Earth’s surface farthest from the planet’s centre, thanks to the bulge at the equator.',
  },
  {
    topic: 'Maths',
    fact: 'There are more possible games of chess than atoms in the observable universe: roughly 10^120 versus about 10^80.',
  },
  {
    topic: 'History',
    myth: 'Vikings wore horned helmets.',
    fact: 'No horned helmet has been found from a Viking-age warrior. The image was popularised by 19th-century artists and opera costumes.',
  },
  {
    topic: 'Science',
    myth: 'Old windows are thicker at the bottom because glass flows.',
    fact: 'Glass at room temperature does not flow measurably. Old panes were uneven when made, and glaziers often fitted the thick edge at the bottom.',
  },
  {
    topic: 'Food',
    myth: 'Eating carrots gives you night vision.',
    fact: 'Vitamin A prevents night blindness if you are deficient, but extra carrots won’t improve normal eyesight. The myth was spread by British wartime propaganda.',
  },
  {
    topic: 'Animals',
    myth: 'Bats are blind.',
    fact: 'All bats can see. Many also use echolocation, and some fruit bats rely mainly on their eyesight.',
  },
  {
    topic: 'Body',
    myth: 'Blood without oxygen is blue.',
    fact: 'Human blood is always red; it is darker when low in oxygen. Veins look blue because of how skin absorbs and reflects light.',
  },
  {
    topic: 'Animals',
    myth: 'Ostriches bury their heads in the sand.',
    fact: 'They don’t. Ostriches dig shallow nests and turn their eggs with their beaks, which may look like head-burying from a distance.',
  },
  {
    topic: 'History',
    myth: 'Einstein failed maths at school.',
    fact: 'He excelled at it, and had mastered calculus by about age 15.',
  },
  {
    topic: 'Space',
    fact: 'Saturn’s average density is lower than that of water, about 0.69 grams per cubic centimetre.',
  },
  {
    topic: 'Science',
    myth: 'Water drains the opposite way in the Southern Hemisphere.',
    fact: 'The Coriolis effect is far too weak at the size of a sink or toilet. The basin’s shape and how the water entered decide the direction.',
  },
  {
    topic: 'History',
    myth: 'Napoleon was unusually short.',
    fact: 'He was about 1.69 m (5 ft 7 in), average for a Frenchman of his time. Confusion between French and English inches helped the myth.',
  },
  {
    topic: 'Nature',
    myth: 'Chameleons change colour to match their background.',
    fact: 'Colour change in chameleons is mainly for signalling and controlling body temperature, not camouflage.',
  },
];

const DAY_MS = 86_400_000;

/** Index of the fact for a given date. Same all day, changes at local midnight. */
export function factIndexFor(date = new Date(), count = FUN_FACTS.length) {
  const localDays = Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / DAY_MS);
  return ((localDays % count) + count) % count;
}

export const factOfTheDay = (date = new Date()) => FUN_FACTS[factIndexFor(date)];
