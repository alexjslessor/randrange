import React,
{
  Component,
} from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Error caught by boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      console.error("Error caught by boundary:", this.state.error);
      return (
        <h1>Something went wrong. Please try again later.</h1>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
