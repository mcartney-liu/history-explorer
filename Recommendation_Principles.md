# History Explorer - Recommendation Principles

Version: 1.0

Status: Active

---

# 1. Overview

Recommendation Principles defines the product principles behind historical exploration
recommendations. The purpose is not to design recommendation algorithms, but to
establish how History Explorer should recommend meaningful next explorations while
preserving curiosity, historical context, and user understanding.

Recommendation supports exploration rather than replacing user choice. A recommendation
is a suggestion that opens a door; it is not a destination the user is forced into. When a
user finishes one discovery, the system should offer directions that make the next step
feel natural, while leaving the decision to the user. Good recommendation widens the
journey; it never narrows the user's control over it.

---

# 2. Recommendation Philosophy

The recommendation experience rests on a few core beliefs.

- **Recommendations inspire exploration.** A good recommendation makes the user want to
  keep moving, by pointing to a connection worth seeing.

- **Recommendations expand understanding.** Recommendations should lead to relationships
  and contexts that deepen how the user sees history, not to isolated trivia.

- **Recommendations preserve curiosity.** The user's own curiosity stays in the driver's
  seat. Recommendations follow curiosity; they do not override it.

- **Recommendations never interrupt discovery.** A recommendation appears as a gentle
  option alongside exploration, never as a disruptive interruption of the current thought.

These beliefs extend the discovery loop from Discovery_Model.md and the movement model
from Navigation_Model.md into the moment where the system offers the next step.

---

# 3. Recommendation Sources

Recommendations may originate from several sources. These are product-level origins, not
implementation mechanisms.

- **Related entities.** Entities directly connected to the current topic through
  established relationships.

- **Historical relationships.** The specific connection types that bind two entities
  (such as influence, cause, participation, or location).

- **Timeline proximity.** Entities near the current topic in time, revealing what came
  before or after.

- **Geographic proximity.** Entities tied to the same or nearby places, revealing local
  historical context.

- **Civilization connections.** Entities linked through the rise, interaction, or
  succession of civilizations.

- **Cause and effect.** Entities that caused the current topic or were caused by it,
  forming a chain of influence.

- **Similar historical patterns.** Entities that echo the current topic in structure,
  outcome, or scale across different contexts.

These sources align with the exploration dimensions in Exploration_Strategy.md and the
navigation paths in Navigation_Model.md.

---

# 4. Recommendation Principles

Recommendations follow these product-level principles.

- **Context First.** A recommendation is shown inside the relationships that make it
  meaningful, so the user understands why it is offered.

- **Curiosity Before Popularity.** Recommendations follow the user's curiosity and the
  historical connection, not whatever is most viewed or most common.

- **Diversity.** Offer recommendations across different dimensions (time, place, people,
  civilizations, relationships) so the user is not trapped in one kind of next step.

- **Multiple Exploration Choices.** From any topic, present more than one reasonable
  direction, keeping the user in control of where to go.

- **No Dead Ends.** Every recommendation should lead to another meaningful exploration,
  never to a page that stops the journey.

- **User Control.** The user decides whether to follow a recommendation. The system
  suggests; it does not decide.

---

# 5. Recommendation Timing

Recommendations are most valuable at certain moments in the exploration flow.

- **Beginning exploration.** When the user first opens a topic, offer directions that
  help them enter the connected knowledge around it.

- **During exploration.** As the user moves between entities, surface related paths that
  keep the journey coherent.

- **After discovery.** When the user makes a discovery, suggest the next connection that
  builds on what they just understood.

- **After completing a path.** When one exploration thread ends, point to a new thread so
  exploration continues rather than stops.

The right timing keeps recommendations helpful without becoming noise. Recommendation
should arrive when the user is ready for a next step, not constantly.

---

# 6. Recommendation Experience

Recommendation behavior should feel like guidance, not control.

- **Gentle guidance.** Recommendations are offered softly, as options the user may take or
  ignore.

- **Multiple options.** Present a small set of distinct directions rather than a single
  forced path.

- **No forced navigation.** The user is never pushed into a recommendation; declining it
  is always a valid choice.

- **Transparent relationships.** Each recommendation shows the relationship that connects
  it to the current topic, so the suggestion is understandable rather than mysterious.

This experience matches the navigation principles in Navigation_Model.md and the
discovery principles in Discovery_Model.md.

---

# 7. Future Expansion

Future versions of History Explorer may build on these recommendation principles. These
are possibilities, not commitments, and no implementation is described.

- **AI-assisted recommendation.** Helping the user notice connections they might miss,
  while keeping the principles above.

- **Personalized recommendation.** Adapting recommendations to what the user has already
  explored.

- **Collaborative recommendation.** Letting users share and build on each other's
  recommended paths.

- **Knowledge Graph recommendation.** Surfacing next steps as a navigable graph of
  connected entities.

- **Cross-civilization recommendation.** Recommending links that span different
  civilizations and cultures.

---

# 8. Related Documents

- Exploration_Path.md
- Exploration_Strategy.md
- Navigation_Model.md
- Discovery_Model.md
- Information_Architecture.md
- Product_Architecture.md
- PRD.md
