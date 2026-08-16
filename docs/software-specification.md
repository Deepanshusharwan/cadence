# Timetable Planner & Consistency Tracker — Software Design Specification

> **Status:** Initial product/technical specification  
> **Purpose:** Define the software we are going to build to manage the learning timetable, planning, consistency, leave, and progress system.
>
> This document defines *what* the product does and is intentionally stack-agnostic. For the chosen client/backend stack, repo layout, auth, and the mobile sync model, see [`architecture.md`](architecture.md).

---

# 1. Product Overview

The application is a **planner + tracker** for a working computer-science student who wants to maintain a structured but flexible learning routine over the course of a year.

It is intentionally **not** a simple calendar and not merely a time tracker.

The application should answer three questions:

1. **What should I do now?**
2. **What did I actually do?**
3. **Am I still on track with the commitments I made?**

The central design philosophy is:

> **Fixed anchors + flexible content.**

The application should provide enough structure to prevent procrastination and decision paralysis while preserving enough flexibility for work, college, social plans, energy fluctuations, outings, and unexpected events.

---

# 2. Primary Goal

The user is working toward becoming sufficiently strong to move to a good product-based company within approximately one year.

The learning system therefore prioritizes:

1. University syllabus
2. System Design
3. DSA / Problem Solving
4. Development
5. Random Learning
6. Projects

University and System Design are intentionally given **equal priority**.

DSA is important but intentionally receives less time than the two core areas.

Development and Random Learning are flexible.

Projects are primarily a weekend activity.

---

# 3. Product Philosophy

## 3.1 Structure without rigidity

The application must not become a prison-like timetable.

Bad design:

> "You were supposed to study System Design at 7:00 PM, but you studied University instead. Failed."

Desired design:

> "You completed a two-hour core study block. Your University target is healthy and System Design needs more attention this week."

The application should care more about **weekly commitments and priorities** than exact adherence to every suggested subject.

---

## 3.2 Fixed anchors + flexible content

Some times are intentionally fixed:

- Work: 10 AM–6 PM
- DSA: 8–9 AM by default
- Evening study: 7 PM start
- Main evening blocks
- Weekly review

Other things remain flexible:

- Which core subject occupies a study block
- Development
- Random Learning
- Evening walks
- Social time
- Weekend activities
- Catch-up sessions

---

## 3.3 Weekly targets over daily perfection

The core commitments are weekly:

- University: 8h/week
- System Design: 8h/week
- DSA: 4h/week / 4 sessions

The user has a normal-day study target of approximately 4 hours, but the application should not treat exactly four hours as mandatory every day.

A strong day can exceed the target.

A weaker day can be compensated for by other days.

---

## 3.4 The system should optimize for sustainability

The application should optimize for:

> **Consistency over intensity.**

The goal is not to recreate historical 12–16-hour study days.

The goal is to create a system that can survive:

- A normal workday
- A bad day
- A busy week
- College
- Outings
- Social commitments
- Low motivation
- High motivation
- Unexpected work
- Weekend plans
- Occasional sleep disruption

and still maintain long-term progress.

---

# 4. Learning Categories

The application must support the following categories.

## 4.1 University

Formal university/NEP syllabus work.

Examples:

- Semester subjects
- Lectures
- Notes
- Assignments
- Exam preparation
- Reading
- Revision
- Practice

Weekly minimum:

> **8 hours**

Priority:

> **Tier 1**

---

## 4.2 System Design

Learning software/system architecture and design.

Examples:

- System design lectures
- Architecture exercises
- Distributed systems
- Databases
- Caching
- Messaging
- Scalability
- Reliability
- Design exercises

Weekly minimum:

> **8 hours**

Priority:

> **Tier 1**

---

## 4.3 DSA / Problem Solving

Interview-oriented problem solving.

Examples:

- LeetCode-style problems
- Algorithms
- Data structures
- Problem-solving exercises
- Complexity analysis

Weekly minimum:

> **4 hours / 4 sessions**

Default morning slot:

> **8:00–9:00 AM**

DSA is intentionally not required every day.

Once the weekly target is completed, the planner should stop forcing additional DSA sessions unless the user explicitly wants more.

Priority:

> **Tier 2**

---

## 4.4 Development

Career-oriented practical software-development learning.

The current frontend course belongs here.

Examples:

- Frontend
- React
- Next.js
- Backend
- Django
- APIs
- Docker
- Kubernetes
- Cloud
- Testing
- Frameworks
- Tooling

There is currently **no hard weekly minimum**.

Development is opportunistic and may happen:

- During weekday flexible time
- During evening blocks when core targets are healthy
- On weekends
- As part of project work

Priority:

> **Tier 3**

---

## 4.5 Random Learning

Curiosity-driven learning.

Examples:

- Raycasting
- Compilers
- Linux internals
- Bluetooth protocols
- Research papers
- Interesting algorithms
- New programming languages
- Open-source internals
- Technical rabbit holes

There is:

> **No minimum.**

Random Learning exists to preserve curiosity.

The user should not feel guilty for not doing it.

Priority:

> **Tier 4**

---

## 4.6 Projects

Projects are practical application/building work.

Examples:

- Building an app
- Building a backend
- Creating an open-source contribution
- Building a tool
- Experimenting with an architecture
- Implementing something learned during the week

Projects are primarily scheduled on weekends.

Target:

> Approximately 5–8 focused hours/week when possible.

There is no strict minimum because real-life weekends vary.

---

# 5. Priority Model

The planner should use the following priority order when resolving conflicts:

```text
University
     │
System Design
     │
DSA
     │
Development
     │
Random Learning
```

University and System Design are equal.

This means the scheduler should not systematically prioritize one over the other.

Projects have a special weekend priority and should generally receive the main Saturday project blocks.

