# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured for Vertex. Session Replay, Error Tracking, and Support are enabled, and inbox signal sources are active for health checks, errors, replay analysis, and future support tickets.

Fresh scouts and Replay Vision monitors will begin operating as data becomes available. Findings should start appearing in the [Self-driving inbox](https://eu.posthog.com/project/262473/inbox) within about 30 minutes.

## AI data processing

Approved. The organization-level AI processing gate was approved before this setup ran.

## GitHub

| Status | Detail |
|---|---|
| Connected during this setup | The PostHog GitHub App is connected and available to Self-driving. |

## Products enabled

| Product | Status | Repository check |
|---|---|---|
| Session Replay | Already enabled | The web SDK initialization has no session-recording disable override. |
| Error Tracking | Already enabled | The web SDK initialization explicitly enables exception capture. |
| Support (Conversations) | Enabled | Support needs an inbound email, inbox, or Slack channel before tickets arrive. |

## Signal sources

| Source product | Source type | Action |
|---|---|---|
| `signals_scout` | `cross_source_issue` | Left at the platform default: enabled without a source-config row. |
| `health_checks` | `health_issue` | Enabled; config `01a05947-13e9-7533-bd94-6b972144990e`. |
| `error_tracking` | `issue_created` | Enabled; config `01a05947-154b-7a16-9e4b-2a941195730b`. |
| `error_tracking` | `issue_reopened` | Enabled; config `01a05947-1402-797d-9431-6d8f135c5ee0`. |
| `error_tracking` | `issue_spiking` | Enabled; config `01a05947-13df-7922-bac9-dbc0de5a6bd5`. |
| `session_replay` | `session_analysis_cluster` | Enabled with the server-provided sample rate; config `01a05947-140c-78d5-ae47-63bda3141fa3`. |
| `conversations` | `ticket` | Enabled; config `01a05947-15e5-7589-907d-f5cf1123a691`. It remains idle until an inbound support channel is connected. |
| `llm_analytics` | `evaluation_report` | Deliberately skipped: not a user-facing responder for this setup. |
| `logs` | — | Deliberately skipped: not a v1 responder. |
| `replay_vision` | — | Deliberately skipped: Replay Vision scanners self-authorize through `emits_signals`. |

## Connected tools

No external connected tools were selected. GitHub Issues, Linear, Jira, Sentry, and Zendesk are therefore recorded as **not used**; no connected-tool responders were enabled.

## Scout troop

**Run budget:** 100 runs per day; 0 used today; 100 remaining. Announcement: “Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.”

### Active scouts (5)

| Scout | Why enabled |
|---|---|
| `signals-scout-general` | Cross-product coverage and issues outside specialist scopes. |
| `signals-scout-product-analytics` | Vertex captures course discovery and learning engagement events. |
| `signals-scout-web-analytics` | Vertex is a browser-delivered learning platform with course traffic and navigation. |
| `signals-scout-health-checks` | PostHog SDK and proxy configuration are present and actionable. |
| `signals-scout-course-discovery-handoff` | Approved custom coverage for the course-to-learning handoff. |

### Disabled scouts (23)

| Scout | Reason |
|---|---|
| `signals-scout-ai-observability` | No confirmed LLM telemetry in the current repository. |
| `signals-scout-anomaly-detection` | Kept off for a selective troop; no saved-insight coverage was confirmed. |
| `signals-scout-apm` | No distributed-tracing evidence. |
| `signals-scout-conversations` | Support has no inbound channel or ticket history yet. |
| `signals-scout-csp-violations` | No CSP reporting evidence. |
| `signals-scout-customer-analytics` | No account/group analytics evidence. |
| `signals-scout-data-pipelines` | No CDP, batch-export, or Hog-flow evidence. |
| `signals-scout-data-warehouse` | No connected warehouse source was selected. |
| `signals-scout-error-tracking` | Covered by the enabled native Error Tracking sources. |
| `signals-scout-experiments` | No active experiment evidence. |
| `signals-scout-feature-flags` | No active flag use was found in the repository. |
| `signals-scout-inbox-validation` | Fresh setup with no shipped inbox fixes to validate. |
| `signals-scout-insight-alerts` | No configured insight-alert coverage was confirmed. |
| `signals-scout-logs` | No Logs usage evidence. |
| `signals-scout-mcp-tool-calls` | No MCP tool-call telemetry evidence. |
| `signals-scout-observability-gaps` | Selectivity favored direct product-analytics and health coverage. |
| `signals-scout-replay-vision` | No Replay Vision observations existed before this setup; native scanners now collect them. |
| `signals-scout-revenue-analytics` | No payment or revenue integration evidence. |
| `signals-scout-session-replay` | Covered by the enabled native Session Replay source. |
| `signals-scout-skills-store` | No skills-store maintenance need was identified. |
| `signals-scout-surveys` | Surveys are off and none exist. |
| `signals-scout-tasks` | No PostHog Tasks activity evidence. |
| `signals-scout-web-vitals` | Core Web Vitals capture was not confirmed. |

## Custom scouts

| Scout | Coverage and discriminator | Why it is distinct |
|---|---|---|
| `signals-scout-course-discovery-handoff` | Watches search, course views, lesson selection, and continuing learning. It reports only when the unique-user handoff rate drops while course-view volume remains stable. | The built-in product analytics scout monitors saved flows; this scout explicitly owns Vertex’s course discovery-to-learning path. |

The setup considered content navigation and search separately, but they did not have an independently instrumented success/failure pair beyond the approved end-to-end handoff scout. If this custom scout becomes noisy, set its `emit` configuration to `false` in PostHog to keep it in dry-run mode.

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes eligible findings to the inbox. These are the only parts of this setup that spend Replay Vision quota. Findings enter at half weight and require corroboration before becoming a report.

| Brief | Status | Scanner | Scope | Sampling | Estimate |
|---|---|---|---|---:|---|
| Breakage monitor | Created | **Course learning breakage** | URLs containing `/courses/`, covering the course-detail completion path where learners open modules and choose or resume lessons. | 0.5 | 0 observations/month; 0 credits/month. |
| Frustration monitor | Created | **Learner navigation frustration** | Sessions with `$rageclick` only; no URL filter was added. | 1.0 | 0 observations/month; 0 credits/month. |

No recordings existed at setup time. Both scanners are armed and start working automatically when recordings begin. The Replay Vision organization budget is 2,500 credits for the current period, with 2,500 remaining; the two scanner estimates were 0 credits because no recordings were available yet.

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) so the enabled Conversations ticket source can receive tickets.
- [ ] Authorize the PostHog MCP connection with `property_definition:read` when available. This setup could not server-validate the repository’s custom course events, although the custom scout will validate its event schema before querying.

## What happens next

The scout coordinator picks up fresh configurations within about 30 minutes. Scout runs draw from the project’s daily budget, findings cluster into inbox reports, and immediately actionable reports can start coding tasks.

## Repository changes

No application code was modified. This setup created `posthog-self-driving-report.md` only; all other changes were made in PostHog configuration.
