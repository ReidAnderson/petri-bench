# Petri Bench

Collection of tools for quickly generating, analyzing, and exporting petri nets for process analysis.

## 🚀 Modern Stack

- **React 18** with TypeScript for type-safe UI development
- **Vite** for lightning-fast development and builds
- **Tailwind CSS** for utility-first styling
- **React Router** for client-side routing
- **Chart.js** for data visualizations
- **Vitest** for unit testing
- **Playwright** for end-to-end testing
- **ESLint & Prettier** for code quality and formatting

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

## 📜 Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Code Quality
- `npm run lint` - Run ESLint to check for code issues
- `npm run lint:fix` - Automatically fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm run test` - Run unit tests in watch mode
- `npm run test:run` - Run unit tests once
- `npm run test:ui` - Open Vitest UI for interactive testing
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run test:e2e:headed` - Run E2E tests in headed mode
- `npm run test:e2e:debug` - Debug E2E tests

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── Header.tsx
│   ├── PetriNetVisualization.tsx
│   ├── SimulationControls.tsx
│   ├── SimulationResults.tsx
│   ├── ConformanceControls.tsx
│   ├── ConformanceResults.tsx
│   └── __tests__/       # Component tests
├── pages/               # Page components
│   ├── SimulatorPage.tsx
│   └── ConformancePage.tsx
├── types/               # TypeScript type definitions
│   └── index.ts
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
├── index.css            # Global styles with Tailwind
└── setupTests.ts        # Test configuration

tests/                   # End-to-end tests
├── basic.spec.ts
└── ...

public/                  # Static assets
```

## 🧪 Testing Strategy

### Unit Tests
- Components are tested using Vitest and React Testing Library
- Focus on component behavior and user interactions
- Run tests with `npm run test`

### End-to-End Tests
- Full application workflows tested with Playwright
- Cross-browser testing (Chromium, Firefox, WebKit)
- Run tests with `npm run test:e2e`

## 🎨 Styling

The project uses Tailwind CSS for styling with:
- Custom color palette optimized for data visualization
- Responsive design patterns
- Component-specific utility classes
- Dark mode support (can be extended)

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

## 🔧 Configuration

### Vite Configuration
- Path aliases for clean imports (`@/components`, `@/types`, etc.)
- Development server on port 3000
- Source maps enabled for debugging

### TypeScript Configuration
- Strict type checking enabled
- Path mapping for module resolution
- Latest ES2020 target for modern features

### ESLint & Prettier
- TypeScript-aware linting rules
- React hooks validation
- Consistent code formatting
- Import sorting and organization

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

## 🚀 Future Enhancements

- [ ] Real-time collaborative editing
- [ ] Advanced Petri net editing capabilities
- [ ] More export formats (BPMN, DOT, etc.)
- [ ] Performance analysis tools
- [ ] Plugin system for custom analyses
- [ ] Dark mode theme
- [ ] Internationalization support
