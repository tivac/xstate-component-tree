---
"xstate-component-tree": minor
---

Fixed issue where newly-created actors were immediately receiving the event that had been `.broadcast(...)`.

This was happening because the actors were being iterated in such a way that new actors added because of the event were also being iterated. This led to weird behaviors where events would seem to be duplicated.