---

# 6. Weekly Targets

The application must support configurable weekly targets.

Initial defaults:

```text
University       8h
System Design    8h
DSA              4h / 4 sessions
Development      no minimum
Random Learning  no minimum
Projects         no strict minimum
```

Targets should be stored as configuration rather than hardcoded.

Future versions may allow the user to change:

- Target hours
- Number of sessions
- Priority
- Preferred days
- Preferred time windows

---

# 7. Target Types

The system should support two different target models.

## 7.1 Hour-based target

Example:

> University → 8 hours/week

The system sums all completed sessions belonging to University.

---

## 7.2 Session-based target

Example:

> DSA → 4 sessions/week

A DSA session should count when it satisfies a configurable minimum duration.

Initial assumption:

> Approximately 45 minutes or more counts as a meaningful DSA session.

The exact threshold should be configurable.

---

# 8. Day Types

Every day can have one of four states:

```text
NORMAL
REDUCED
LEAVE
MISSED
```

These are important concepts in both the planner and tracker.

---

# 9. Normal Day

A Normal Day represents an ordinary day where the user has normal capacity.

Expected study:

> Approximately 4 focused hours.

The 4-hour figure is a guideline, not a rigid requirement.

A normal day can contain:

- DSA
- University
- System Design
- Development
- Random Learning
- Project work when appropriate

The weekly targets remain the authoritative measure.

---

# 10. Reduced Day

A Reduced Day means:

> The user still intends to do meaningful learning, but their capacity is lower than normal.

Expected study:

> Approximately 1–2 hours.

Examples:

- College commitment
- Important personal event
- Heavy workday
- Poor sleep
- Low energy
- Evening outing
- Travel preparation
- Other legitimate constraints

Reduced Day cost:

> **1 leave unit**

A Reduced Day is not a loophole for procrastination.

---

# 11. Full Leave Day

A Full Leave Day means:

> No academic/project obligation is expected.

Examples:

- Full-day outing
- Travel
- College taking the entire day
- Family event
- Deliberate rest
- Recovery day
- Social commitment

Full Leave cost:

> **2 leave units**

A planned leave should appear as:

> `PLANNED_LEAVE`

not as a failed day.

---

# 12. Missed Day

A Missed Day means the user failed to complete the planned work and did not intentionally declare leave.

It consumes:

> **0 leave units**

The purpose of tracking this separately is to distinguish:

> "I deliberately took a day off."

from:

> "I procrastinated and missed the plan."

The application must not automatically convert missed days into leave.

---

# 13. Leave System

## Monthly allowance

Initial allowance:

> **7 leave units/month**

Leave units are intentionally more granular than "days."

### Costs

```text
Normal day      0 units
Reduced day     1 unit
Full leave      2 units
Missed day      0 units
```

This means a month could contain:

- 3 full leave days = 6 units
- 1 reduced day = 1 unit

Total:

> 7 units

Or:

- 7 reduced days = 7 units

---

# 14. Leave Carry-Forward

Unused leave can carry forward for:

> **One additional month only.**

Example:

August:

```text
7 available
2 used
5 remaining
```

September:

```text
7 new
5 carried
12 available
```

Any balance older than one month expires.

The system should distinguish:

```text
current_month_units
carried_units
```

rather than treating all units as one undifferentiated balance.

---

# 15. Maximum Leave Balance

Maximum useful accumulated balance:

> **14 units**

This represents:

> Current month's 7 + previous month's 7.

The application should not allow indefinite accumulation.

---

# 16. Planned Leave

The user must be able to schedule leave in advance.

Example:

> Saturday → Full Leave

The planner should:

1. Mark the day as leave
2. Deduct 2 units
3. Remove normal study expectations
4. Recalculate remaining weekly targets
5. Redistribute only what is necessary
6. Avoid creating punishment sessions

---

# 17. Exceptional Leave

The user may occasionally exceed the available leave balance because real life happens.

The application should allow this.

Instead of blocking the user:

```text
Leave balance: -2 units
Status: Over budget
```

This should be recorded as data.

The application can later show:

> "You exceeded your planned leave this month."

It should not force the user to study when taking a day off is genuinely necessary.

---

# 18. Timetable Anchors

The standard weekday timetable is:

```text
06:00–08:00    Wake-up window
08:00–09:00    DSA
09:00–10:00    Breakfast / preparation / buffer
10:00–18:00    Work
18:00–19:00    Work → Study transition
19:00–21:00    Deep Study Block 1
21:00–21:30    Dinner / break
21:30–23:30    Deep Study Block 2
23:30+         Wind-down / flexible
```

The exact task within study blocks is dynamic.

---

# 19. Wake-up Window

Wake window:

> **6:00–8:00 AM**

The user prefers not to waste the morning.

The application should therefore encourage:

> Wake → routine → intentional activity

rather than:

> Wake → phone → doom-scroll → lose morning.

However, the system must not punish a late wake-up.

If the user wakes at 8 AM, the planner should shift DSA appropriately.

---

# 20. DSA Morning Anchor

Default:

> **8:00–9:00 AM**

This is a strong anchor because DSA is intentionally placed in the morning when the user is likely to have better cognitive freshness.

If the user wakes late:

Example:

```text
Wake: 8:00
DSA: 8:30–9:30
```

The planner should adjust the morning rather than mark the DSA session as an automatic failure.

---

# 21. Fixed Work Block

Work:

> **10:00 AM–6:00 PM**

This is a hard anchor.

The planner should treat this period as unavailable for ordinary learning.

Occasional work overruns should be represented as exceptions.

The system should not normalize work spilling into the evening.

---

# 22. Work → Study Transition

Default:

> **6:00–7:00 PM**

This is a transition buffer.

Possible activities:

- Walk
- Friends
- Dinner
- Shower
- Rest
- Personal tasks
- Decompression

The user does not need to use this entire hour for leisure.

The purpose is simply to avoid an abrupt:

> Work → Deep Study

transition.

---

# 23. Evening Study Block 1

Default:

> **7:00–9:00 PM**

Primary categories:

- University
- System Design

The planner should choose based on weekly progress.

Example:

```text
University: 6/8h
System Design: 3/8h
```

The next evening block should favor System Design.

---

# 24. Dinner / Break

Default:

> **9:00–9:30 PM**

This is a break between the two evening study blocks.

The application should allow the user to shift this if their actual routine requires it.

---

# 25. Evening Study Block 2

Default:

> **9:30–11:30 PM**

Primary categories:

- University
- System Design

Secondary options if core targets are healthy:

- Development
- DSA catch-up
- Project-related learning
- Random Learning

---

# 26. Late Night

After 11:30 PM, the user can:

- Relax
- Continue a task
- Learn something
- Work on a project
- Spend time socially
- Wind down

However, the planner should recognize sleep impact.

The user prefers working at night, so the system should not force an overly early bedtime.

---

# 27. Sleep Model

Target sleep:

> **12:00–1:00 AM**

Flexible:

> **12:00–3:00 AM**

Latest normal bedtime:

> **3:00 AM**

Wake window:

> **6:00–8:00 AM**

Important:

The planner should avoid recommending:

> Sleep at 3 AM → wake at 6 AM → DSA at 8 AM

as if this were normal.

Sleep should be treated as a capacity input.

If the previous night's sleep was short, the planner may:

- Shift DSA later
- Suggest a reduced day
- Reduce evening workload
- Preserve important weekly targets while avoiding an unrealistic schedule

---

# 28. Weekend Planner

## Saturday

Primary purpose:

> **Projects**

Default structure:

```text
07:00–08:00    Wake + routine
08:00–09:00    DSA if needed
09:00–10:00    Breakfast
10:00–13:00    Project Deep Work
13:00–14:00    Lunch
14:00–16:00    Project / Development
16:00–19:00    Free / friends / outing
19:00–20:00    Dinner
20:00–22:00    Optional project / development / random learning
22:00+         Free
```

Target:

> ~4–6 focused hours.

---

# 29. Sunday Planner

Primary purpose:

> **Projects + catch-up + weekly reset**

Default structure:

```text
07:00–08:00    Wake + routine
08:00–09:00    DSA if needed
09:00–10:00    Breakfast
10:00–12:00    Project
12:00–13:00    Lunch
13:00–15:00    Free
15:00–17:00    Core catch-up / Development
17:00–19:00    Friends / walk / free
19:00–20:00    Dinner
20:00–21:00    Weekly review + next-week planning
21:00+         Wind-down
```

---

# 30. DSA Weekend Rule

DSA is a:

> **4 sessions/week**

commitment.

It does not need to happen every weekend.

The planner should check:

```text
if dsa_sessions_completed >= 4:
    do_not_schedule_dsa
else:
    schedule_remaining_sessions
```

This prevents DSA from unnecessarily consuming weekend time.

---

# 31. Weekend Modes

The planner should support:

```text
NORMAL_WEEKEND
BUSY_WEEKEND
FULL_LEAVE_WEEKEND
```

## Normal

Use the normal project schedule.

## Busy

Prioritize:

1. Core targets at risk
2. Project progress
3. Other flexible activities

Do not attempt to force the full normal weekend schedule.

## Full Leave

No academic/project obligation.

Leave units may be consumed.

---

# 32. Planner Architecture

The planner should be based on **constraints and priorities**, not a fixed hardcoded calendar.

Conceptually:

```text
User Configuration
       │
       ├── Work schedule
       ├── Wake/sleep preferences
       ├── Weekly targets
       ├── Priorities
       ├── Leave balance
       ├── Planned events
       └── Preferences
               │
               ▼
        Availability Model
               │
               ▼
        Weekly Progress
               │
               ▼
       Priority Calculation
               │
               ▼
       Schedule Generation
               │
               ▼
        Suggested Timetable
```

---

# 33. Planner Inputs

The planner should consider:

## Fixed commitments

- Work
- College
- Appointments
- Planned events

## User preferences

- Morning DSA
- Evening study
- Preferred study duration
- Preferred break duration
- Sleep window

## Weekly requirements

- University target
- System Design target
- DSA target

## Current progress

- Completed hours
- Remaining hours
- Remaining sessions

## Leave

- Current leave balance
- Planned leave
- Reduced days

## Capacity

- Sleep
- Work overruns
- Day type
- Remaining available time

---

# 34. Schedule Generation Principles

The scheduler should:

1. Place fixed commitments first.
2. Reserve DSA's preferred morning slot.
3. Reserve evening core-study blocks.
4. Calculate remaining weekly requirements.
5. Identify categories falling behind.
6. Allocate future blocks to those categories.
7. Use lower-priority categories only when capacity exists.
8. Preserve transition and free-time buffers.
9. Avoid overloading days.
10. Respect planned leave.
11. Allow user overrides.

---

# 35. Fixed vs Flexible Scheduling

The scheduler should distinguish between:

### Hard blocks

Cannot normally be moved:

- Work
- Planned college events
- Planned leave
- Certain external appointments

### Soft anchors

Strong recommendations but movable:

- DSA 8–9 AM
- Evening study 7 PM
- Sunday weekly review

### Flexible blocks

Can be moved freely:

- Development
- Random Learning
- Project work
- Catch-up
- Extra study

This distinction should exist in the data model.

---

# 36. Swapping

The user should be able to swap the content of two compatible study blocks.

Example:

Planner:

```text
19:00–21:00 University
21:30–23:30 System Design
```

