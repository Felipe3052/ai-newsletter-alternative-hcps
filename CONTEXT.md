# HCP Newsletter Relevance

This context describes a proof of concept for replacing broad healthcare newsletters with relevance-filtered updates for healthcare professionals.

## Language

**HCP**:
A healthcare professional who receives relevance-filtered medical updates based on the patients they actively treat.
_Avoid_: Doctor, user, clinician

**Patient Panel**:
The set of patients actively treated by a specific **HCP**, represented only by clinical traits needed for relevance matching.
_Avoid_: Patient database, audience, cohort

**Source Patient Record**:
An identifiable patient representation before anonymization.
_Avoid_: Raw patient, original data, patient file

**Anonymized Patient Profile**:
A patient representation that keeps clinically relevant traits while removing direct identifiers.
_Avoid_: Patient record, anonymized data, fake patient

**HCP Relevance Profile**:
A compact summary of clinical traits derived from an **HCP**'s **Patient Panel** for relevance matching.
_Avoid_: Doctor profile, AI profile, user profile

**Newsletter**:
A complete medical communication evaluated as a single unit for relevance to an **HCP**.
_Avoid_: Newsletter item, article, email blast

**Relevance Summary**:
A short explanation of the clinically relevant part of a **Newsletter** for an **HCP**'s **Patient Panel**.
_Avoid_: AI summary, push text, notification copy

**Information Triage**:
Filtering and summarizing medical communications for relevance without giving clinical advice.
_Avoid_: Clinical advice, diagnosis support, treatment recommendation

**Relevance Engine**:
The product capability that evaluates **Newsletters** against **HCP Relevance Profiles**.
_Avoid_: Central instance, AI backend, matching server

**Relevance Decision**:
The AI-generated push-or-do-not-push judgment for a **Newsletter**, including the rationale and any **Relevance Summary** to send.
_Avoid_: AI decision, matching result, filter result

**Push-Worthy**:
Clinically actionable or practice-changing enough for an **HCP**'s **Patient Panel** to justify a push.
_Avoid_: Relevant, interesting, matched

**Matched Clinical Traits**:
The anonymized clinical traits in a **Patient Panel** that explain why a **Newsletter** is **Push-Worthy**.
_Avoid_: Matched patients, patient reasons, trigger patients

**Relevance Check**:
An evaluation of one **Newsletter** against one selected **HCP**'s **Patient Panel**.
_Avoid_: AI run, content check, matching pass

**HCP Inbox**:
The **HCP**'s app-facing collection of pushed **Relevance Summaries**.
_Avoid_: User app, mobile view, notification screen

## Relationships

- Each **HCP** has exactly one current **Patient Panel** in the proof of concept.
- A **Patient Panel** belongs to exactly one **HCP** in the proof of concept.
- A **Patient Panel** contains one or more **Anonymized Patient Profiles**.
- An **HCP Relevance Profile** is derived from one **Patient Panel**.
- The proof of concept includes multiple **HCPs** with distinct **Patient Panels**.
- A **Source Patient Record** becomes one **Anonymized Patient Profile** after anonymization.
- **Source Patient Records** do not participate in **Relevance Checks**.
- A **Newsletter** is evaluated as a whole against a selected **HCP**'s **HCP Relevance Profile**.
- The **Relevance Engine** performs **Relevance Checks**.
- A **Relevance Check** produces exactly one **Relevance Decision**.
- A **Newsletter** produces one **Relevance Decision** for each selected **HCP** being evaluated.
- **Relevance Decisions** and **Relevance Summaries** provide **Information Triage**, not clinical advice.
- A **Relevance Decision** is binary: **Push-Worthy** or not **Push-Worthy**.
- A **Push-Worthy** **Relevance Decision** includes one **Relevance Summary**.
- A **Push-Worthy** **Relevance Decision** may include **Matched Clinical Traits**.
- A **Relevance Summary** links back to its original **Newsletter**.
- An **HCP Inbox** contains only **Relevance Summaries** from **Push-Worthy** **Relevance Decisions**.

## Example dialogue

