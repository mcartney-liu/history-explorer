import type { NavNode } from '../components/navigation'

// M5-A-4: First Exploration Guide starter mapping.
//
// Every entry below is GROUNDED in the REAL topic data under
// data/examples/*_example.json — the `id` / `target.id` values are copied
// verbatim from each entity's `global_id`, and `label` / `target.name` match
// the entity's `name` field. No fabricated ids: if a slug or entity is ever
// removed from the registry, resolveStarters falls back to DEFAULT_STARTERS
// (empty → the guide renders its intro copy only, no buttons), so the UI
// stays safe.
//
// StarterItem.target is a NavNode (see components/navigation.ts): for entities
// that is { type: 'entity', id: <global_id>, name: <entity name> }.

export interface StarterItem {
  id: string
  label: string
  description?: string
  target: NavNode
}

export const TOPIC_STARTERS: Record<string, StarterItem[]> = {
  roman_empire: [
    {
      id: 'roman_empire:person-augustus',
      label: 'Augustus',
      description: 'First Roman emperor, reigned from 27 BC.',
      target: { type: 'entity', id: 'roman_empire:person-augustus', name: 'Augustus' },
    },
    {
      id: 'roman_empire:civ-roman',
      label: 'Roman Civilization',
      description: 'A Mediterranean civilization that dominated the ancient world.',
      target: { type: 'entity', id: 'roman_empire:civ-roman', name: 'Roman Civilization' },
    },
    {
      id: 'roman_empire:religion-christianity',
      label: 'Christianity',
      description: 'The monotheistic faith that spread through the empire.',
      target: { type: 'entity', id: 'roman_empire:religion-christianity', name: 'Christianity' },
    },
  ],
  greek_philosophy: [
    {
      id: 'greek_philosophy:person-socrates',
      label: 'Socrates',
      description: 'Athenian philosopher who pioneered the elenchus and mentored Plato.',
      target: { type: 'entity', id: 'greek_philosophy:person-socrates', name: 'Socrates' },
    },
    {
      id: 'greek_philosophy:person-plato',
      label: 'Plato',
      description: 'Student of Socrates and author of the Theory of Forms; founded the Academy.',
      target: { type: 'entity', id: 'greek_philosophy:person-plato', name: 'Plato' },
    },
    {
      id: 'greek_philosophy:person-aristotle',
      label: 'Aristotle',
      description: 'Student of Plato who systematized logic and tutored Alexander the Great.',
      target: { type: 'entity', id: 'greek_philosophy:person-aristotle', name: 'Aristotle' },
    },
  ],
  persian_empire: [
    {
      id: 'persian_empire:person-cyrus',
      label: 'Cyrus the Great',
      description: 'Founder of the Achaemenid Empire, who conquered Media, Lydia, and Babylon.',
      target: { type: 'entity', id: 'persian_empire:person-cyrus', name: 'Cyrus the Great' },
    },
    {
      id: 'persian_empire:person-darius',
      label: 'Darius I',
      description: 'Third Achaemenid king who reorganized the empire and fought the Greeks at Marathon.',
      target: { type: 'entity', id: 'persian_empire:person-darius', name: 'Darius I' },
    },
    {
      id: 'persian_empire:religion-zoroastrianism',
      label: 'Zoroastrianism',
      description: 'The dualistic monotheistic faith of ancient Persia, founded by Zarathustra.',
      target: { type: 'entity', id: 'persian_empire:religion-zoroastrianism', name: 'Zoroastrianism' },
    },
  ],
  ancient_india: [
    {
      id: 'ancient_india:person-ashoka',
      label: 'Ashoka the Great',
      description: 'Mauryan emperor who, after the Kalinga War, embraced Buddhism and spread dhamma.',
      target: { type: 'entity', id: 'ancient_india:person-ashoka', name: 'Ashoka the Great' },
    },
    {
      id: 'ancient_india:religion-buddhism',
      label: 'Buddhism',
      description: 'The teaching of Siddhartha Gautama on the cessation of suffering, spread across Asia.',
      target: { type: 'entity', id: 'ancient_india:religion-buddhism', name: 'Buddhism' },
    },
    {
      id: 'ancient_india:civ-maurya',
      label: 'Maurya Empire',
      description: 'The first empire to unify most of the Indian subcontinent (c. 322-185 BC).',
      target: { type: 'entity', id: 'ancient_india:civ-maurya', name: 'Maurya Empire' },
    },
  ],
  hellenistic_world: [
    {
      id: 'hellenistic_world:person-alexander',
      label: 'Alexander the Great',
      description: 'King of Macedon who conquered the Persian Empire and Egypt, spreading Greek culture.',
      target: { type: 'entity', id: 'hellenistic_world:person-alexander', name: 'Alexander the Great' },
    },
    {
      id: 'hellenistic_world:person-cleopatra',
      label: 'Cleopatra VII',
      description: 'The last active ruler of Ptolemaic Egypt; her alliances with Rome ended with annexation by Augustus.',
      target: { type: 'entity', id: 'hellenistic_world:person-cleopatra', name: 'Cleopatra VII' },
    },
    {
      id: 'hellenistic_world:civ-ptolemaic-egypt',
      label: 'Ptolemaic Egypt',
      description: 'The Macedonian-Greek dynasty that ruled Egypt from Alexandria after Alexander.',
      target: { type: 'entity', id: 'hellenistic_world:civ-ptolemaic-egypt', name: 'Ptolemaic Egypt' },
    },
  ],
  silk_road: [
    {
      id: 'silk_road:person-zhang-qian',
      label: 'Zhang Qian',
      description: 'Han envoy whose westward missions opened trade contact between China and the Hellenistic west.',
      target: { type: 'entity', id: 'silk_road:person-zhang-qian', name: 'Zhang Qian' },
    },
    {
      id: 'silk_road:han_dynasty',
      label: 'Han Dynasty',
      description: 'The Chinese imperial dynasty that expanded westward and produced the silk and paper traded along the routes.',
      target: { type: 'entity', id: 'silk_road:han_dynasty', name: 'Han Dynasty' },
    },
    {
      id: 'silk_road:tech-paper',
      label: 'Papermaking',
      description: 'The Han-era technique for making paper from mulberry bark and rags, which spread west along the Silk Road.',
      target: { type: 'entity', id: 'silk_road:tech-paper', name: 'Papermaking' },
    },
  ],
  egypt_technology_religion: [
    {
      id: 'egypt_technology_religion:event-great-pyramid-built',
      label: 'Great Pyramid of Giza Built',
      description: 'The Great Pyramid was constructed during the Old Kingdom as a tomb for Pharaoh Khufu.',
      target: { type: 'entity', id: 'egypt_technology_religion:event-great-pyramid-built', name: 'Great Pyramid of Giza Built' },
    },
    {
      id: 'egypt_technology_religion:religion-ancient-egyptian',
      label: 'Ancient Egyptian Religion',
      description: 'A polytheistic belief system centered on gods, the afterlife, and temple ritual.',
      target: { type: 'entity', id: 'egypt_technology_religion:religion-ancient-egyptian', name: 'Ancient Egyptian Religion' },
    },
    {
      id: 'egypt_technology_religion:idea-monotheism',
      label: 'Monotheism',
      description: "The idea of a single god, first expressed in Egyptian pharaoh Akhenaten's worship of Aten.",
      target: { type: 'entity', id: 'egypt_technology_religion:idea-monotheism', name: 'Monotheism' },
    },
  ],
  early_christianity: [
    {
      id: 'early_christianity:person-jesus',
      label: 'Jesus of Nazareth',
      description: 'A Jewish teacher whose followers proclaimed him the Christ; central to Christianity.',
      target: { type: 'entity', id: 'early_christianity:person-jesus', name: 'Jesus of Nazareth' },
    },
    {
      id: 'early_christianity:person-paul',
      label: 'Paul the Apostle',
      description: 'Former persecutor who became the chief missionary carrying the faith to the Gentiles.',
      target: { type: 'entity', id: 'early_christianity:person-paul', name: 'Paul the Apostle' },
    },
    {
      id: 'early_christianity:religion-early-church',
      label: 'Early Christian Church',
      description: "The first communities of Jesus's followers, from Jerusalem to the Gentile world.",
      target: { type: 'entity', id: 'early_christianity:religion-early-church', name: 'Early Christian Church' },
    },
  ],
}