User changes:

```text
19:00–21:00 System Design
21:30–23:30 University
```

The application should accept this without treating it as non-compliance.

The weekly target engine remains the source of truth.

---

# 37. Adaptive Scheduling

The planner should recalculate suggestions throughout the week.

Example:

```text
Monday:
University 2h
System Design 1h
DSA 1h

Tuesday:
University 2h
System Design 2h
DSA 1h

Wednesday:
University 2h
System Design 0h
DSA 1h
```

At this point:

```text
University = 6h / 8h
System Design = 3h / 8h
DSA = 3h / 4h
```

System Design becomes the clear priority for remaining core study blocks.

The planner should not continue blindly allocating equal time.

---

# 38. Capacity Calculation

The scheduler should calculate available study capacity.

Conceptually:

```text
available_time
    =
    total_available_time
    - work
    - fixed_commitments
    - transition_buffers
    - meals
    - planned_leave
    - required sleep
```

This does not mean every available minute should be filled.

A reserve should remain for flexibility.

---

# 39. Capacity Bands

The system can classify the day as:

```text
HIGH_CAPACITY
NORMAL_CAPACITY
LOW_CAPACITY
```

Possible factors:

- Sleep duration
- Work duration
- Day type
- Planned events
- User-entered energy
- Recent workload

### High capacity

Can schedule additional Development, Random Learning, or project work.

### Normal capacity

Schedule normal core workload.

### Low capacity

Prioritize only the most important work.

May suggest a Reduced Day.

---

# 40. User Override

The user must always be able to override the planner.

Actions:

- Move session
- Swap subjects
- Delete session
- Add session
- Mark leave
- Change day type
- Extend session
- Shorten session
- Convert session to another category

The planner should adapt after the override.

---

# 41. Tracker

Every actual study/work session should be recorded.

Minimum fields:

```text
id
category
start_time
end_time
duration
date
source
```

Optional:

```text
title
description
notes
energy
difficulty
tags
project_id
course_id
```

---

# 42. Planned vs Actual

The system should distinguish:

```text
PLANNED SESSION
ACTUAL SESSION
```

This enables comparison.

Example:

```text
Planned:
19:00–21:00 System Design

Actual:
19:30–21:15 System Design
```

The application should recognize:

> 1h45m completed

rather than treating the session as failed.

---

# 43. Session Logging

The user should be able to start a timer:

> **Start Session**

Select:

- Category
- Task
- Optional project/course

The app records the start time.

When finished:

> **Stop Session**

The duration is recorded.

Manual logging should also be supported.

Example:

> "I studied System Design for 90 minutes earlier."

---

# 44. Timer

The app should include a timer for study sessions.

The timer should support:

- Start
- Pause
- Resume
- Stop
- Cancel
- Manual adjustment

Optional future modes:

- Pomodoro
- 50/10
- 90-minute deep work
- Custom timer

The initial implementation does not need to force Pomodoro.

The primary goal is accurate session tracking.

---

# 45. Daily Dashboard

The main screen should answer:

> "What should I be doing today?"

Suggested layout:

```text
TODAY

Day Type: NORMAL
Leave Balance: 7 units

Morning
08:00–09:00  DSA

Work
10:00–18:00  WORK

Evening
19:00–21:00  System Design
21:30–23:30  University

Progress
University       4.5 / 8h
System Design    3.0 / 8h
DSA              3 / 4 sessions
```

---

# 46. Current Session

The application should prominently show the current or next planned activity.

Example:

```text
NEXT

System Design
19:00–21:00

[ Start Session ]
```

If the user is already late:

```text
System Design
Planned: 19:00
Current: 19:22

[ Start Now ]
```

The app should not shame the user.

---

# 47. Weekly Dashboard

The weekly view should be the primary progress dashboard.

Example:

```text
THIS WEEK

University
████████░░  6.5 / 8h

System Design
██████░░░░  5.0 / 8h

DSA
██████████  4 / 4 sessions

Development
2h

Random Learning
1h

Projects
5h
```

It should also show:

- Active days
- Reduced days
- Leave days
- Missed days
- Total focused learning time
- Remaining weekly targets

---

# 48. Monthly Dashboard

Monthly information should include:

- Total learning time
- University hours
- System Design hours
- DSA sessions
- Development time
- Random Learning time
- Project time
- Normal days
- Reduced days
- Leave units used
- Leave units carried
- Missed days
- Consistency percentage

---

# 49. Consistency Metric

Do not use a traditional streak as the primary metric.

Instead:

```text
active_days_completed / active_days
```

Planned leave is excluded from active days.

Example:

```text
24 completed
3 planned leave
3 missed

Consistency:
24 / 27 = 88.9%
```

The app may display this as:

> **89% consistency**

---

# 50. Commitment Adherence

The application should separately measure whether the core weekly targets were met.

Example:

```text
University       9 / 8h       ✓
System Design    7 / 8h       !
DSA              4 / 4        ✓
```

Summary:

> **2/3 core commitments met**

This is more informative than total hours alone.

---

# 51. Avoid a Single Productivity Score

Do not create a meaningless:

> Productivity Score: 73/100

as the primary metric.

Instead show independent metrics:

- Consistency
- Core target adherence
- Total focused time
- Leave usage
- Project time
- Development time

The user should be able to understand exactly why a metric changed.

---

# 52. Weekly Review

The weekly review should be a first-class feature.

It should summarize:

## Progress

- University
- System Design
- DSA
- Development
- Random Learning
- Projects

## Behaviour

- Normal days
- Reduced days
- Leave
- Missed days
- Sleep pattern if tracked

## Reflection

Prompt:

> What went well?

> What got in the way?

> Which category fell behind?

> Was the schedule too aggressive?

> Did work interfere?