> **Dev:** "Do we match a newsletter to the hospital or to the **HCP**?"
> **Domain expert:** "To the individual **HCP**, using that HCP's **Patient Panel**."
> **Dev:** "What survives anonymization?"
> **Domain expert:** "Only clinical traits needed for relevance matching; the **Anonymized Patient Profile** drops direct identifiers."
> **Dev:** "Can relevance matching read the original patient data?"
> **Domain expert:** "No — matching uses **Anonymized Patient Profiles**, not **Source Patient Records**."
> **Dev:** "Does the AI receive every anonymized patient?"
> **Domain expert:** "No — it receives an **HCP Relevance Profile** derived from the **Patient Panel**."
> **Dev:** "Do we split the newsletter before matching?"
> **Domain expert:** "No — the **Newsletter** is evaluated as a whole, then only the relevant part may be summarized."
> **Dev:** "Should the HCP see which patient caused the match?"
> **Domain expert:** "No — the **Relevance Summary** explains relevance to the **Patient Panel**, not to a named patient."
> **Dev:** "Is the AI output just yes or no?"
> **Domain expert:** "No — the **Relevance Decision** includes whether to push, why, and the **Relevance Summary** that would be pushed."
> **Dev:** "Where do non-pushed newsletters appear?"
> **Domain expert:** "Not in the **HCP Inbox**; only push-worthy **Relevance Summaries** appear there."
> **Dev:** "Is topic overlap enough to push?"
> **Domain expert:** "No — a **Newsletter** is **Push-Worthy** only when it is clinically actionable or practice-changing for the **Patient Panel**."
> **Dev:** "Can we explain which patients caused a push?"
> **Domain expert:** "No — explain the **Matched Clinical Traits**, not individual patients."
> **Dev:** "Can the summary recommend a treatment change?"
> **Domain expert:** "No — the product provides **Information Triage**, not clinical advice."
> **Dev:** "Does the HCP lose the source newsletter?"
> **Domain expert:** "No — each **Relevance Summary** links back to the original **Newsletter**."
> **Dev:** "What is the central instance called?"
> **Domain expert:** "The **Relevance Engine** evaluates **Newsletters** against **HCP Relevance Profiles**."
> **Dev:** "Why show more than one HCP?"
> **Domain expert:** "So the same **Newsletter** can produce different **Relevance Decisions** for different **Patient Panels**."
> **Dev:** "Which kinds of HCPs should the proof of concept include?"
> **Domain expert:** "Use a medical oncologist, cardiologist, endocrinologist, rheumatologist, and oncology nurse specialist or clinical pharmacist so the **Patient Panels** differ clearly."
> **Dev:** "How many newsletters should the proof of concept show?"
> **Domain expert:** "Use a small set of **Newsletters** across several clinical areas, including at least one intentionally low-relevance example."
> **Dev:** "What happens when the presenter checks a newsletter?"
> **Domain expert:** "A **Relevance Check** evaluates that **Newsletter** against the selected **HCP**'s **Patient Panel**."

## Flagged ambiguities

- "user" and "doctor" were used informally; resolved: use **HCP** for the recipient of relevance-filtered updates.
- "doctor" is too narrow for the proof of concept; resolved: **HCP** may include physicians and other healthcare professionals.
- "patient information" was too broad; resolved: use **Source Patient Record** for identifiable data before anonymization.
- "anonymized data" was too broad; resolved: use **Anonymized Patient Profile** for the patient-level artifact after identifiers are removed.
- "anonymization" in the proof of concept means removing direct identifiers and using demo patient labels; it does not claim production-grade de-identification.
- "doctor profile" and "AI profile" were too vague; resolved: use **HCP Relevance Profile** for the compact matching input.
- "newsletter item" was proposed as the unit of matching; resolved: use **Newsletter** because one newsletter is evaluated as a whole.
- "AI summary" and "push text" were too vague; resolved: use **Relevance Summary** for the patient-safe output shown to the **HCP**.
- "AI decision" was too vague; resolved: use **Relevance Decision** for the push-or-do-not-push judgment plus rationale and payload.
- "relevant" was too weak as a push threshold; resolved: use **Push-Worthy** for clinically actionable or practice-changing relevance.
- "matched patients" would expose too much; resolved: use **Matched Clinical Traits** for anonymized explanation.
- "clinical advice" is outside the product boundary; resolved: use **Information Triage** for the intended role.
- "central instance" was vague and deployment-specific; resolved: use **Relevance Engine** for the matching capability.
- "AI run" and "check relevance" were too informal; resolved: use **Relevance Check** for evaluating one **Newsletter** against one selected **HCP**.
- "user app" and "mobile view" were too broad; resolved: use **HCP Inbox** for the app-facing collection of pushed **Relevance Summaries**.
- "one HCP" was initially used as the proof-of-concept default; resolved: the demo may include multiple **HCPs**, each with a distinct **Patient Panel**.
- "oncology only" was proposed as a narrow demo scope; resolved: the proof of concept should span multiple clinical areas.
