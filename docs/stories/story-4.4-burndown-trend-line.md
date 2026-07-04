# Story 4.4: Burndown Trend Line

## Status
Complete (June 11, 2026)

## Story
**As a** scrum master,  
**I want** to see an ideal trend line on the burndown,  
**so that** I can compare actual vs expected progress.

## Acceptance Criteria
1. Chart shows ideal burndown line (start total to zero)
2. Ideal line is dashed/styled differently from actual
3. Chart shows actual progress line from historical data
4. Legend indicates ideal vs actual lines
5. Intersection/divergence is visually clear

## Tasks / Subtasks
- [x] Task 1: Calculate Ideal Burndown Data
  - [x] `getSprintTotalEstimate(cards)` as ideal line starting value
  - [x] Linear decrement to zero by sprint end date

- [x] Task 2: Chart.js Dataset Integration
  - [x] "Actual" and "Ideal" datasets with dashed ideal line

- [x] Task 3: Chart Legend
  - [x] Legend shown in team view when both datasets present

- [x] Task 4: Visual Clarity
  - [x] Thicker actual line, tooltip labels with hour suffix

## Dev Notes
- Ideal line uses sum of card `initialEstimate` values (MVP proxy for sprint-start total).
- Actual line prefers `board.history` snapshots with per-card log fallback.