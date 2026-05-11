import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full bg-cyber-black flex items-center justify-center p-8">
          <div className="glass border border-red-500/30 rounded-xl p-8 max-w-lg text-center">
            <div className="w-12 h-12 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <h2 className="text-red-400 font-mono text-lg font-bold mb-2">SYSTEM ERROR</h2>
            <p className="text-slate-400 font-mono text-sm mb-4">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-cyber-cyan text-cyber-cyan font-mono text-sm rounded hover:bg-cyan-950/30 transition-colors"
            >
              REINITIALIZE
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
