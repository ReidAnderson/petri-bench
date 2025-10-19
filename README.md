# Petri Bench
Petri Bench
===========

A simple two-pane UI: JSON input for a Petri net on the left, Graphviz-rendered diagram on the right. Built with Vite + React + TypeScript and d3-graphviz.

Quickstart
----------

1. Install dependencies
2. Start the dev server

Data format
-----------

The left pane expects JSON with the shape:

- places: [{ id, label?, tokens? }]
- transitions: [{ id, label? }]
- arcs: [{ from, to, weight? }]

Notes:

- ids must be unique within places and transitions.
- arcs connect place->transition or transition->place (no enforcement yet, but recommended).
- tokens, when provided and > 0, will be appended to the place label.