> What should change next week?

---

# 53. No Punishment Backlog

This is a core rule.

If a user misses 2 hours:

The application must not automatically create:

> "You owe 2 hours tomorrow."

Instead:

```text
Remaining target
+
Remaining available blocks
+
Priority
=
new schedule
```

The application absorbs small deviations through the week.

---

# 54. Leave and Consistency Interaction

Planned leave should not reduce the user's consistency score.

Example:

```text
Monday    completed
Tuesday   completed
Wednesday planned leave
Thursday  completed
Friday    completed
```

This should be considered:

> 4/4 active days completed

not:

> 4/5 days

---

# 55. App Notifications

Notifications should be useful and minimal.

Potential notifications:

### Morning

> "DSA block starts at 8:00 AM."

### Work shutdown

> "Work block ends in 15 minutes."

### Evening

> "System Design is your highest-priority target tonight."

### Weekly

> "You're 2 hours behind on System Design this week."

### Leave

> "You have 3 leave units remaining this month."

Notifications should not become constant nagging.

---

# 56. Notification Philosophy

Avoid:

> "You failed to complete your 7 PM task."

Prefer:

> "Your System Design target is currently 2h behind. You have an available study block tonight."

The application should be a **coach**, not a punishment system.

---

# 57. Calendar / Event Handling

The system should support external events such as:

- College
- Outings
- Appointments
- Travel
- Family events

Events should have:

```text
start
end
type
title
impact
```

The planner should treat these as unavailable time.

---

# 58. College Days

College attendance is usually rare but may consume an entire day or multiple days.

The user should be able to enter:

> College: 9 AM–5 PM

The planner can automatically recommend:

> Reduced Day

or:

> Full Leave

depending on the event duration and user choice.

The user remains in control.

---

# 59. Social / Personal Time

The application should not force leisure every day.

The user explicitly prefers:

> 1–2 hours of evening personal time when desired, but it can be skipped.

Therefore, social/leisure time is represented as:

> **Flexible availability / optional event**

rather than a mandatory daily block.

The 6–7 PM transition period is available for this purpose.

---

# 60. Data Model — Core Entities

The initial database should likely contain entities similar to:

```text
User
Category
WeeklyTarget
ScheduleBlock
StudySession
DayPlan
DayStatus
LeaveTransaction
Event
WeeklyReview
Project
Task
Settings
```

---

# 61. User

Stores user-level configuration.

Potential fields:

```text
id
name
timezone
wake_window_start
wake_window_end
target_sleep_start
target_sleep_end
latest_normal_bedtime
work_start
work_end
```

---

# 62. Category

Represents learning categories.

Example:

```text
id
name
priority
tracking_mode
active
```

Example categories:

```text
university
system_design
dsa
development
random_learning
projects
```

---

# 63. WeeklyTarget

Represents a user's commitment.

Fields:

```text
id
category_id
week_start
target_hours
target_sessions
minimum_required
```

For example:

```text
University
target_hours = 8

System Design
target_hours = 8

DSA
target_hours = 4
target_sessions = 4
```

---

# 64. ScheduleBlock

Represents what the planner recommends.

Fields:

```text
id
date
start_time
end_time
category_id
type
priority
status
source
```

Possible types:

```text
FIXED
ANCHOR
FLEXIBLE
BUFFER
WORK
LEAVE
```

Possible statuses:

```text
PLANNED
STARTED
COMPLETED
PARTIAL
SKIPPED
CANCELLED
```

---

# 65. StudySession

Represents what actually happened.

Fields:

```text
id
date
category_id
start_time
end_time
duration
schedule_block_id
title
notes
```

This is the source of truth for actual learning time.

---

# 66. DayPlan

Represents the day's overall plan.

Fields:

```text
id
date
day_type
planned_hours
completed_hours
capacity
notes
```

Day types:

```text
NORMAL
REDUCED
LEAVE
MISSED
```

---

# 67. LeaveTransaction

Leave should be represented as transactions rather than simply mutating a balance.

Fields:

```text
id
date
amount
type
reason
source_month
expires_at
```

Types could include:

```text
ALLOCATED
USED
CARRIED
EXPIRED
ADJUSTMENT
```

This makes the balance auditable.

---

# 68. Event

External commitments.

Fields:

```text
id
title
start_time
end_time
type
impact
notes
```

Types:

```text
COLLEGE
SOCIAL
PERSONAL
TRAVEL
OTHER
```

---

# 69. WeeklyReview

Fields:

```text
id
week_start
week_end
summary
wins
problems
next_week_changes
```

Potential metrics can be stored or computed.

---

# 70. Project

Projects are separate from generic study sessions.

Fields:

```text
id
name
description
status
priority
target
```

Possible status:

```text
PLANNED
ACTIVE
PAUSED
COMPLETED
ARCHIVED
```

---

# 71. Task

Optional project/course task.

Fields:

```text
id
project_id
title
description
status
estimated_duration
priority
```

This allows the planner to eventually schedule:

> "Implement authentication"

instead of simply:

> "Project work"

---

# 72. Settings

Configuration should not be hardcoded.

Potential settings:

```text
work_start
work_end
wake_window
sleep_window
dsa_preferred_start
dsa_duration
evening_study_start
study_block_duration
break_duration
leave_monthly_units
leave_carry_months
```

---

# 73. Planner Algorithm — Initial Version

A first implementation does not need AI.

A deterministic rules engine is preferable.

Pseudo-process:

```text
1. Load user settings.
2. Load current week's targets.
3. Load completed sessions.
4. Calculate remaining target for each category.
5. Load fixed events.
6. Load leave/reduced days.
7. Calculate available time.
8. Reserve hard blocks.
9. Reserve preferred anchors.
10. Calculate remaining flexible blocks.
11. Rank categories by priority + deficit.
12. Fill available blocks.
13. Preserve buffers.
14. Leave optional capacity unfilled.
15. Generate suggestions.
```