// Safety net for any topic slug without a curated mapping. Empty → the guide
// shows its intro copy but no starter buttons (graceful degradation).
export const DEFAULT_STARTERS: StarterItem[] = []

export function resolveStarters(slug: string): StarterItem[] {
  return TOPIC_STARTERS[slug] ?? DEFAULT_STARTERS
}

// ---------------------------------------------------------------------------
// M5-A-5: Entity-level First Exploration Guide starter mapping.
//
// Mirrors TOPIC_STARTERS but keyed by ENTITY global_id (the value App passes
// as `current.id` when a visitor opens an entity). Every target is GROUNDED in
// the real relationship graph under data/examples/*_example.json:
//  - Same-topic targets use their entity's real `global_id`
//    (source/target local ids resolve to `{topic}:{local_id}`).
//  - Cross-topic targets use the verbatim cross-topic `global_id` already
//    present in the relationships (e.g. `hellenistic_world:civ-greek`).
// No fabricated ids: resolveEntityStarters falls back to
// DEFAULT_ENTITY_STARTERS (empty → the guide renders intro copy only) when a
// visited entity has no curated mapping.
// ---------------------------------------------------------------------------

export const ENTITY_STARTERS: Record<string, StarterItem[]> = {
  'roman_empire:civ-roman': [
    {
      id: 'roman_empire:event-roman-empire-established',
      label: 'Roman Empire Established',
      description: 'How the empire began, in 27 BC.',
      target: { type: 'entity', id: 'roman_empire:event-roman-empire-established', name: 'Roman Empire Established' },
    },
    {
      id: 'roman_empire:loc-rome',
      label: 'Rome',
      description: 'The capital at the heart of the empire.',
      target: { type: 'entity', id: 'roman_empire:loc-rome', name: 'Rome' },
    },
    {
      id: 'hellenistic_world:civ-greek',
      label: 'Ancient Greek Civilization',
      description: 'The Greek world Rome inherited and conquered.',
      target: { type: 'entity', id: 'hellenistic_world:civ-greek', name: 'Ancient Greek Civilization' },
    },
  ],
  'hellenistic_world:person-alexander': [
    {
      id: 'hellenistic_world:event-gaugamela',
      label: 'Battle of Gaugamela',
      description: 'Alexander’s decisive victory over Persia.',
      target: { type: 'entity', id: 'hellenistic_world:event-gaugamela', name: 'Battle of Gaugamela' },
    },
    {
      id: 'hellenistic_world:civ-greek',
      label: 'Ancient Greek Civilization',
      description: 'The culture Alexander carried east.',
      target: { type: 'entity', id: 'hellenistic_world:civ-greek', name: 'Ancient Greek Civilization' },
    },
    {
      id: 'egypt_technology_religion:civ-egypt',
      label: 'Ancient Egyptian Civilization',
      description: 'Conquered by Alexander and ruled by his successors.',
      target: { type: 'entity', id: 'egypt_technology_religion:civ-egypt', name: 'Ancient Egyptian Civilization' },
    },
  ],
  'hellenistic_world:civ-greek': [
    {
      id: 'hellenistic_world:idea-stoicism',
      label: 'Stoicism',
      description: 'A Greek school of reason and virtue.',
      target: { type: 'entity', id: 'hellenistic_world:idea-stoicism', name: 'Stoicism' },
    },
    {
      id: 'hellenistic_world:idea-democracy',
      label: 'Democracy',
      description: 'The Greek idea of citizen rule.',
      target: { type: 'entity', id: 'hellenistic_world:idea-democracy', name: 'Democracy' },
    },
  ],
  'greek_philosophy:person-socrates': [
    {
      id: 'greek_philosophy:person-plato',
      label: 'Plato',
      description: 'Socrates’ student and the Academy’s founder.',
      target: { type: 'entity', id: 'greek_philosophy:person-plato', name: 'Plato' },
    },
    {
      id: 'greek_philosophy:loc-athens',
      label: 'Athens',
      description: 'The city where Socrates taught.',
      target: { type: 'entity', id: 'greek_philosophy:loc-athens', name: 'Athens' },
    },
    {
      id: 'hellenistic_world:idea-democracy',
      label: 'Democracy',
      description: 'A political idea born in the Greek city-states.',
      target: { type: 'entity', id: 'hellenistic_world:idea-democracy', name: 'Democracy' },
    },
  ],
  'greek_philosophy:person-plato': [
    {
      id: 'greek_philosophy:person-aristotle',
      label: 'Aristotle',
      description: 'Plato’s student who systematized logic.',
      target: { type: 'entity', id: 'greek_philosophy:person-aristotle', name: 'Aristotle' },
    },
    {
      id: 'greek_philosophy:event-academy-founded',
      label: "Plato's Academy Founded",
      description: 'Plato established the Academy in Athens.',
      target: { type: 'entity', id: 'greek_philosophy:event-academy-founded', name: "Plato's Academy Founded" },
    },
    {
      id: 'greek_philosophy:idea-theory-forms',
      label: 'Theory of Forms',
      description: 'Plato’s doctrine of perfect abstract Forms.',
      target: { type: 'entity', id: 'greek_philosophy:idea-theory-forms', name: 'Theory of Forms' },
    },
  ],
  'greek_philosophy:person-aristotle': [
    {
      id: 'hellenistic_world:person-alexander',
      label: 'Alexander the Great',
      description: 'Aristotle’s pupil and a future conqueror.',
      target: { type: 'entity', id: 'hellenistic_world:person-alexander', name: 'Alexander the Great' },
    },
    {
      id: 'greek_philosophy:idea-logic',
      label: 'Logic and Syllogism',
      description: 'Aristotle’s formal system of valid inference.',
      target: { type: 'entity', id: 'greek_philosophy:idea-logic', name: 'Logic and Syllogism' },
    },
    {
      id: 'greek_philosophy:loc-lyceum',
      label: 'Lyceum',
      description: 'Aristotle’s Peripatetic school in Athens.',
      target: { type: 'entity', id: 'greek_philosophy:loc-lyceum', name: 'Lyceum' },
    },
  ],
  'persian_empire:civ-persian': [
    {
      id: 'persian_empire:religion-zoroastrianism',
      label: 'Zoroastrianism',
      description: 'The monotheistic faith of ancient Persia.',
      target: { type: 'entity', id: 'persian_empire:religion-zoroastrianism', name: 'Zoroastrianism' },
    },
    {
      id: 'hellenistic_world:person-alexander',
      label: 'Alexander the Great',
      description: 'Who conquered the Persian Empire.',
      target: { type: 'entity', id: 'hellenistic_world:person-alexander', name: 'Alexander the Great' },
    },
    {
      id: 'silk_road:silk_road',
      label: 'Silk Road',
      description: 'The routes that carried Persian goods east and west.',
      target: { type: 'entity', id: 'silk_road:silk_road', name: 'Silk Road' },
    },
  ],
  'egypt_technology_religion:civ-egypt': [
    {
      id: 'egypt_technology_religion:tech-papyrus',
      label: 'Papyrus Papermaking',
      description: 'Egypt’s writing material, spread across civilizations.',
      target: { type: 'entity', id: 'egypt_technology_religion:tech-papyrus', name: 'Papyrus Papermaking' },
    },
    {
      id: 'egypt_technology_religion:religion-ancient-egyptian',
      label: 'Ancient Egyptian Religion',
      description: 'The polytheistic faith of the Nile valley.',
      target: { type: 'entity', id: 'egypt_technology_religion:religion-ancient-egyptian', name: 'Ancient Egyptian Religion' },
    },
    {
      id: 'egypt_technology_religion:idea-monotheism',
      label: 'Monotheism',
      description: 'The idea of one god, first expressed in Egypt.',
      target: { type: 'entity', id: 'egypt_technology_religion:idea-monotheism', name: 'Monotheism' },
    },
  ],
  'egypt_technology_religion:tech-papyrus': [
    {
      id: 'egypt_technology_religion:religion-ancient-egyptian',
      label: 'Ancient Egyptian Religion',
      description: 'Papyrus sustained temple and administrative record-keeping.',
      target: { type: 'entity', id: 'egypt_technology_religion:religion-ancient-egyptian', name: 'Ancient Egyptian Religion' },
    },
    {
      id: 'hellenistic_world:civ-greek',
      label: 'Ancient Greek Civilization',
      description: 'Papyrus spread to the Greek world.',
      target: { type: 'entity', id: 'hellenistic_world:civ-greek', name: 'Ancient Greek Civilization' },
    },
    {
      id: 'roman_empire:civ-roman',
      label: 'Roman Civilization',
      description: 'Papyrus spread to Rome.',
      target: { type: 'entity', id: 'roman_empire:civ-roman', name: 'Roman Civilization' },
    },
  ],
  'ancient_india:civ-maurya': [
    {
      id: 'ancient_india:religion-buddhism',
      label: 'Buddhism',
      description: 'The faith that flourished under the Mauryas.',
      target: { type: 'entity', id: 'ancient_india:religion-buddhism', name: 'Buddhism' },
    },
    {
      id: 'ancient_india:loc-pataliputra',
      label: 'Pataliputra',
      description: 'The Mauryan capital.',
      target: { type: 'entity', id: 'ancient_india:loc-pataliputra', name: 'Pataliputra' },
    },
    {
      id: 'persian_empire:civ-persian',
      label: 'Achaemenid Persian Empire',
      description: 'A contemporary of the Mauryan world.',
      target: { type: 'entity', id: 'persian_empire:civ-persian', name: 'Achaemenid Persian Empire' },
    },
  ],
  'ancient_india:religion-buddhism': [
    {
      id: 'ancient_india:loc-pataliputra',
      label: 'Pataliputra',
      description: 'A center of the Buddhist world.',
      target: { type: 'entity', id: 'ancient_india:loc-pataliputra', name: 'Pataliputra' },
    },
    {
      id: 'silk_road:silk_road',
      label: 'Silk Road',
      description: 'The routes that carried Buddhism across Asia.',
      target: { type: 'entity', id: 'silk_road:silk_road', name: 'Silk Road' },
    },
    {
      id: 'silk_road:han_dynasty',
      label: 'Han Dynasty',
      description: 'A civilization that received Buddhism via the routes.',
      target: { type: 'entity', id: 'silk_road:han_dynasty', name: 'Han Dynasty' },
    },
  ],
  'early_christianity:person-jesus': [
    {
      id: 'early_christianity:event-crucifixion',
      label: 'Crucifixion of Jesus',
      description: 'The pivotal event of the faith.',
      target: { type: 'entity', id: 'early_christianity:event-crucifixion', name: 'Crucifixion of Jesus' },
    },
    {
      id: 'early_christianity:loc-jerusalem',
      label: 'Jerusalem',
      description: 'The city of Jesus’s ministry and death.',
      target: { type: 'entity', id: 'early_christianity:loc-jerusalem', name: 'Jerusalem' },
    },
    {
      id: 'roman_empire:religion-christianity',
      label: 'Christianity',
      description: 'The faith that took root in the Roman world.',
      target: { type: 'entity', id: 'roman_empire:religion-christianity', name: 'Christianity' },
    },
  ],
  'early_christianity:religion-early-church': [
    {
      id: 'early_christianity:loc-jerusalem',
      label: 'Jerusalem',
      description: 'Where the first church was born.',
      target: { type: 'entity', id: 'early_christianity:loc-jerusalem', name: 'Jerusalem' },
    },
    {
      id: 'roman_empire:religion-christianity',
      label: 'Christianity',
      description: 'The faith the early church carried forward.',
      target: { type: 'entity', id: 'roman_empire:religion-christianity', name: 'Christianity' },
    },
    {
      id: 'roman_empire:civ-roman',
      label: 'Roman Civilization',
      description: 'The empire into which the church spread.',
      target: { type: 'entity', id: 'roman_empire:civ-roman', name: 'Roman Civilization' },
    },
  ],
  'silk_road:silk_road': [
    {
      id: 'roman_empire:civ-roman',
      label: 'Roman Civilization',
      description: 'The Mediterranean terminus of the routes.',
      target: { type: 'entity', id: 'roman_empire:civ-roman', name: 'Roman Civilization' },
    },
  ],
}

// Safety net for any entity global_id without a curated mapping.
export const DEFAULT_ENTITY_STARTERS: StarterItem[] = []

export function resolveEntityStarters(globalId: string): StarterItem[] {
  return ENTITY_STARTERS[globalId] ?? DEFAULT_ENTITY_STARTERS
}
