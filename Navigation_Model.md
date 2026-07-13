# History Explorer - Navigation Model

Version: 1.0

Status: Active

---

# 1. Overview

Navigation Model defines how users move through historical knowledge inside History
Explorer. It establishes the product-level navigation principles, the objects users
navigate between, the paths available between them, and the concept of exploration
state. This document becomes the foundation for future frontend navigation, knowledge
graph traversal, guidance, and exploration experience design.

History Explorer is not a traditional search engine or encyclopedia. A search engine
returns a ranked list and ends the experience; an encyclopedia returns a static article.
Neither lets the user move naturally from one piece of history to a connected one.

History Explorer needs a different model because its knowledge is connected, not flat.
Users should be able to start from a single topic and keep moving through related
events, people, civilizations, locations, time periods, and relationships. Navigation
is therefore the act of walking along the connections that already exist in history,
not the act of jumping to a search result.

---

# 2. Navigation Philosophy

The navigation experience rests on a few core beliefs.

- **Historical knowledge is a connected network.** Entities are nodes; relationships are
  edges. Navigation is movement along those edges.

- **Every entity can become an exploration entry point.** No entity is only a
  destination. Any event, person, civilization, location, or time period can be the
  starting point of a new navigation.

- **Relationships create navigation paths.** A path is only possible because two
  entities are related. The relationship is what makes the next step meaningful.

- **Exploration should maintain context.** As the user moves, they should still see where
  they came from and how the current entity relates to what they already explored.

These beliefs extend the exploration loop from Exploration_Path.md and the decision
principles from Exploration_Strategy.md into concrete movement between entities.

---

# 3. Navigation Objects

Users navigate between the following objects. Each plays a distinct role in movement.

- **Event.** A moment where history changes direction. Events are the most natural
  starting point and the most common connector between other entities.

- **Person.** A historical figure whose decisions and actions link events, civilizations,
  and locations. Persons carry intent into the network.

- **Civilization.** A society or culture that provides context and scale. Civilizations
  connect many people, events, and places across time.

- **Location.** A place that anchors history geographically. Locations connect entities
  that happened in or near the same space.

- **Time Period.** An era that groups entities by when they occurred. Time periods
  connect everything that lived or happened within the same span.

- **Relationship.** The connection itself. A relationship is not only the link between
  two objects; it is also a navigation object, because following a relationship reveals
  how two parts of history are bound together.

The first five objects are the historical entities defined in Information_Architecture.
The sixth, Relationship, is the dimension that makes movement between them possible.

---

# 4. Navigation Paths

Navigation can move in several directions. Each direction uses a different kind of
connection.

## Time Navigation

Moving through historical periods and chronological relationships.

Example:

Event → Earlier Event → Later Event

## Space Navigation

Moving through geographic relationships.

Example:

Location → Region → Civilization

## Entity Navigation

Moving between related historical entities.

Example:

Person → Event → Civilization

## Relationship Navigation

Exploring through historical connections.

Example:

Civilization → Influenced → Civilization

Time Navigation follows chronology. Space Navigation follows geography. Entity Navigation
follows direct entity connections. Relationship Navigation follows the specific kind of
connection (such as influence, cause, participation, or location) that links two
entities. Together these paths ensure that from any object, more than one direction is
available.

---

# 5. Exploration State

As the user navigates, the product should keep track of exploration state. State is what
preserves context while moving.

- **Current exploration node.** The entity the user is looking at right now.

- **Previous exploration path.** The sequence of nodes the user moved through to get
  here.

- **Visited entities.** The set of entities the user has already seen in this
  exploration session.

- **Available next exploration directions.** The connections leading out of the current
  node, from which the user can choose the next step.

Maintaining exploration state matters because it prevents disorientation. When the user
knows where they are, where they came from, and what they have already visited, they can
explore confidently without losing the thread of the story. State turns a sequence of
jumps into a coherent journey.

---

# 6. Navigation Principles

The navigation experience follows these design principles.

- **Avoid exploration dead ends.** No node should leave the user with nowhere to go.

- **Always provide meaningful next steps.** From every node, offer directions that lead
  to real historical understanding.

- **Keep historical context.** The user should always see how the current node connects
  to what came before.

- **Avoid overwhelming users.** Offer a manageable set of next steps, not an unbounded
  list.

- **Allow multiple exploration directions.** Do not force a single path; let curiosity
  choose.

These principles align with the exploration principles in Exploration_Strategy.md and
the product goals in Exploration_Path.md.

---

# 7. Future Expansion

Future versions of History Explorer may build on this navigation model. These are
possibilities, not commitments, and no implementation is described.

- **Knowledge Graph traversal.** Moving through history as a visible graph of connected
  entities.

- **AI Exploration Guide.** A guide that helps the user choose the next navigation step
  based on context and interest.

- **Personalized navigation.** Paths that adapt to what the user has already explored.

- **Exploration history.** A record of the user's navigation path that can be revisited
  and shared.

- **Intelligent path recommendation.** Surfacing the most relevant next directions from
  the available connections.

---

# 8. Related Documents

- Exploration_Path.md
- Exploration_Strategy.md
- Information_Architecture.md
- Product_Architecture.md
- User_Journey.md
- Technical_Architecture.md
- PRD.md