---

# 74. Deficit Calculation

For each category:

```text
deficit =
    weekly_target
    - completed_hours
```

Clamp at zero for scheduling purposes:

```text
effective_deficit = max(deficit, 0)
```

The planner should use deficit alongside priority.

A category that is both:

> high priority + behind target

should receive more attention.

---

# 75. Priority Score

A possible initial scoring model:

```text
score =
    base_priority
    × deficit_factor
    × urgency_factor
    × availability_factor
```

The exact formula can be tuned after observing real behaviour.

Do not over-engineer the first version.

---

# 76. Scheduling Order

Suggested scheduling order:

```text
1. Hard fixed events
2. Work
3. Planned leave
4. DSA morning anchor
5. Evening core blocks
6. Remaining core deficit
7. Project blocks on weekends
8. Development
9. Random Learning
10. Optional capacity
```

---

# 77. Avoid Over-Scheduling

The planner should not fill every available minute.

Example:

Available:

```text
18:00–23:30
```

Do not automatically schedule:

```text
18:00–18:30 study
18:30–19:00 study
19:00–21:00 study
21:00–21:30 study
21:30–23:30 study
```

Instead preserve:

- Transition
- Meals
- Breaks
- Free time
- Flexibility

The schedule should have breathing room.

---

# 78. Recovery / Reduced-Day Logic

If the user marks a day Reduced:

1. Charge 1 leave unit.
2. Reduce study expectation.
3. Preserve the highest-priority remaining work.
4. Recalculate the week's remaining targets.
5. Redistribute only necessary work.
6. Do not create an automatic punishment session.

---

# 79. Full Leave Logic

If the user marks Full Leave:

1. Charge 2 leave units.
2. Cancel/remove normal study blocks.
3. Keep external events.
4. Recalculate remaining weekly targets.
5. Redistribute only if required.
6. Do not mark the day as failed.

---

# 80. User Override vs Planner

The user's explicit decision should always take precedence over generated suggestions.

Hierarchy:

```text
User decision
      ↓
Fixed external commitments
      ↓
Planner rules
      ↓
Default suggestions
```

The application should never silently undo a user decision.

---

# 81. Weekly Planning Flow

At the start of the week:

```text
1. Load previous week.
2. Determine unfinished targets.
3. Generate new weekly targets.
4. Add known events.
5. Apply leave.
6. Generate initial timetable.
7. Show weekly overview.
8. Allow user edits.
9. Save approved plan.
```

---

# 82. Daily Planning Flow

Each morning:

```text
1. Check sleep / wake time if available.
2. Check today's day type.
3. Check fixed events.
4. Check weekly deficits.
5. Adjust today's suggested blocks.
6. Show DSA and next study block.
```

---

# 83. End-of-Day Flow

At the end of the day:

```text
1. Aggregate actual sessions.
2. Compare planned vs actual.
3. Determine day completion.
4. Update weekly progress.
5. Update consistency.
6. Identify deficits.
7. Prepare next-day suggestions.
```

---

# 84. Weekly Reset

Sunday review:

```text
1. Close current week.
2. Calculate target adherence.
3. Calculate consistency.
4. Calculate leave usage.
5. Record weekly review.
6. Create next week's targets.
7. Generate initial schedule.
```

---

# 85. Development Course Support

Development content should eventually support:

```text
Course
    ├── Module
    │    ├── Lecture
    │    ├── Lecture
    │    └── Exercise
```

For example:

```text
Frontend Course
    ├── HTML
    ├── CSS
    ├── JavaScript
    └── React
```

The user should be able to mark progress without turning every lecture into a separate mandatory schedule item.

---

# 86. Course Progress vs Time Tracking

Course completion and time spent are different metrics.

Example:

```text
Development:
2h 30m this week

Frontend Course:
12 / 40 lectures
```

Both should be visible.

Time tracking answers:

> "How much time did I invest?"

Course progress answers:

> "How much of the course did I complete?"

---

# 87. Project Tracking

Projects should support:

- Project description
- Goals
- Tasks
- Progress
- Sessions
- Notes
- Status

Example:

```text
Project:
Timetable Planner

Tasks:
[x] Define timetable
[x] Define leave system
[x] Design planner
[ ] Implement timer
[ ] Implement weekly dashboard
```

---

# 88. Project Time and Learning Time

Project sessions should be tracked independently.

A project session can optionally have a learning category.

Example:

> Building React dashboard

could count as:

```text
Project time
+
Development-related activity
```

The initial implementation should avoid double-counting hours unless explicitly configured.

A session should have one primary category, with optional tags.

---

# 89. Tags

Tags can provide additional context without creating dozens of categories.

Examples:

```text
react
backend
university
exam
distributed-systems
leetcode
project
course
```

Categories should remain broad.

Tags should remain flexible.

---

# 90. Search and History

The user should eventually be able to search:

> "Show me all System Design sessions."

or:

> "How much time did I spend on React last month?"

or:

> "What did I study last Tuesday?"

This makes the application useful as a personal learning journal.

---

# 91. Analytics

Useful analytics:

## Weekly

- Hours by category
- Target adherence
- Number of sessions
- Active days
- Leave usage

## Monthly

- Total hours
- Category trends
- Consistency trend
- Leave trend
- Project progress

## Long-term

- University hours
- System Design hours
- DSA sessions
- Projects completed
- Development hours
- Consistency over months

---

# 92. Trends

The application should be able to detect patterns such as:

> "System Design has been below target for three consecutive weeks."

or:

> "You complete more DSA sessions when scheduled in the morning."

or:

> "Fridays have a high missed-day rate."

These insights should initially be descriptive rather than overly prescriptive.

---

# 93. Anti-Guilt Design

The application should avoid language like:

- Failed
- Lazy
- Bad
- You wasted today
- You broke your streak

Prefer:

- Missed
- Behind target
- Reduced capacity
- Planned leave
- Remaining
- On track
- Needs attention

The app is intended to help maintain behaviour, not generate anxiety.

---

# 94. Mobile/Desktop UX

The application should prioritize fast interaction.

Common actions should take seconds:

```text
Start session
Stop session
Mark leave
Mark reduced day
Swap block
Add event
View progress
```

The user should not need to navigate through multiple screens to start a timer.

---

# 95. Main Screens

A reasonable initial application could have:

```text
1. Today
2. Week
3. Timer
4. Progress
5. Projects
6. Leave
7. Review
8. Settings
```

---

# 96. Today Screen

Primary screen.

Should show:

- Day type
- Current time
- Current/next block
- Start timer button
- Today's planned sessions
- Weekly progress
- Leave balance

---

# 97. Week Screen

Shows:

- Monday–Sunday
- Planned blocks
- Actual sessions
- Events
- Leave
- Weekly targets

The user should be able to drag/reorder flexible blocks in a future version.

---

# 98. Timer Screen

Minimal interface:

```text
System Design

00:42:17

[ Pause ]
[ Stop ]
```

Before starting:

```text
Category: System Design
Task: URL Shortener
Project: Optional

[ Start ]
```

---

# 99. Progress Screen

Shows:

```text
This Week
This Month
Long Term
```

with:

- Category progress
- Target adherence
- Consistency
- Hours
- Sessions

---

# 100. Leave Screen

Shows:

```text
Leave Balance

Current month: 7 units
Carried: 3 units
Total available: 10 units

Used: 2 units

Expiring:
3 carried units expire at month end
```

Actions:

```text
[ Plan Leave ]
[ Mark Reduced Day ]
```

---

# 101. Settings Screen

Settings should include:

### Schedule

- Work start/end
- Wake window
- Sleep target
- Latest bedtime
- DSA preferred time
- Evening study start

### Targets

- University
- System Design
- DSA

### Leave

- Monthly allowance
- Carry-forward duration

### Notifications

- Morning DSA
- Work shutdown
- Study start
- Weekly review

---

# 102. Data Integrity

The application should preserve an audit trail for important changes.

Examples:

- Leave used
- Leave expired
- Target changed
- Session edited
- Schedule block overridden

This is particularly important for leave balances.

---

# 103. Timezone

All times should be timezone-aware.

The application should store timestamps consistently and display them in the user's configured timezone.

The timetable is based on local time.

---

# 104. Date Boundaries

Weekly calculations should use a configurable week start.

Default:

> **Monday**

Week:

```text
Monday 00:00 → Sunday 23:59
```

The weekly review occurs Sunday evening.

---

# 105. Important Technical Principle

The application should separate:

```text
PLAN
```

from:

```text
ACTUAL
```

A schedule is a recommendation.

A study session is what actually happened.

Never overwrite the actual history simply because the plan changed.

This allows useful analysis of:

> Planned vs actual behaviour.

---

# 106. Suggested Architecture

> This section is the original stack-agnostic sketch. See [`architecture.md`](architecture.md) for the actual chosen architecture (Next.js web, native Swift/Kotlin mobile, Python/FastAPI backend, Clerk auth, Postgres) — the engines below map onto the backend only, since the mobile clients don't share code with it.

A clean initial architecture:

```text
                ┌─────────────────────┐
                │      Frontend       │
                │                     │
                │ Today / Week /      │
                │ Timer / Progress    │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │       API           │
                │                     │
                │ Auth / Sessions /   │
                │ Plans / Leave       │
                └──────────┬──────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ Planner   │ │ Analytics │ │ Leave     │
       │ Engine    │ │ Engine    │ │ Engine    │
       └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    ┌──────────────┐
                    │   Database   │
                    └──────────────┘
```

---

# 107. Planner Engine

The planner should initially be a deterministic service/module.

Responsibilities:

- Calculate remaining targets
- Determine deficits
- Find available blocks
- Respect fixed events
- Apply priorities
- Generate suggested schedule
- Recalculate after changes

Do not introduce an LLM into the core scheduling algorithm initially.

The rules are explicit and should remain predictable.

---

# 108. Analytics Engine

Responsibilities:

- Aggregate study sessions
- Calculate weekly progress
- Calculate monthly progress
- Calculate consistency
- Calculate target adherence
- Produce trends

Analytics should derive from actual sessions rather than planned blocks.

---

# 109. Leave Engine

Responsibilities:

- Allocate monthly units
- Track carry-forward
- Track expiry
- Deduct leave
- Validate balances
- Handle over-budget leave
- Produce leave history

Leave should be transaction-based.

---

# 110. Notification Engine

Responsibilities:

- Schedule reminders
- Notify upcoming blocks
- Warn about deficits
- Remind about weekly review
- Avoid excessive notifications

Notifications should be based on current state.

Example:

Do not send:

> "Study System Design now!"

if the user has already completed the weekly target.

---

# 111. API Concepts

Potential endpoints:

```text
GET    /today
GET    /week
GET    /progress
GET    /leave

POST   /sessions
PATCH  /sessions/:id

POST   /schedule
PATCH  /schedule/:id
DELETE /schedule/:id

POST   /leave
POST   /days/:date/reduced
POST   /days/:date/leave

POST   /events
PATCH  /events/:id

GET    /projects
POST   /projects
PATCH  /projects/:id

POST   /weekly-review
GET    /weekly-review/:week
```

Exact API style can be decided with the eventual tech stack.

---

