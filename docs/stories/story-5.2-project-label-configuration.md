# Story 5.2: Project Label Configuration

## Status
Complete (June 11, 2026)

## Story
**As a** project owner,  
**I want** to define label colors and meanings,  
**so that** team uses consistent categorization.

## Acceptance Criteria
1. Project settings include label configuration
2. Each label has color and meaning/name text
3. Default labels provided (e.g., Priority, Bug, Feature)
4. Labels can be added, edited, deleted
5. Card label picker shows configured labels
6. Label meaning displays on hover

## Tasks / Subtasks
- [x] Task 1: Label Data Structure
  - [x] `Label` schema `{id, color, name}` on Project
  - [x] `DEFAULT_PROJECT_LABELS` seeded on project create

- [x] Task 2: Label Management UI
  - [x] Labels tab in Project Management screen
  - [x] Add/delete labels (owner/admin)

- [x] Task 3: Integration with Card Modal
  - [x] Dynamic `renderLabelPicker` from project labels

- [x] Task 4: Integration with Board View
  - [x] Card label bars use project colors; `title` shows label name

## Dev Notes
- Existing cards keep label ids; defaults match prior hardcoded ids for compatibility.