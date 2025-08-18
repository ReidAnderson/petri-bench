# Petri Bench

Collection of tools for quickly generating, analyzing, and exporting petri nets for process analysis.

## 📋 Features

### Petri Net Simulator
- Load and visualize Petri net models (PNML format)
- Interactive simulation with step-by-step execution
- Real-time token visualization
- Simulation analysis and metrics
- Export simulation results as XES event logs

### Conformance Checker
- Upload Petri net models and event logs
- Automated conformance analysis
- Fitness score calculation
- Deviation detection and highlighting
- Event log statistics and insights

## 📥 Event Log Formats (XES and CSV)

The Event Log uploader accepts both XES (.xes) and CSV (.csv) files.

### Supported CSV schema

- Encoding: UTF-8
- Delimiter: comma
- Header row: required
- Required columns (case-sensitive):
  - case_id: Identifier of the trace/case
  - activity: Activity name (maps to concept:name)
  - timestamp: Event timestamp in ISO 8601 (e.g., 2024-01-01T10:00:00Z)
- Optional columns:
  - lifecycle: Lifecycle transition (e.g., start, complete)
  - resource: Performer/owner
  - Any additional columns are accepted but may be ignored in analysis
- Row ordering: Events within the same case should be ordered by timestamp (ascending)

Example CSV:

case_id,activity,timestamp,lifecycle,resource
trace_1,TaskA,2024-01-01T10:00:00Z,start,alice
trace_1,TaskA,2024-01-01T10:05:00Z,complete,alice
trace_1,TaskB,2024-01-01T11:00:00Z,complete,bob
trace_2,TaskA,2024-01-02T09:30:00Z,complete,carol

Notes:
- Timestamps should include timezone (Z or offset). If missing, UTC is assumed.
- The UI currently stores the uploaded event log content (XES/CSV) for analysis; more advanced parsing may be added.

## 🛠️ Development Setup

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd petri-bench
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:3000`

## 📦 Building for Production

1. Build the application:
   ```bash
   npm run build
   ```

2. The built files will be in the `dist/` directory

3. Preview the production build:
   ```bash
   npm run preview
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm run test && npm run test:e2e`
5. Check code quality: `npm run lint && npm run type-check`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