# 112. Recommended MVP

The first version should not implement everything in this document.

MVP should focus on:

## Must have

- Categories
- Weekly targets
- Daily planner
- Fixed work schedule
- DSA morning block
- Evening study blocks
- Timer
- Manual session logging
- Weekly progress
- Leave system
- Normal/reduced/leave/missed day types
- Basic adaptive scheduling
- Weekly review
- Basic projects

## Nice to have later

- Calendar integration
- Notifications
- Course hierarchy
- Advanced analytics
- Trend detection
- Drag-and-drop scheduling
- Automatic energy estimation
- Mobile app
- External calendar sync
- Smart recommendations

---

# 113. MVP Daily Flow

A typical day should work like this:

```text
Morning
   │
   ▼
Open app
   │
   ▼
See today's plan
   │
   ▼
DSA 08:00–09:00
   │
   ▼
Work 10:00–18:00
   │
   ▼
Transition 18:00–19:00
   │
   ▼
Evening study
   │
   ▼
Start timer
   │
   ▼
Stop timer
   │
   ▼
Progress automatically updated
   │
   ▼
Planner recalculates remaining week
```

---

# 114. MVP Weekly Flow

```text
Sunday
   │
   ▼
Weekly Review
   │
   ├── University: X / 8h
   ├── System Design: X / 8h
   └── DSA: X / 4 sessions
   │
   ▼
Analyze deficits
   │
   ▼
Review leave
   │
   ▼
Add known events
   │
   ▼
Generate next week
   │
   ▼
User adjusts plan
   │
   ▼
Week begins
```

---

# 115. Example Week

```text
MONDAY
08:00 DSA
10:00–18:00 Work
19:00–21:00 University
21:30–23:30 System Design

TUESDAY
08:00 DSA
10:00–18:00 Work
19:00–21:00 System Design
21:30–23:30 University

WEDNESDAY
08:00 DSA
10:00–18:00 Work
19:00–21:00 University
21:30–23:30 System Design

THURSDAY
08:00 DSA
10:00–18:00 Work
19:00–21:00 System Design
21:30–23:30 University

FRIDAY
No mandatory DSA if weekly session target is already met
10:00–18:00 Work
19:00–21:00 Core target catch-up
21:30–23:30 Development / Core / free

SATURDAY
Projects

SUNDAY
Projects + catch-up + weekly review
```

This is only an example.

The planner should generate the actual subject allocation dynamically.

---

# 116. What the Application Should Never Do

The application should never:

1. Treat planned leave as failure.
2. Force exact subjects into every block.
3. Create punishment backlogs automatically.
4. Require DSA every day.
5. Force Development every week.
6. Force Random Learning.
7. Fill every available minute.
8. Treat a missed day as a moral failure.
9. Reset a traditional streak to zero.
10. Override user decisions silently.
11. Treat 25h/week as mandatory just because the user is capable of it.
12. Turn weekends into another 10–6 work schedule.
13. Require the user to compensate immediately for every missed session.

---

# 117. Core Invariants

These should be treated as product invariants.

### Invariant 1

University and System Design remain equal priority.

### Invariant 2

DSA has a weekly target, not a mandatory daily requirement.

### Invariant 3

Work remains a fixed 10–6 block.

### Invariant 4

The 8–9 AM DSA block is the preferred anchor but can shift when the user wakes late.

### Invariant 5

The 6–7 PM period is a transition buffer.

### Invariant 6

Evening study starts around 7 PM by default.

### Invariant 7

Weekly targets matter more than exact daily adherence.

### Invariant 8

Leave is deliberate and does not count as failure.

### Invariant 9

Reduced days consume leave units.

### Invariant 10

Leave can carry for one additional month only.

### Invariant 11

Development and Random Learning remain flexible.

### Invariant 12

The planner must adapt instead of punishing deviations.

---

# 118. Future Intelligence

Once the deterministic planner works reliably, more intelligent features can be added.

Potential future features:

- Detecting recurring missed days
- Predicting whether weekly targets are achievable
- Suggesting schedule changes
- Detecting overcommitment
- Learning preferred study times
- Detecting which subjects benefit from morning/evening sessions
- Automatic weekly retrospectives
- Natural-language planning
- "I have college Wednesday afternoon" → automatically update schedule

However:

> **Do not make the core planner dependent on AI.**

The fundamental scheduling rules should remain deterministic, transparent, and debuggable.

---

# 119. Long-Term Vision

The application should eventually become a personal learning operating system.

Not merely:

> "A timetable."

But a system that understands:

```text
Goals
  ↓
Weekly commitments
  ↓
Available time
  ↓
Daily schedule
  ↓
Actual behaviour
  ↓
Progress
  ↓
Reflection
  ↓
Schedule adjustment
  ↓
Long-term trajectory
```

The ultimate feedback loop is:

> **Plan → Do → Measure → Review → Adapt → Repeat**

---

# 120. Final Product Definition

The application is a **flexible learning planner and consistency tracker** built around a small number of hard rules:

```text
10–6          Work
8–9           DSA anchor
7–11:30       Evening core-study capacity
8h/week       University
8h/week       System Design
4 sessions    DSA
7 units       Monthly leave
1 month       Leave carry-forward
Weekend       Projects
```

Everything else is deliberately flexible.

The application should make it easy to answer:

> **What should I do right now?**

> **What have I accomplished this week?**

> **What am I falling behind on?**

> **Do I need a reduced day or leave?**

> **What should next week look like?**

without turning the user's life into a rigid productivity spreadsheet.

---

# 121. Design Principle to Keep

The most important rule for the project:

> **The timetable exists to serve the user's goals and life. The user does not exist to serve the timetable.**

The software should provide structure, visibility, and gentle pressure while preserving autonomy and flexibility.
