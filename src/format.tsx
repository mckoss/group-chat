import * as React from 'react';

// Format a timestamp as an age (how long ago).
export function age(timestamp: number, now?: number): string {
  if (!now) {
    now = Date.now();
  }

  let ms = now - timestamp;

  if (ms < 1000) {
    return "now";
  }

  let days = Math.floor(ms / 1000 / 60 / 60 / 24);
  let months = Math.floor(days * 12 / 365);
  let years = Math.floor(days / 365);

  let hrs = Math.floor(ms / 1000 / 60 / 60);
  let minutes = Math.floor(ms / 1000 / 60);
  let seconds = Math.floor(ms / 1000);

  if (years >= 1) {
    return years + pluralize(" year", years) + " ago";
  }

  if (months >= 3) {
    return months + " months ago";
  }

  if (days === 1) {
    return "yesterday";
  }

  if (days > 1) {
    return days + " days ago";
  }

  if (hrs >= 1) {
    return hrs + pluralize(" hour", hrs) + " ago";
  }

  if (seconds < 120) {
    return seconds + pluralize(" second", seconds) + " ago";
  }

  return minutes + pluralize(" minute", minutes) + " ago";
}

function pluralize(s: string, n: number, suffix = 's'): string {
  return n !== 1 ? s + suffix : s;
}

export class Age extends React.Component<{timestamp: number}, {text: string}> {
  private timer: number;

  constructor(props: {timestamp: number}) {
    super(props);
    this.state = {
      text: age(props.timestamp)
    };
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState({text: age(this.props.timestamp)});
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    delete this.timer;
  }

  render() {
    return <span className="age">{this.state.text}</span>;
  }
}
